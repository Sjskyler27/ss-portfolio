#!/usr/bin/env node

// Sends a single question to the Skyler Bot function and prints the response.
// Uses whatever provider is configured in .env (AI_PROVIDER), or override with
// --provider. Debug detail is shown so you can see retrieval matches and any
// fallback/rate-limit reason.
//
// Usage:
//   npm run skyler-bot:ask -- "What is Skyler's AI experience?"
//   npm run skyler-bot:ask -- --provider=openai "Does he know Vue?"
//   npm run skyler-bot:ask -- --source=iconhealth "What projects fit this role?"
//   npm run skyler-bot:ask -- --quiet "Where did he go to school?"

const { loadDotEnv } = require('./lib/load-dotenv');

function parseArgs(argv) {
  const options = { quiet: false, provider: '', source: '', question: '' };
  const rest = [];

  for (const arg of argv) {
    if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
    } else if (arg.startsWith('--provider=')) {
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

async function main() {
  loadDotEnv();

  const options = parseArgs(process.argv.slice(2));

  if (!options.question) {
    console.error(
      'Usage: npm run skyler-bot:ask -- [--provider=<name>] [--source=<source>] [--quiet] "your question"',
    );
    process.exit(1);
  }

  if (options.provider) {
    process.env.AI_PROVIDER = options.provider;
  }

  const source = options.source || process.env.SKYLER_BOT_ASK_SOURCE || '';

  // Expose debug so we can inspect retrieval/fallback; the public response
  // strips it otherwise.
  process.env.SKYLER_BOT_DEBUG_RESPONSE = 'true';

  // Require after env is set so provider selection picks up overrides.
  const { handler } = require('../netlify/functions/skyler-bot');

  const startedAt = Date.now();
  const response = await handler({
    httpMethod: 'POST',
    headers: { 'x-nf-client-connection-ip': 'cli-local' },
    body: JSON.stringify({
      question: options.question,
      source,
      disableDiscordWebhook: true,
    }),
  });
  const elapsedMs = Date.now() - startedAt;

  let payload = {};
  try {
    payload = JSON.parse(response.body || '{}');
  } catch (error) {
    console.error(`Function returned invalid JSON: ${error.message}`);
    process.exit(1);
  }

  const debug = payload.debug || {};

  console.log('');
  console.log(`Q: ${options.question}`);
  if (source) {
    console.log(`Source: ${source}`);
  }
  console.log('—'.repeat(60));
  console.log(payload.answer || payload.error || '(no answer)');
  console.log('—'.repeat(60));

  if (!options.quiet) {
    console.log(
      JSON.stringify(
        {
          status: response.statusCode,
          source,
          provider: debug.provider || '',
          model: debug.model || '',
          code: payload.code || '',
          fallbackReason: debug.fallbackReason || '',
          matchCount: debug.matchCount,
          queryTokens: debug.queryTokens,
          matches: (debug.matches || []).map((m) => `${m.type}:${m.title.slice(0, 40)} (${m.score})`),
          topCandidates: debug.topCandidates,
          elapsedMs,
          requestId:
            payload.requestId || response.headers?.['x-skyler-bot-request-id'],
        },
        null,
        2,
      ),
    );
  }

  if (response.statusCode >= 500) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[skyler-bot:ask] failed', { message: error.message });
  process.exit(1);
});
