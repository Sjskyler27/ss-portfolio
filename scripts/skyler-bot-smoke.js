#!/usr/bin/env node

const { handler } = require('../netlify/functions/skyler-bot');
const { loadDotEnv } = require('./lib/load-dotenv');

const defaultQuestion = 'What project did Skyler build most recently?';
const supportedProviders = new Set(['openai', 'codex', 'gemini']);

async function main() {
  loadDotEnv();
  // The function strips debug from its public response; opt back in for the smoke test.
  process.env.SKYLER_BOT_DEBUG_RESPONSE = 'true';

  const provider = String(process.env.AI_PROVIDER || '').trim().toLowerCase();
  const question = String(
    process.env.SKYLER_BOT_SMOKE_QUESTION || defaultQuestion,
  ).trim();

  if (!supportedProviders.has(provider)) {
    throw new Error(
      `Set AI_PROVIDER to openai, codex, or gemini before running this smoke test. Current value: ${provider || '(empty)'}.`,
    );
  }

  if (!question) {
    throw new Error('SKYLER_BOT_SMOKE_QUESTION cannot be empty.');
  }

  const response = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({
      question,
      disableDiscordWebhook: true,
    }),
  });

  let payload = {};

  try {
    payload = JSON.parse(response.body || '{}');
  } catch (error) {
    throw new Error(`Function returned invalid JSON: ${error.message}`);
  }

  const expectedProvider =
    provider === 'codex' ? 'openai' : provider === 'openai' ? 'openai' : 'gemini';
  const actualProvider = String(payload.debug?.provider || '').toLowerCase();

  console.log(
    JSON.stringify(
      {
        statusCode: response.statusCode,
        requestId: payload.requestId || response.headers?.['x-skyler-bot-request-id'],
        expectedProvider,
        actualProvider,
        model: payload.debug?.model || '',
        fallbackReason: payload.debug?.fallbackReason || '',
        rateLimits: payload.debug?.rateLimits || null,
        answer: payload.answer || '',
      },
      null,
      2,
    ),
  );

  if (response.statusCode !== 200) {
    throw new Error(`Smoke test failed with HTTP ${response.statusCode}.`);
  }

  if (!payload.answer) {
    throw new Error('Smoke test returned an empty answer.');
  }

  if (
    !actualProvider ||
    actualProvider.includes('fallback') ||
    actualProvider !== expectedProvider
  ) {
    throw new Error(
      `Smoke test did not use the configured AI provider. Expected ${expectedProvider}, got ${actualProvider || '(empty)'}.`,
    );
  }

  if (payload.debug?.fallbackReason) {
    throw new Error(`Smoke test fell back: ${payload.debug.fallbackReason}.`);
  }
}

main().catch((error) => {
  console.error('[SkylerBot smoke test] failed', {
    message: error.message,
  });
  process.exit(1);
});
