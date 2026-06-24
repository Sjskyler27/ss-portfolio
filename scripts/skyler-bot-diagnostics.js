#!/usr/bin/env node

// Runs one Skyler Bot request with private diagnostics enabled locally.
// This prints retrieval matches, private/encrypted knowledge status, source
// tailoring context, conversation memory, and markdown link analysis.
//
// Usage:
//   npm run skyler-bot:diagnostics -- --provider=retrieval --source=dave "what type of sharepoint experience does he have"
//   npm run skyler-bot:diagnostics -- --provider=openai --source=iconhealth "why should I hire him"

const { loadDotEnv } = require('./lib/load-dotenv');

function parseArgs(argv) {
  const options = {
    provider: '',
    source: '',
    question: '',
  };
  const rest = [];

  for (const arg of argv) {
    if (arg.startsWith('--provider=')) {
      options.provider = arg.slice('--provider='.length);
    } else if (arg.startsWith('--source=')) {
      options.source = arg.slice('--source='.length);
    } else {
      rest.push(arg);
    }
  }

  options.question = rest.join(' ').trim();
  return options;
}

function printSection(title) {
  console.log('');
  console.log(title);
  console.log('-'.repeat(title.length));
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printMatches(matches = []) {
  if (!matches.length) {
    console.log('(no retrieval matches)');
    return;
  }

  matches.forEach((match, index) => {
    const flags = [];
    if (match.alwaysInclude) {
      flags.push('always');
    }

    console.log(
      `${index + 1}. ${match.type}:${match.title} score=${match.score} url=${match.sourceUrl || 'none'}${flags.length ? ` flags=${flags.join(',')}` : ''}`,
    );
    if (match.internalSource) {
      console.log(`   internalSource=${match.internalSource}`);
    }
    if (match.evidencePreview) {
      console.log(`   evidence=${match.evidencePreview}`);
    }
  });
}

async function main() {
  loadDotEnv();

  const options = parseArgs(process.argv.slice(2));

  if (!options.question) {
    console.error(
      'Usage: npm run skyler-bot:diagnostics -- [--provider=<name>] [--source=<source>] "your question"',
    );
    process.exit(1);
  }

  if (options.provider) {
    process.env.AI_PROVIDER = options.provider;
  }

  const source = options.source || process.env.SKYLER_BOT_ASK_SOURCE || '';
  process.env.SKYLER_BOT_PRIVATE_DEBUG_RESPONSE = 'true';

  const { handler } = require('../netlify/functions/skyler-bot');

  const startedAt = Date.now();
  const originalLog = console.log;
  const originalWarn = console.warn;
  let response;

  try {
    console.log = () => {};
    console.warn = () => {};
    response = await handler({
      httpMethod: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-nf-client-connection-ip': 'cli-local',
      },
    body: JSON.stringify({
      question: options.question,
      source,
      includePrivateDiagnostics: true,
      disableDiscordWebhook: true,
    }),
  });
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }

  const elapsedMs = Date.now() - startedAt;

  let payload = {};
  try {
    payload = JSON.parse(response.body || '{}');
  } catch (error) {
    console.error(`Function returned invalid JSON: ${error.message}`);
    process.exit(1);
  }

  const diagnostics = payload.privateDiagnostics;

  printSection('Answer');
  console.log(payload.answer || payload.error || '(no answer)');

  if (!diagnostics) {
    printSection('Diagnostics');
    console.log('Private diagnostics were not returned.');
    console.log('Expected local/no-origin request plus SKYLER_BOT_PRIVATE_DEBUG_RESPONSE=true.');
    process.exit(response.statusCode >= 500 ? 1 : 0);
  }

  printSection('Request');
  printJson({
    status: response.statusCode,
    elapsedMs,
    requestId: payload.requestId,
    ...diagnostics.request,
  });

  printSection('Knowledge Files');
  printJson(diagnostics.knowledge.files);

  printSection('Knowledge Counts');
  printJson({
    stats: diagnostics.knowledge.knowledgeStats,
    internalChunks: diagnostics.knowledge.internalKnowledgeChunks,
  });

  printSection('Source Profile');
  printJson(diagnostics.sourceProfile || '(none)');

  printSection('Memory');
  printJson(diagnostics.memory);

  printSection('Retrieval Tokens');
  printJson({
    sourceTailoringEnabled: diagnostics.retrieval.sourceTailoringEnabled,
    questionIntents: diagnostics.retrieval.questionIntents,
    queryTokens: diagnostics.retrieval.queryTokens,
  });

  if (diagnostics.retrieval.toolExperienceAssessment) {
    printSection('Tool Experience Check');
    printJson(diagnostics.retrieval.toolExperienceAssessment);
  }

  printSection('Retrieval Matches');
  printMatches(diagnostics.retrieval.matches);

  printSection('Top Candidates');
  printJson(diagnostics.retrieval.topCandidates);

  printSection('Answer Links');
  printJson(diagnostics.answer.links);

  if (diagnostics.answer.linkIssues.length) {
    printSection('Link Issues');
    printJson(diagnostics.answer.linkIssues);
  }

  if (response.statusCode >= 500) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[skyler-bot:diagnostics] failed', { message: error.message });
  process.exit(1);
});
