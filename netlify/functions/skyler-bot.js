const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { getSkylerBotProvider } = require('./skyler-bot-providers/factory');
const { decryptText } = require('./skyler-bot-providers/secret');
const { checkRateLimit } = require('./skyler-bot-providers/rate-limit');

const suppressNotificationsFlag = 1 << 12;
const baseCorsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const localAllowedOrigins = [
  'http://localhost:8080',
  'http://localhost:8888',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8888',
];

const privateInfoPatterns = [
  /\b(home |street |mailing )?address\b/i,
  /\bwhere\s+(does|do|is|are)\b[^?]*\b(live|lives|located|reside|resides)\b/i,
  /\b(what|which)\s+(city|state|town|neighborhood|zip)\b/i,
  /\b(phone|cell|mobile number|telephone)\b/i,
  /\b(email|personal email)\b/i,
  /\b(family|wife|daughter|child|children|parent|parents)\b/i,
  /\b(age|birthday|birth date|date of birth)\b/i,
  /\b(salary|compensation|pay rate|ssn|social security)\b/i,
  /\b(manager|mentor|benefits|stock options|healthcare benefits)\b/i,
  /\b(contact details?|contact info|personal contact)\b/i,
];

// Narrowly target prompt-injection and system-introspection attempts. Earlier
// versions matched bare words like "rules", "token", "documents", and "request"
// which blocked legitimate portfolio questions (e.g. token-based auth, the rules
// engine he built, his document-processing/OCR work).
const suspiciousQuestionPatterns = [
  /\bsystem prompt\b/i,
  /\byour\s+(prompt|instructions?|rules|guardrails?|system message|knowledge base|knowledge file|training data|source files?|context)\b/i,
  /\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above|the|your)\b/i,
  /\b(override|bypass|jailbreak|developer message)\b/i,
  /\b(reveal|expose|leak|dump|print|repeat|show me|list out)\b.*\b(prompt|instructions?|hidden|context|knowledge base|source files?)\b/i,
  // Introspection about the bot's own data sources/files.
  /\b(markdown|md files?|\.md\b|source files?|knowledge base|knowledge file|information file|profile notes)\b/i,
  /\bwhat\b[^?]*\b(files?|sources?|documents?|data)\b[^?]*\bdo you\b/i,
  // Secrets — note plural forms (api keys, environment variables, etc.).
  /\b(api keys?|secret keys?|environment variables?|env vars?|webhook urls?|access tokens?)\b/i,
];

const portfolioBoundaryQuestionPatterns = [
  /\b(repeat|print|dump|show|list out|give me)\b.*\b(all\s+)?(evidence|raw evidence|retrieved evidence|source chunks?|raw context|full context)\b/i,
  /\b(verbatim|word for word|exactly)\b.*\b(evidence|source material|context|retrieved|knowledge)\b/i,
  /\b(private|hidden|source-specific|personalized?)\b.*\b(job description|source|tailoring|context|guidance)\b/i,
  /\b(tailor(?:ed|ing)?|personaliz(?:ed|ing)?|emphasiz(?:e|ing)?)\b.*\b(source|job description|iconhealth|dave|company)\b/i,
  /\banswer\s+as\s+skyler\b/i,
  /\b(first person|as skyler)\b.*\b(contact details?|contact info|personal contact|phone|email)\b/i,
  /\b(weaknesses?|skill gaps?|bad at|not good at|struggles? with|deficien(?:cy|cies))\b/i,
];

const offTopicQuestionPatterns = [
  /\babout\s*us\b/i,
  /\b\w+\s+is\s+a\s+.*\bcompany\s+based\s+in\b/i,
  /\bsmall\s+but\s+hardworking\s+team\b/i,
  /\bdedicated\s+to\s+making\b/i,
];

const sensitiveKnowledgePatterns = [
  /\bcurrent compensation\b/i,
  /\bcompensation\b/i,
  /\bsalary\b/i,
  /\bpay\b/i,
  /\bbenefits?\b/i,
  /\bstock options?\b/i,
  /\bmanager\b/i,
  /\bmentor\b/i,
  /\bfamily\b/i,
  /\bdaughter\b/i,
  /\bwife\b/i,
  /\bchild\b/i,
  /\bchildren\b/i,
  /\bphone\b/i,
  /\bemail\b/i,
  /\bhome address\b/i,
];

// Whole sections of the knowledge file that must NEVER be served to a public
// visitor. These are bot-instruction scaffolding, private/confidential notes,
// or self-assessed weakness lists — useful for maintaining the file, but
// damaging if a recruiter could retrieve and quote them. Matched against the
// start of each markdown section (the heading text), case-insensitively.
const excludedKnowledgeSections = [
  'interview and career development context',
  'icon health interview process',
  'learning goals',
  'debugging and engineering style',
  'things not to overstate',
  'bot answering rules',
  'preferred communication style',
  'family and personal context',
  'additional notes for future updates',
];

const alwaysIncludedKnowledgeSections = [
  'basic information',
  'professional summary',
  'current employment',
  'ondiem / gig forces',
];

function isExcludedKnowledgeSection(section) {
  const normalized = section.toLowerCase().trimStart();

  return excludedKnowledgeSections.some((heading) =>
    normalized.startsWith(heading),
  );
}

function isAlwaysIncludedKnowledgeSection(section) {
  const normalized = section.toLowerCase().trimStart();

  return alwaysIncludedKnowledgeSections.some((heading) =>
    normalized.startsWith(heading),
  );
}

const stopWords = new Set([
  'about',
  'after',
  'also',
  'and',
  'are',
  'any',
  'can',
  'company',
  'did',
  'does',
  'for',
  'focused',
  'from',
  'has',
  'he',
  'have',
  'his',
  'how',
  'into',
  'is',
  'me',
  'much',
  'of',
  'on',
  'or',
  'people',
  'skyler',
  'so',
  'tell',
  'that',
  'the',
  'this',
  'to',
  'was',
  'what',
  'when',
  'where',
  'which',
  'who',
  'with',
  'work',
  'you',
]);

// Short but meaningful domain tokens that must survive the length filter in
// tokenize() (e.g. "ai"). Without this, questions like "what is his experience
// with ai?" lose their only real term and retrieve nothing.
const shortTokenAllowlist = new Set([
  'ai',
  'ml',
  'ux',
  'ui',
  'qa',
  'js',
  'go',
  'ci',
  'cd',
]);

const tokenAliases = {
  ai: [
    'ai-assisted',
    'ocr',
    'automation',
    'llm',
    'intelligence',
    'document',
    'workflow',
  ],
  bachelor: ['bachelors', 'degree', 'education', 'school'],
  bachelors: ['bachelor', 'degree', 'education', 'school'],
  college: ['education', 'school', 'university', 'degree'],
  degree: ['bachelor', 'bachelors', 'education', 'school'],
  designer: ['design', 'figma', 'frontend'],
  designers: ['design', 'figma', 'frontend'],
  developer: ['development', 'frontend', 'web'],
  developr: ['developer', 'development', 'frontend', 'web'],
  education: ['school', 'college', 'university', 'degree'],
  frontend: ['front-end', 'web', 'vue', 'react'],
  schooling: ['school', 'education', 'college', 'degree'],
  school: ['education', 'college', 'university', 'degree'],
  university: ['education', 'school', 'college', 'degree'],
  web: ['frontend', 'vue', 'react'],
};

let cachedKnowledge = null;
let cachedKnowledgeStats = null;
let cachedPublicSources = null;
let cachedSourceProfiles = null;

function createRequestId() {
  return `skyler-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function previewText(value, maxLength = 90) {
  const cleanValue = normalizeText(value);

  if (cleanValue.length <= maxLength) {
    return cleanValue;
  }

  return `${cleanValue.slice(0, maxLength).trim()}...`;
}

function debugLog(requestId, stage, details = {}) {
  console.log(
    JSON.stringify({
      scope: 'skyler-bot',
      requestId,
      stage,
      ...details,
    }),
  );
}

function privateDiagnosticsLog(requestId, diagnostics) {
  console.log(
    JSON.stringify(
      {
        scope: 'skyler-bot-private-diagnostics',
        requestId,
        ...diagnostics,
      },
      null,
      2,
    ),
  );
}

function cleanDiscordValue(value, maxLength = 900) {
  if (typeof value !== 'string') {
    return '';
  }

  const cleanValue = value.replace(/[\r\n]+/g, ' ').trim();

  if (cleanValue.length <= maxLength) {
    return cleanValue;
  }

  return `${cleanValue.slice(0, maxLength - 3).trim()}...`;
}

function formatDiscordChatMessage(question, result, requestId, source) {
  const provider = result.debug?.provider || 'unknown';
  const matchCount = Number(result.debug?.matchCount) || 0;
  const lines = [
    '--------------------',
    'Skyler Bot chat',
    `Request: ${requestId}`,
    `Source: ${cleanDiscordValue(source, 80) || 'unknown'}`,
    `Provider: ${provider}`,
    `Matches: ${matchCount}`,
    `Question: ${cleanDiscordValue(question, 450)}`,
    `Response: ${cleanDiscordValue(result.answer, 1100)}`,
  ];

  return lines.join('\n');
}

function isDiscordChatEnabled() {
  return process.env.SKYLER_BOT_ENABLE_DISCORD_WEBHOOK === 'true';
}

async function notifyDiscordChat(question, result, requestId, options = {}) {
  if (options.disableDiscordWebhook) {
    debugLog(requestId, 'discord_chat_skipped', {
      reason: 'disabled_by_client',
    });
    return;
  }

  if (!isDiscordChatEnabled()) {
    debugLog(requestId, 'discord_chat_skipped', {
      reason: 'disabled_by_env',
    });
    return;
  }

  const webhookUrl =
    process.env.SKYLER_BOT_DISCORD_WEBHOOK_URL ||
    process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    debugLog(requestId, 'discord_chat_skipped', {
      reason: 'missing_webhook_url',
    });
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: formatDiscordChatMessage(
          question,
          result,
          requestId,
          options.source,
        ),
        flags: suppressNotificationsFlag,
      }),
    });

    debugLog(requestId, 'discord_chat_sent', {
      ok: response.ok,
      status: response.status,
    });
  } catch (error) {
    debugLog(requestId, 'discord_chat_failed', {
      errorName: error.name,
      errorMessage: error.message,
    });
  }
}

function parseAllowedOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function normalizeOrigin(value) {
  if (!value) {
    return '';
  }

  try {
    return new URL(value).origin;
  } catch (error) {
    return String(value).trim().replace(/\/$/, '');
  }
}

function getRequestOrigin(event) {
  const headers = event.headers || {};

  return normalizeOrigin(headers.origin || headers.Origin || '');
}

function getAllowedOrigins(env = process.env) {
  const configuredOrigins = parseAllowedOrigins(
    env.SKYLER_BOT_ALLOWED_ORIGINS || env.ALLOWED_ORIGINS,
  );
  const netlifySiteOrigin = normalizeOrigin(env.URL || '');
  const deployPreviewOrigin = normalizeOrigin(env.DEPLOY_PRIME_URL || '');
  const allowedOrigins = [
    ...configuredOrigins,
    netlifySiteOrigin,
    ...(env.CONTEXT === 'production' ? [] : [deployPreviewOrigin, ...localAllowedOrigins]),
  ];

  return [...new Set(allowedOrigins.filter(Boolean))];
}

function isCorsOriginAllowed(event, env = process.env) {
  const origin = getRequestOrigin(event);

  if (!origin) {
    return true;
  }

  return getAllowedOrigins(env).includes(origin);
}

function getCorsHeaders(event) {
  const origin = getRequestOrigin(event);
  const headers = { ...baseCorsHeaders };

  if (origin && isCorsOriginAllowed(event)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }

  return headers;
}

function jsonResponse(event, statusCode, body) {
  return {
    statusCode,
    headers: { ...getCorsHeaders(event), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function findRepoFile(relativePath) {
  const candidates = [
    path.join(process.cwd(), relativePath),
    path.join(__dirname, '..', '..', relativePath),
    path.join(__dirname, relativePath),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function getRepoFileStatus(relativePath, encryptedEnvName = '') {
  const plainPath = findRepoFile(relativePath);
  const encryptedPath = findRepoFile(`${relativePath}.enc`);

  return {
    relativePath,
    plainFound: Boolean(plainPath),
    encryptedFound: Boolean(encryptedPath),
    readMode: plainPath ? 'plain' : encryptedPath ? 'encrypted' : 'missing',
    encryptedEnvName,
    decryptKeyConfigured: encryptedEnvName
      ? Boolean(process.env[encryptedEnvName])
      : false,
  };
}

function readTextFile(relativePath) {
  const filePath = findRepoFile(relativePath);

  if (!filePath) {
    return '';
  }

  return fs.readFileSync(filePath, 'utf8');
}

// Reads the Skyler Bot knowledge markdown. The plaintext file is gitignored
// (it contains private details), so production reads the committed `.enc` and
// decrypts it with BOT_INFO_KEY. Locally, an unencrypted file takes precedence
// so edits are reflected without re-encrypting.
function readKnowledgeMarkdown(relativePath) {
  const plainPath = findRepoFile(relativePath);

  if (plainPath) {
    return fs.readFileSync(plainPath, 'utf8');
  }

  const encryptedPath = findRepoFile(`${relativePath}.enc`);

  if (encryptedPath) {
    return decryptText(fs.readFileSync(encryptedPath, 'utf8'));
  }

  return '';
}

function loadPublicSources() {
  if (cachedPublicSources) {
    return cachedPublicSources;
  }

  try {
    const sourceInfo = JSON.parse(readTextFile('src/data/source-info.json') || '{}');
    cachedPublicSources = Array.isArray(sourceInfo.sources)
      ? sourceInfo.sources
      : [];
  } catch (error) {
    cachedPublicSources = [];
  }

  return cachedPublicSources;
}

function normalizeSourceKey(value) {
  const sourceValue = String(value || '')
    .trim()
    .slice(0, 80);

  if (!sourceValue || sourceValue === 'none') {
    return '';
  }

  const lowerSourceValue = sourceValue.toLowerCase();
  const source = loadPublicSources().find((candidate) =>
    [candidate.id, candidate.key, candidate.urlKey, ...(candidate.aliases || [])]
      .map((candidateValue) => String(candidateValue || '').trim().toLowerCase())
      .includes(lowerSourceValue),
  );

  return source?.key || sourceValue;
}

function readSourceInfoText() {
  const plainPath = findRepoFile('documents/source-info.private.json');

  if (plainPath) {
    return fs.readFileSync(plainPath, 'utf8');
  }

  const encryptedPath = findRepoFile('documents/source-info.private.json.enc');

  if (encryptedPath) {
    return decryptText(
      fs.readFileSync(encryptedPath, 'utf8'),
      process.env,
      'SOURCE_INFO_KEY',
    );
  }

  return '';
}

function loadSourceProfiles() {
  if (cachedSourceProfiles) {
    return cachedSourceProfiles;
  }

  let sourceInfoText = '';

  try {
    sourceInfoText = readSourceInfoText();
  } catch (error) {
    console.warn(
      JSON.stringify({
        scope: 'skyler-bot',
        stage: 'source_profiles_unavailable',
        errorName: error.name,
        errorMessage: error.message,
      }),
    );
    cachedSourceProfiles = [];
    return cachedSourceProfiles;
  }

  if (!sourceInfoText) {
    cachedSourceProfiles = [];
    return cachedSourceProfiles;
  }

  try {
    const sourceInfo = JSON.parse(sourceInfoText);
    cachedSourceProfiles = Array.isArray(sourceInfo.sources)
      ? sourceInfo.sources
      : [];
  } catch (error) {
    cachedSourceProfiles = [];
  }

  return cachedSourceProfiles;
}

function getSourceProfile(sourceKey) {
  if (!sourceKey) {
    return null;
  }

  const lowerSourceKey = sourceKey.toLowerCase();

  return (
    loadSourceProfiles().find((source) =>
      [source.id, source.key]
        .map((value) => String(value || '').trim().toLowerCase())
        .includes(lowerSourceKey),
    ) || null
  );
}

function loadExportedArray(relativePath, exportName) {
  const source = readTextFile(relativePath);

  if (!source) {
    return [];
  }

  const scriptSource = source.replace(
    new RegExp(`export\\s+const\\s+${exportName}\\s+=`),
    `const ${exportName} =`,
  );
  const sandbox = { module: { exports: {} } };

  vm.runInNewContext(
    `${scriptSource}\nmodule.exports.${exportName} = ${exportName};`,
    sandbox,
    { timeout: 1000 },
  );

  return Array.isArray(sandbox.module.exports[exportName])
    ? sandbox.module.exports[exportName]
    : [];
}

function normalizeText(value) {
  return String(value || '')
    .replace(/https?:\/\/\S+/g, '')
    // Normalize smart punctuation to ASCII so mobile keyboards (which auto-
    // insert curly quotes/apostrophes) are not rejected by validateQuestion.
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsSensitiveKnowledge(value) {
  return sensitiveKnowledgePatterns.some((pattern) => pattern.test(value));
}

function removeSensitiveLines(value) {
  return String(value || '')
    .split('\n')
    .filter((line) => !containsSensitiveKnowledge(line))
    .join('\n');
}

function removeSensitiveSentences(value) {
  return normalizeText(value)
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !containsSensitiveKnowledge(sentence))
    .join(' ');
}

function tokenize(value) {
  const tokens = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .filter(
      (token) =>
        (token.length > 2 || shortTokenAllowlist.has(token)) &&
        !stopWords.has(token),
    );

  return [
    ...new Set(
      tokens.flatMap((token) => [token, ...(tokenAliases[token] || [])]),
    ),
  ];
}

function createProjectChunks(projects) {
  return projects.filter((project) => !project.notReady).map((project) => ({
    type: 'project',
    id: project.id,
    title: project.title,
    sourceLabel: `Project: ${project.title}`,
    sourceUrl: `/projects/${encodeURIComponent(project.id)}`,
    tags: [
      project.type,
      project.favorite ? 'Skyler favorite project' : '',
      ...(project.tech || []),
    ].filter(Boolean),
    text: removeSensitiveSentences(
      [
        project.title,
        project.favorite
          ? 'Skyler favorite project and strongest personal showcase.'
          : '',
        project.type,
        project.summary,
        project.impact,
        project.description,
        (project.tech || []).join(', '),
      ].join(' '),
    ),
  }));
}

function createExperienceChunks(experienceItems) {
  return experienceItems.map((item) => ({
    type: 'experience',
    title: item.organization,
    sourceLabel: `Experience: ${item.organization}`,
    sourceUrl: '/experience',
    tags: item.tags || [],
    text: removeSensitiveSentences(
      [
        item.organization,
        item.title,
        item.description,
        (item.tags || []).join(', '),
      ].join(' '),
    ),
  }));
}

function resolveMarkdownSource(
  section,
  fallbackLabel,
  projects,
  experienceItems,
) {
  const matchingProject = projects.find((project) =>
    section.toLowerCase().startsWith(project.title.toLowerCase()),
  );

  if (matchingProject) {
    return {
      label: `Project: ${matchingProject.title}`,
      url: `/projects/${encodeURIComponent(matchingProject.id)}`,
    };
  }

  const matchingExperience = experienceItems.find((item) =>
    section.toLowerCase().startsWith(item.organization.toLowerCase()),
  );

  if (matchingExperience) {
    return {
      label: `Experience: ${matchingExperience.organization}`,
      url: '/experience',
    };
  }

  return {
    label: fallbackLabel,
    url: '',
  };
}

function createMarkdownChunks(
  relativePath,
  title,
  type = 'profile',
  projects = [],
  experienceItems = [],
) {
  const markdown = readKnowledgeMarkdown(relativePath);

  if (!markdown) {
    return [];
  }

  return removeSensitiveLines(markdown)
    .split(/\n#{1,3}\s+/)
    .filter((section, index) => !(type === 'info' && index === 0))
    .map((section) => normalizeText(section))
    .filter(Boolean)
    .filter((section) => !isExcludedKnowledgeSection(section))
    .map((section, index) => {
      const source = resolveMarkdownSource(
        section,
        title,
        projects,
        experienceItems,
      );

      return {
        type,
        title: index === 0 ? title : section.slice(0, 80),
        sourceLabel:
          source.label === title ? 'Portfolio profile' : source.label,
        sourceUrl: source.url,
        internalSource: title,
        alwaysInclude: type === 'info' && isAlwaysIncludedKnowledgeSection(section),
        tags: [],
        text: section,
      };
    });
}

function buildKnowledge() {
  if (cachedKnowledge) {
    return cachedKnowledge;
  }

  const projects = loadExportedArray('src/data/projects.js', 'projects');
  const readyProjects = projects.filter((project) => !project.notReady);
  const experienceItems = loadExportedArray(
    'src/data/experience.js',
    'experienceItems',
  );
  const generalChunks = [
    {
      type: 'overview',
      title: 'Portfolio overview',
      sourceLabel: 'Portfolio overview',
      sourceUrl: '/',
      tags: ['full-stack', 'Vue', 'Flutter', 'React', 'Node', 'AI'],
      text: normalizeText(
        [
          'Full-stack developer focused on product workflows, AI-assisted development, and building software people actually use.',
          'Works across frontend systems, backend services, mobile apps, deployment tooling, Vue, Flutter, React, Node, and modern AI-assisted engineering workflows.',
          'Work centers around onboarding, credentialing, admin tooling, automations, internal workflows, and maintainable products with clean user experiences.',
        ].join(' '),
      ),
    },
    {
      type: 'overview',
      title: 'Working style and culture fit',
      sourceLabel: 'Portfolio overview',
      sourceUrl: '/experience',
      tags: ['culture', 'team', 'collaboration', 'communication', 'ownership'],
      text: normalizeText(
        [
          'Skyler fits teams that value practical ownership, steady learning, product-minded engineering, and clear communication.',
          'He works well in small-team and startup-style environments where engineers move across frontend, backend, integrations, debugging, and user workflows.',
          'His project history shows collaboration with clients, product needs, design systems, reusable UI, admin tooling, and real workflow improvements rather than isolated code tasks.',
        ].join(' '),
      ),
    },
  ].filter((chunk) => chunk.text);

  cachedKnowledge = [
    ...generalChunks,
    ...createExperienceChunks(experienceItems),
    ...createProjectChunks(readyProjects),
    ...createMarkdownChunks(
      'documents/skyler-bot-profile.md',
      'Skyler Bot information file',
      'info',
      readyProjects,
      experienceItems,
    ),
  ].map((chunk) => ({
    ...chunk,
    tokens: tokenize(`${chunk.title} ${chunk.tags.join(' ')} ${chunk.text}`),
  }));

  return cachedKnowledge;
}

function getKnowledgeStats() {
  if (cachedKnowledgeStats) {
    return cachedKnowledgeStats;
  }

  const knowledge = buildKnowledge();

  cachedKnowledgeStats = knowledge.reduce(
    (stats, chunk) => {
      stats.totalChunks += 1;
      stats.byType[chunk.type] = (stats.byType[chunk.type] || 0) + 1;
      return stats;
    },
    { totalChunks: 0, byType: {} },
  );

  return cachedKnowledgeStats;
}

function isPrivateQuestion(question) {
  return privateInfoPatterns.some((pattern) => pattern.test(question));
}

function isSuspiciousQuestion(question) {
  return suspiciousQuestionPatterns.some((pattern) => pattern.test(question));
}

function isPortfolioBoundaryQuestion(question) {
  return portfolioBoundaryQuestionPatterns.some((pattern) =>
    pattern.test(question),
  );
}

function isOffTopicPastedContent(question) {
  const isAskingAboutSkyler = /\bskyler\b/i.test(question);

  return (
    !isAskingAboutSkyler &&
    (offTopicQuestionPatterns.some((pattern) => pattern.test(question)) ||
      (!question.includes('?') && question.length > 100))
  );
}

function validateQuestion(question) {
  if (!question) {
    return 'Question is required';
  }

  if (question.length > 250) {
    return 'Questions must be 250 characters or fewer.';
  }

  if (!/^[A-Za-z0-9 .,?!'"/&():-]+$/.test(question)) {
    return 'Questions can use letters, numbers, spaces, and basic punctuation.';
  }

  return '';
}

function sanitizeConversationContext(value) {
  if (!Array.isArray(value)) {
    return '';
  }

  const compactContextText = (text) => {
    if (text.length <= 260) {
      return text;
    }

    return `${text.slice(0, 130).trim()} ... ${text.slice(-120).trim()}`;
  };

  return value
    .slice(-6)
    .map((message) => {
      const role = message?.role === 'bot' ? 'Bot' : 'Visitor';
      const text = normalizeText(message?.text)
        .replace(/[^A-Za-z0-9 .,?!'"/&():-]/g, '')
        .trim();

      return text ? `${role}: ${compactContextText(text)}` : '';
    })
    .filter(Boolean)
    .join('\n')
    .slice(0, 1200);
}

function removeFollowUpOffers(answer) {
  let cleanAnswer = String(answer || '').trim();
  const followUpParagraphPattern =
    /(?:\n\s*){1,2}(?:if you (?:want|would like)|if you'd like|i can also|i can point|want me to|would you like|do you want)\b[\s\S]*$/i;
  const followUpSentencePattern =
    /\s+(?:if you (?:want|would like)|if you'd like|i can also|i can point|want me to|would you like|do you want)\b[^.!?]*(?:[.!?]|$)\s*$/i;

  cleanAnswer = cleanAnswer.replace(followUpParagraphPattern, '').trim();
  cleanAnswer = cleanAnswer.replace(followUpSentencePattern, '').trim();

  return cleanAnswer || String(answer || '').trim();
}

function normalizeAnswerLinks(answer) {
  return String(answer || '').replace(/\]\(\s+(\/[^)\s]+)\)/g, ']($1)');
}

function normalizeAnswerMarkdown(answer) {
  return String(answer || '')
    .replace(/\*\*(\[[^\]]+\]\([^)]+\))\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1');
}

function isPrivateDiagnosticsLogEnabled() {
  return (
    process.env.SKYLER_BOT_PRIVATE_DEBUG === 'true' ||
    process.env.SKYLER_BOT_PRIVATE_DEBUG_LOGS === 'true'
  );
}

function isLocalDebugOrigin(event) {
  const origin = getRequestOrigin(event);

  return !origin || localAllowedOrigins.includes(origin);
}

function getHeaderValue(event, headerName) {
  const headers = event.headers || {};
  const lowerHeaderName = headerName.toLowerCase();
  const matchingHeaderName = Object.keys(headers).find(
    (name) => name.toLowerCase() === lowerHeaderName,
  );

  return matchingHeaderName ? headers[matchingHeaderName] : '';
}

function isPrivateDiagnosticsResponseAllowed(event, payload = {}) {
  if (!payload.includePrivateDiagnostics) {
    return false;
  }

  if (
    process.env.SKYLER_BOT_PRIVATE_DEBUG_RESPONSE !== 'true' &&
    process.env.SKYLER_BOT_DEBUG_RESPONSE !== 'private'
  ) {
    return false;
  }

  const configuredToken = process.env.SKYLER_BOT_PRIVATE_DEBUG_TOKEN || '';

  if (configuredToken) {
    const providedToken =
      getHeaderValue(event, 'x-skyler-bot-debug-token') ||
      payload.debugToken ||
      '';

    return providedToken === configuredToken;
  }

  return isLocalDebugOrigin(event);
}

function getKnownAnswerLinkTargets() {
  const projects = loadExportedArray('src/data/projects.js', 'projects')
    .filter((project) => !project.notReady)
    .map((project) => ({
      type: 'project',
      href: `/projects/${encodeURIComponent(project.id)}`,
      label: project.title,
      aliases: [project.title, `Project: ${project.title}`],
    }));
  const experienceItems = loadExportedArray(
    'src/data/experience.js',
    'experienceItems',
  );
  const experienceLabels = [
    'experience',
    'portfolio overview',
    'his portfolio overview',
    'working style and culture fit',
    ...experienceItems.flatMap((item) => [
      item.organization,
      `${item.organization} experience`,
      `Experience: ${item.organization}`,
    ]),
  ];

  return [
    ...projects,
    {
      type: 'experience',
      href: '/experience',
      label: 'Experience',
      aliases: experienceLabels,
    },
    {
      type: 'home',
      href: '/',
      label: 'Portfolio overview',
      aliases: ['Portfolio overview', 'portfolio'],
    },
  ];
}

function extractAnswerLinks(answer) {
  const links = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match = linkPattern.exec(answer || '');

  while (match) {
    links.push({
      text: normalizeText(match[1]),
      href: String(match[2] || '').trim(),
    });
    match = linkPattern.exec(answer || '');
  }

  return links;
}

function analyzeAnswerLinks(answer) {
  const knownTargets = getKnownAnswerLinkTargets();

  return extractAnswerLinks(answer).map((link) => {
    const target = knownTargets.find((candidate) => candidate.href === link.href);
    const normalizedLinkText = link.text.toLowerCase();
    const allowedAnchorText = target
      ? target.aliases.some(
          (alias) => normalizeText(alias).toLowerCase() === normalizedLinkText,
        )
      : false;

    return {
      ...link,
      targetType: target?.type || 'unknown',
      expectedLabel: target?.label || '',
      allowedAnchorText,
      issue:
        target && !allowedAnchorText
          ? 'anchor_text_is_not_a_known_project_or_experience_label'
          : !target && link.href.startsWith('/')
            ? 'unknown_internal_link_target'
            : '',
    };
  });
}

function sanitizeAnswerLinkLabels(answer) {
  const knownTargets = getKnownAnswerLinkTargets();

  return String(answer || '').replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (fullMatch, rawText, rawHref) => {
      const href = String(rawHref || '').trim();
      const target = knownTargets.find((candidate) => candidate.href === href);

      if (!target) {
        return href.startsWith('/') ? normalizeText(rawText) : fullMatch;
      }

      const normalizedText = normalizeText(rawText).toLowerCase();
      const allowedAnchorText = target.aliases.some(
        (alias) => normalizeText(alias).toLowerCase() === normalizedText,
      );

      return allowedAnchorText ? fullMatch : `[${target.label}](${href})`;
    },
  );
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countAnswerLinks(answer) {
  return extractAnswerLinks(answer).length;
}

function autoLinkKnownAnswerTitles(answer, maxLinks = 2) {
  let linkedAnswer = String(answer || '');
  let linkCount = countAnswerLinks(linkedAnswer);

  if (linkCount >= maxLinks) {
    return linkedAnswer;
  }

  const knownTargets = getKnownAnswerLinkTargets()
    .filter(
      (target) =>
        target.type === 'project' ||
        (target.type === 'experience' && target.label !== 'Experience'),
    )
    .sort((left, right) => right.label.length - left.label.length);
  const usedHrefs = new Set(extractAnswerLinks(linkedAnswer).map((link) => link.href));

  for (const target of knownTargets) {
    if (linkCount >= maxLinks || usedHrefs.has(target.href)) {
      continue;
    }

    const segments = linkedAnswer.split(/(\[[^\]]+\]\([^)]+\))/g);
    let replaced = false;

    linkedAnswer = segments
      .map((segment) => {
        if (replaced || /^\[[^\]]+\]\([^)]+\)$/.test(segment)) {
          return segment;
        }

        const pattern = new RegExp(`\\b${escapeRegExp(target.label)}\\b`, 'i');

        if (!pattern.test(segment)) {
          return segment;
        }

        replaced = true;
        return segment.replace(pattern, `[${target.label}](${target.href})`);
      })
      .join('');

    if (replaced) {
      linkCount += 1;
      usedHrefs.add(target.href);
    }
  }

  return linkedAnswer;
}

function getCitationLabel(match = {}) {
  return String(match.source || match.title || '')
    .replace(/^Project:\s*/i, '')
    .replace(/^Experience:\s*/i, '')
    .trim();
}

function ensureAnswerHasCitation(answer, debug = {}) {
  if (countAnswerLinks(answer) > 0) {
    return answer;
  }

  const match = (debug.matches || []).find(
    (candidate) =>
      candidate.sourceUrl &&
      (candidate.type === 'project' ||
        candidate.type === 'experience'),
  );

  if (!match) {
    return answer;
  }

  const label = getCitationLabel(match);

  if (
    !label ||
    !new RegExp(`\\b${escapeRegExp(label)}\\b`, 'i').test(String(answer || ''))
  ) {
    return answer;
  }

  return `${String(answer || '').trim()} See [${label}](${match.sourceUrl}).`;
}

function getKnowledgeSourceDiagnostics() {
  const knowledgeStatus = getRepoFileStatus(
    'documents/skyler-bot-profile.md',
    'BOT_INFO_KEY',
  );
  const sourceProfileStatus = getRepoFileStatus(
    'documents/source-info.private.json',
    'SOURCE_INFO_KEY',
  );
  const publicSourceStatus = getRepoFileStatus('src/data/source-info.json');

  return {
    files: {
      publicSources: publicSourceStatus,
      encryptedKnowledge: knowledgeStatus,
      sourceProfiles: sourceProfileStatus,
    },
    knowledgeStats: getKnowledgeStats(),
    internalKnowledgeChunks: buildKnowledge()
      .filter((chunk) => chunk.internalSource)
      .reduce((stats, chunk) => {
        stats[chunk.internalSource] = (stats[chunk.internalSource] || 0) + 1;
        return stats;
      }, {}),
  };
}

function summarizeSourceProfile(sourceProfile) {
  if (!sourceProfile) {
    return null;
  }

  return {
    id: sourceProfile.id || '',
    key: sourceProfile.key || '',
    label: sourceProfile.label || '',
    role: sourceProfile.role || '',
    targetSkills: sourceProfile.targetSkills || [],
    responsibilities: sourceProfile.responsibilities || [],
    sortOverride: sourceProfile.sortOverride || [],
    answerGuidance: sourceProfile.answerGuidance || [],
    companySummary: sourceProfile.companySummary || '',
    cultureSummary: sourceProfile.cultureSummary || '',
    jobSummary: sourceProfile.jobSummary || '',
    jobDescriptionPreview: previewText(sourceProfile.jobDescription || '', 600),
  };
}

function buildPrivateDiagnostics({
  requestId,
  question,
  source,
  sourceProfile,
  conversationContext,
  recentProjectIds,
  recentProjectCounts,
  isFollowUpQuestion,
  result,
}) {
  return {
    stage: 'private_diagnostics',
    request: {
      question,
      source,
      isFollowUpQuestion,
    },
    knowledge: getKnowledgeSourceDiagnostics(),
    sourceProfile: summarizeSourceProfile(sourceProfile),
    memory: {
      conversationContext,
      recentProjectIds,
      recentProjectCounts,
      recentProjectUsage: getProjectUsageSummaries(recentProjectCounts),
    },
    retrieval: {
      provider: result.debug?.provider || '',
      model: result.debug?.model || '',
      questionIntents: result.debug?.questionIntents || [],
      queryTokens: result.debug?.queryTokens || [],
      sourceTailoringEnabled: Boolean(result.debug?.sourceTailoringEnabled),
      toolExperienceAssessment: result.debug?.toolExperienceAssessment || null,
      knowledgeStats: result.debug?.knowledge || null,
      topCandidates: result.debug?.topCandidates || [],
      matches: result.debug?.matches || [],
      fallbackReason: result.debug?.fallbackReason || '',
    },
    answer: {
      text: result.answer || '',
      links: analyzeAnswerLinks(result.answer || ''),
      linkIssues: analyzeAnswerLinks(result.answer || '').filter(
        (link) => link.issue,
      ),
    },
    requestId,
  };
}

function buildPublicDebugSummary(debug = {}) {
  return {
    provider: debug.provider || '',
    model: debug.model || '',
    questionIntents: debug.questionIntents || [],
    queryTokenCount: debug.queryTokenCount || 0,
    sourceTailoringEnabled: Boolean(debug.sourceTailoringEnabled),
    toolExperienceAssessment: debug.toolExperienceAssessment || null,
    matchCount: debug.matchCount || 0,
    fallbackReason: debug.fallbackReason || '',
    matches: (debug.matches || []).map((match) => ({
      title: match.title,
      type: match.type,
      source: match.source,
      sourceUrl: match.sourceUrl,
      score: match.score,
    })),
    topCandidates: debug.topCandidates || [],
    knowledge: debug.knowledge || null,
  };
}

function getRecentProjectMentions(conversationContext) {
  const contextText = normalizeText(conversationContext).toLowerCase();

  if (!contextText) {
    return [];
  }

  return buildKnowledge()
    .filter((chunk) => chunk.type === 'project' && chunk.id)
    .filter((project) => {
      const title = String(project.title || '').toLowerCase();
      const route = `/projects/${encodeURIComponent(project.id)}`.toLowerCase();

      return contextText.includes(route) || (title && contextText.includes(title));
    })
    .map((project) => project.id);
}

function sanitizeRecentProjectIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const validProjectIds = new Set(
    buildKnowledge()
      .filter((chunk) => chunk.type === 'project' && chunk.id)
      .map((project) => project.id),
  );

  return [
    ...new Set(
      value
        .map((id) => String(id || '').trim())
        .filter((id) => /^[A-Za-z0-9_-]+$/.test(id) && validProjectIds.has(id)),
    ),
  ].slice(-6);
}

function getValidProjectIds() {
  return new Set(
    buildKnowledge()
      .filter((chunk) => chunk.type === 'project' && chunk.id)
      .map((project) => project.id),
  );
}

function sanitizeRecentProjectCounts(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const validProjectIds = getValidProjectIds();

  return Object.fromEntries(
    Object.entries(value)
      .map(([projectId, count]) => [
        String(projectId || '').trim(),
        Math.min(Math.max(Number.parseInt(count, 10) || 0, 0), 6),
      ])
      .filter(
        ([projectId, count]) =>
          /^[A-Za-z0-9_-]+$/.test(projectId) &&
          validProjectIds.has(projectId) &&
          count > 0,
      )
      .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
      .slice(0, 8),
  );
}

function getRecentProjectIds(conversationContext, explicitProjectIds = []) {
  return [
    ...new Set([
      ...explicitProjectIds,
      ...getRecentProjectMentions(conversationContext),
    ]),
  ];
}

function getRepeatPenaltyProjectIds(question, explicitProjectIds = []) {
  return isLikelyFollowUpQuestion(question) ? [] : explicitProjectIds;
}

function getProjectTitlesById(projectIds = []) {
  const projectsById = new Map(
    buildKnowledge()
      .filter((chunk) => chunk.type === 'project' && chunk.id)
      .map((project) => [project.id, project.title]),
  );

  return projectIds
    .map((projectId) => projectsById.get(projectId))
    .filter(Boolean);
}

function getProjectUsageSummaries(projectCounts = {}) {
  const projectsById = new Map(
    buildKnowledge()
      .filter((chunk) => chunk.type === 'project' && chunk.id)
      .map((project) => [project.id, project.title]),
  );

  return Object.entries(projectCounts)
    .map(([projectId, count]) => ({
      id: projectId,
      title: projectsById.get(projectId),
      count,
    }))
    .filter((project) => project.title);
}

function isLikelyFollowUpQuestion(question) {
  const cleanQuestion = normalizeText(question).toLowerCase();
  const wordCount = cleanQuestion.split(/\s+/).filter(Boolean).length;

  if (!cleanQuestion) {
    return false;
  }

  if (
    /^(sure|yes|yeah|yep|ok|okay|please do|go on|continue|tell me more)\b/.test(
      cleanQuestion,
    )
  ) {
    return true;
  }

  if (
    /^(and|also|what about|how about|how so|does that|is that|would that|could that|that means|so|then)\b/.test(
      cleanQuestion,
    )
  ) {
    return true;
  }

  if (/\b(hire|hiring|candidate|recruiter|interview|role|job)\b/.test(cleanQuestion)) {
    return false;
  }

  return (
    wordCount <= 5 &&
    /\b(that|this|it|those|they|them|there)\b/.test(cleanQuestion)
  );
}

function scoreChunk(chunk, queryTokens) {
  return queryTokens.reduce((score, token) => {
    if (chunk.tokens.includes(token)) {
      return score + 3;
    }

    if (chunk.tokens.some((chunkToken) => chunkToken.includes(token))) {
      return score + 1;
    }

    return score;
  }, 0);
}

function trimToSentence(text, maxLength = 520) {
  const cleanText = normalizeText(text);

  if (cleanText.length <= maxLength) {
    return cleanText;
  }

  const trimmed = cleanText.slice(0, maxLength);
  const sentenceEnd = Math.max(
    trimmed.lastIndexOf('.'),
    trimmed.lastIndexOf(';'),
    trimmed.lastIndexOf(','),
  );

  return `${trimmed
    .slice(0, sentenceEnd > 240 ? sentenceEnd : maxLength)
    .trim()}...`;
}

function convertFirstPersonToThirdPerson(text) {
  return normalizeText(text)
    .replace(/\bI am\b/gi, 'Skyler is')
    .replace(/\bI have\b/gi, 'Skyler has')
    .replace(/\bI work\b/gi, 'Skyler works')
    .replace(/\bI enjoy\b/gi, 'Skyler enjoys')
    .replace(/\bI built\b/gi, 'Skyler built')
    .replace(/\bI created\b/gi, 'Skyler created')
    .replace(/\bI create\b/gi, 'Skyler creates')
    .replace(/\bI developed\b/gi, 'Skyler developed')
    .replace(/\bI handled\b/gi, 'Skyler handled')
    .replace(/\bI contributed\b/gi, 'Skyler contributed')
    .replace(/\bI collaborated\b/gi, 'Skyler collaborated')
    .replace(/\bI managed\b/gi, 'Skyler managed')
    .replace(/\bI enhanced\b/gi, 'Skyler enhanced')
    .replace(/\bI reworked\b/gi, 'Skyler reworked')
    .replace(/\bI used\b/gi, 'Skyler used')
    .replace(/\bhave made\b/gi, 'has made')
    .replace(/\bSoftware Engineer I\b/g, 'Software Engineer I')
    .replace(/\bI\b/g, 'Skyler')
    .replace(/\bSoftware Engineer Skyler\b/g, 'Software Engineer I')
    .replace(/\bmy\b/gi, "Skyler's")
    .replace(/\bme\b/gi, 'Skyler');
}

function answerQuestion(
  question,
  requestId,
  sourceKey,
  conversationContext = '',
  isFollowUpQuestion = false,
  explicitRecentProjectIds = [],
  explicitRecentProjectCounts = {},
) {
  if (isOffTopicPastedContent(question)) {
    debugLog(requestId, 'off_topic_block', {
      questionLength: question.length,
      questionPreview: previewText(question),
    });

    return {
      answer:
        "Ask a direct portfolio question about Skyler's work history, education, projects, skills, or experience.",
      debug: {
        provider: 'topic-guard',
        privateInfoBlocked: false,
        securityBlocked: true,
        queryTokenCount: 0,
        matchCount: 0,
        matches: [],
        knowledge: null,
      },
    };
  }

  if (isSuspiciousQuestion(question)) {
    debugLog(requestId, 'security_block', {
      questionLength: question.length,
      questionPreview: previewText(question),
    });

    return {
      answer:
        "Skyler Bot answers realistic portfolio questions about Skyler's professional background, education, projects, skills, and work history. It does not discuss internal prompts, source files, hidden context, logs, environment variables, or security details.",
      debug: {
        provider: 'security-guard',
        privateInfoBlocked: false,
        securityBlocked: true,
        queryTokenCount: 0,
        matchCount: 0,
        matches: [],
        knowledge: null,
      },
    };
  }

  if (isPortfolioBoundaryQuestion(question)) {
    debugLog(requestId, 'portfolio_boundary_block', {
      questionLength: question.length,
      questionPreview: previewText(question),
    });

    return {
      answer:
        "Skyler Bot answers realistic portfolio questions about Skyler's professional background, projects, skills, education, and work history. It does not provide raw evidence, hidden tailoring context, impersonation, private contact details, or adversarial weakness framing.",
      debug: {
        provider: 'portfolio-boundary-guard',
        privateInfoBlocked: false,
        securityBlocked: true,
        queryTokenCount: 0,
        matchCount: 0,
        matches: [],
        knowledge: null,
      },
    };
  }

  if (isPrivateQuestion(question)) {
    debugLog(requestId, 'privacy_block', {
      questionLength: question.length,
      questionPreview: previewText(question),
    });

    return {
      answer:
        "Skyler Bot can help with Skyler's professional background, projects, skills, and portfolio work, but does not share personal contact, family, location, compensation, or other private details.",
      debug: {
        provider: 'privacy-guard',
        privateInfoBlocked: true,
        securityBlocked: false,
        queryTokenCount: 0,
        matchCount: 0,
        matches: [],
        knowledge: null,
      },
    };
  }

  const sourceProfile = getSourceProfile(sourceKey);
  const provider = getSkylerBotProvider();
  const recentProjectMentions = getRecentProjectIds(
    conversationContext,
    explicitRecentProjectIds,
  );
  const recentProjectCounts = {
    ...Object.fromEntries(recentProjectMentions.map((projectId) => [projectId, 1])),
    ...explicitRecentProjectCounts,
  };
  const repeatPenaltyProjectIds = getRepeatPenaltyProjectIds(
    question,
    recentProjectMentions,
  );
  const repeatPenaltyProjectTitles = getProjectTitlesById(repeatPenaltyProjectIds);
  const recentProjectUsage = getProjectUsageSummaries(recentProjectCounts);
  debugLog(requestId, 'provider_selected', {
    provider: provider.name,
    source: sourceKey || '',
    hasSourceProfile: Boolean(sourceProfile),
    recentProjectMentions,
    recentProjectCounts,
    repeatPenaltyProjectIds,
    repeatPenaltyProjectTitles,
    recentProjectUsage,
  });

  return provider.answerQuestion(question, {
    requestId,
    sourceKey,
    sourceProfile,
    conversationContext,
    isFollowUpQuestion,
    recentProjectMentions,
    recentProjectCounts,
    recentProjectUsage,
    repeatPenaltyProjectIds,
    repeatPenaltyProjectTitles,
    buildKnowledge,
    getKnowledgeStats,
    log: (stage, details = {}) => debugLog(requestId, stage, details),
    previewText,
    scoreChunk,
    tokenize,
    trimToSentence,
    convertFirstPersonToThirdPerson,
  });
}

exports.handler = async (event) => {
  const requestId = createRequestId();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event) };
  }

  if (!isCorsOriginAllowed(event)) {
    debugLog(requestId, 'cors_origin_blocked', {
      origin: getRequestOrigin(event),
    });
    return jsonResponse(event, 403, {
      error: 'Origin is not allowed',
      requestId,
    });
  }

  if (event.httpMethod !== 'POST') {
    debugLog(requestId, 'method_not_allowed', { method: event.httpMethod });
    return jsonResponse(event, 405, { error: 'Method not allowed', requestId });
  }

  let payload = {};

  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    debugLog(requestId, 'invalid_json', {
      bodyLength: event.body?.length || 0,
    });
    return jsonResponse(event, 400, { error: 'Invalid JSON', requestId });
  }

  const question = normalizeText(payload.question);
  const conversationContext = sanitizeConversationContext(
    payload.conversationContext,
  );
  const recentProjectIds = sanitizeRecentProjectIds(payload.recentProjectIds);
  const recentProjectCounts = sanitizeRecentProjectCounts(
    payload.recentProjectCounts,
  );
  const isFollowUpQuestion = isLikelyFollowUpQuestion(question);
  const source = normalizeSourceKey(payload.source);
  const disableDiscordWebhook = Boolean(payload.disableDiscordWebhook);

  debugLog(requestId, 'request_received', {
    questionLength: question.length,
    questionPreview: previewText(question),
    conversationContextLength: conversationContext.length,
    recentProjectIds,
    recentProjectCounts,
    isFollowUpQuestion,
    source,
    disableDiscordWebhook,
  });

  const validationError = validateQuestion(question);

  if (validationError) {
    debugLog(requestId, 'invalid_question', {
      reason: validationError,
      questionLength: question.length,
      questionPreview: previewText(question),
    });
    return jsonResponse(event, 400, { error: validationError, requestId });
  }

  const rateLimit = checkRateLimit(event);

  if (!rateLimit.allowed) {
    debugLog(requestId, 'user_rate_limited', {
      window: rateLimit.window,
      limit: rateLimit.limit,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });

    const answer =
      rateLimit.window === 'day'
        ? "You've reached the daily limit of 35 messages. Please check back tomorrow — Skyler would love to keep chatting then."
        : 'You can send up to 10 messages per minute. Please wait a moment and try again.';

    return {
      ...jsonResponse(event, 429, {
        requestId,
        code: 'user_rate_limited',
        answer,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      }),
      headers: {
        ...getCorsHeaders(event),
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimit.retryAfterSeconds),
      },
    };
  }

  try {
    const result = await answerQuestion(
      question,
      requestId,
      source,
      conversationContext,
      isFollowUpQuestion,
      recentProjectIds,
      recentProjectCounts,
    );
    result.answer = removeFollowUpOffers(
      sanitizeAnswerLinkLabels(
        ensureAnswerHasCitation(
          autoLinkKnownAnswerTitles(
            normalizeAnswerMarkdown(normalizeAnswerLinks(result.answer)),
          ),
          result.debug,
        ),
      ),
    );
    const privateDiagnostics = buildPrivateDiagnostics({
      requestId,
      question,
      source,
      sourceProfile: getSourceProfile(source),
      conversationContext,
      recentProjectIds,
      recentProjectCounts,
      isFollowUpQuestion,
      result,
    });

    if (isPrivateDiagnosticsLogEnabled()) {
      privateDiagnosticsLog(requestId, privateDiagnostics);
    }

    await notifyDiscordChat(question, result, requestId, {
      source,
      disableDiscordWebhook,
    });

    // Keep the full debug payload in server logs only — never ship retrieval
    // matches, knowledge stats, model ids, or upstream rate-limit headers to
    // the browser.
    debugLog(requestId, 'response_ready', {
      answerLength: result.answer.length,
      provider: result.debug?.provider,
      matchCount: result.debug?.matchCount,
      fallbackReason: result.debug?.fallbackReason,
      code: result.code,
      rateLimits: result.debug?.rateLimits,
    });

    const publicBody = { requestId, answer: result.answer };

    if (result.code) {
      publicBody.code = result.code;
    }

    if (process.env.SKYLER_BOT_DEBUG_RESPONSE === 'true') {
      publicBody.debug = buildPublicDebugSummary(result.debug);
    }

    if (isPrivateDiagnosticsResponseAllowed(event, payload)) {
      publicBody.privateDiagnostics = privateDiagnostics;
    }

    return {
      ...jsonResponse(event, 200, publicBody),
      headers: {
        ...getCorsHeaders(event),
        'Content-Type': 'application/json',
        'x-skyler-bot-request-id': requestId,
      },
    };
  } catch (error) {
    debugLog(requestId, 'handler_error', {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    });

    return jsonResponse(event, 500, {
      requestId,
      answer:
        'I could not load the portfolio knowledge base yet. Please try again after the site finishes deploying.',
    });
  }
};
