const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { decryptText } = require('./skyler-bot-providers/secret');

const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

let cachedPublicSources = null;
let cachedSourceProfiles = null;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
  const sourceValue = String(value || '').trim().slice(0, 80);

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

  const sourceInfoText = readSourceInfoText();

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
  const lowerSourceKey = String(sourceKey || '').toLowerCase();

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

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function deterministicSort(projects, sourceProfile) {
  const sourceTokens = tokenize(
    [
      sourceProfile.role,
      sourceProfile.companySummary,
      sourceProfile.cultureSummary,
      sourceProfile.jobSummary,
      sourceProfile.jobDescription,
      ...(sourceProfile.responsibilities || []),
      ...(sourceProfile.targetSkills || []),
      ...(sourceProfile.answerGuidance || []),
    ].join(' '),
  );

  return [...projects]
    .map((project, index) => {
      const projectTokens = tokenize(
        [
          project.title,
          project.type,
          project.group,
          project.category,
          project.summary,
          project.impact,
          project.description,
          (project.tech || []).join(' '),
        ].join(' '),
      );
      const score = sourceTokens.reduce(
        (total, token) => total + (projectTokens.includes(token) ? 1 : 0),
        0,
      );

      return { id: project.id, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((project) => project.id);
}

function getAiProviderConfig() {
  const provider = String(process.env.AI_PROVIDER || '').trim().toLowerCase();

  if (provider === 'gemini') {
    return {
      provider,
      apiKey:
        process.env.AI_GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        '',
      model: process.env.AI_MODEL || 'gemini-2.5-flash',
    };
  }

  return {
    provider: 'openai',
    apiKey:
      process.env.AI_OPENAI_API_KEY ||
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.CODEX_API_KEY ||
      '',
    model: process.env.AI_MODEL || 'gpt-5.4-mini',
  };
}

function parseProjectOrder(text, projects) {
  const validIds = new Set(projects.map((project) => project.id));
  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const match = String(text || '').match(/\[[\s\S]*\]/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch (parseError) {
        parsed = null;
      }
    }
  }

  const ids = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.projectIds)
    ? parsed.projectIds
    : [];

  return ids.filter((id) => validIds.has(id));
}

async function getAiProjectOrder(projects, sourceProfile) {
  const config = getAiProviderConfig();

  if (!config.apiKey) {
    return [];
  }

  const projectBriefs = projects.map((project) => ({
    id: project.id,
    title: project.title,
    type: project.type,
    group: project.group,
    category: project.category,
    summary: project.summary,
    impact: project.impact,
    description: project.description,
    tech: project.tech || [],
  }));
  const prompt = [
    'Rank these portfolio projects for a recruiter source.',
    'Return only JSON in this exact shape: {"projectIds":["id"]}.',
    'Use only the supplied project IDs. Prefer truthful relevance to the role.',
    '',
    `Source role: ${sourceProfile.role || ''}`,
    `Company summary: ${sourceProfile.companySummary || ''}`,
    `Culture summary: ${sourceProfile.cultureSummary || ''}`,
    `Source job summary: ${sourceProfile.jobSummary || ''}`,
    `Full job description: ${sourceProfile.jobDescription || ''}`,
    `Responsibilities: ${(sourceProfile.responsibilities || []).join(' ')}`,
    `Target skills: ${(sourceProfile.targetSkills || []).join(', ')}`,
    `Source guidance: ${(sourceProfile.answerGuidance || []).join(' ')}`,
    '',
    `Projects: ${JSON.stringify(projectBriefs)}`,
  ].join('\n');

  if (config.provider === 'gemini') {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const text =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim() || '';

    return parseProjectOrder(text, projects);
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      instructions:
        'You rank portfolio projects for recruiter relevance and return only valid JSON.',
      input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
      store: false,
    }),
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  const text =
    payload.output_text ||
    (payload.output || [])
      .flatMap((item) => item.content || [])
      .map((content) => content.text || '')
      .join('');

  return parseProjectOrder(text, projects);
}

function fillMissingProjectIds(projectIds, fallbackProjectIds) {
  const seen = new Set(projectIds);
  return [
    ...projectIds,
    ...fallbackProjectIds.filter((id) => !seen.has(id)),
  ];
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  let payload = {};

  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { error: 'Invalid JSON' });
  }

  const source = normalizeSourceKey(payload.source);

  if (!source) {
    return jsonResponse(200, { source: '', projectIds: [], strategy: 'none' });
  }

  const sourceProfile = getSourceProfile(source);

  if (!sourceProfile) {
    return jsonResponse(200, { source, projectIds: [], strategy: 'none' });
  }

  const projects = loadExportedArray('src/data/projects.js', 'projects').filter(
    (project) => !project.notReady,
  );
  const localProjectIds = deterministicSort(projects, sourceProfile);
  const overrideIds = Array.isArray(sourceProfile.sortOverride)
    ? sourceProfile.sortOverride.filter((id) =>
        projects.some((project) => project.id === id),
      )
    : [];

  if (overrideIds.length) {
    return jsonResponse(200, {
      source,
      projectIds: fillMissingProjectIds(overrideIds, localProjectIds),
      strategy: 'override',
    });
  }

  try {
    const aiOrder = await getAiProjectOrder(projects, sourceProfile);

    if (aiOrder.length) {
      return jsonResponse(200, {
        source,
        projectIds: fillMissingProjectIds(aiOrder, localProjectIds),
        strategy: 'ai',
      });
    }
  } catch (error) {
    // Fall through to local scoring.
  }

  return jsonResponse(200, {
    source,
    projectIds: localProjectIds,
    strategy: 'local',
  });
};
