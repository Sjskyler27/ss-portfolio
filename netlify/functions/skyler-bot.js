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

function isExcludedKnowledgeSection(section) {
  const normalized = section.toLowerCase().trimStart();

  return excludedKnowledgeSections.some((heading) =>
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
    tags: [project.type, ...(project.tech || [])],
    text: removeSensitiveSentences(
      [
        project.title,
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
    /^(and|also|what about|how about|does that|is that|would that|could that|that means|so|then)\b/.test(
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
    /\b(he|his|him|that|this|it|those|they|them|there)\b/.test(cleanQuestion)
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
  debugLog(requestId, 'provider_selected', {
    provider: provider.name,
    source: sourceKey || '',
    hasSourceProfile: Boolean(sourceProfile),
  });

  return provider.answerQuestion(question, {
    requestId,
    sourceKey,
    sourceProfile,
    conversationContext,
    isFollowUpQuestion,
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
  const isFollowUpQuestion = isLikelyFollowUpQuestion(question);
  const source = normalizeSourceKey(payload.source);
  const disableDiscordWebhook = Boolean(payload.disableDiscordWebhook);

  debugLog(requestId, 'request_received', {
    questionLength: question.length,
    questionPreview: previewText(question),
    conversationContextLength: conversationContext.length,
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
    );
    result.answer = removeFollowUpOffers(result.answer);
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
      publicBody.debug = result.debug;
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
