#!/usr/bin/env node

// Calls the source project sort function for one or more source values.
//
// Usage:
//   npm run source-info:sort
//   npm run source-info:sort -- dave 2 iconhealth

const { loadDotEnv } = require('./lib/load-dotenv');

function parseSources(argv) {
  return argv
    .flatMap((arg) => arg.split(','))
    .map((arg) => arg.trim())
    .filter(Boolean);
}

async function main() {
  loadDotEnv();

  const sources = parseSources(process.argv.slice(2));
  const testSources = sources.length ? sources : ['dave'];
  const { handler } = require('../netlify/functions/source-project-sort');

  for (const source of testSources) {
    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ source }),
    });

    let payload = {};
    try {
      payload = JSON.parse(response.body || '{}');
    } catch (error) {
      console.error(`Invalid JSON for source "${source}": ${error.message}`);
      process.exitCode = 1;
      continue;
    }

    console.log('');
    console.log(`Source input: ${source}`);
    console.log('—'.repeat(60));
    console.log(
      JSON.stringify(
        {
          status: response.statusCode,
          resolvedSource: payload.source || '',
          strategy: payload.strategy || '',
          projectIds: payload.projectIds || [],
          error: payload.error || '',
        },
        null,
        2,
      ),
    );

    if (response.statusCode >= 500) {
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error('[source-info:sort] failed', { message: error.message });
  process.exit(1);
});
