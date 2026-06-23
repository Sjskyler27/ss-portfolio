const { GeminiProvider } = require('./gemini');
const { MockProvider } = require('./mock');
const { OpenAIProvider } = require('./openai');
const { RetrievalProvider } = require('./retrieval');

function getSkylerBotProvider(env = process.env) {
  const providerName = (env.AI_PROVIDER || 'retrieval')
    .trim()
    .toLowerCase();

  if (providerName === 'retrieval' || providerName === 'local') {
    return new RetrievalProvider();
  }

  if (providerName === 'mock') {
    return new MockProvider();
  }

  if (providerName === 'gemini') {
    return new GeminiProvider(env);
  }

  if (providerName === 'openai' || providerName === 'codex') {
    return new OpenAIProvider(env);
  }

  throw new Error(`Unknown Skyler Bot provider: ${providerName}`);
}

module.exports = {
  getSkylerBotProvider,
};
