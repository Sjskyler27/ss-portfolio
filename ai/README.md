# AI Workspace

This folder is for portfolio AI features.

The active MVP is Skyler Bot, a small portfolio chat assistant exposed through the Netlify function at `netlify/functions/skyler-bot.js`.

Provider selection lives in `netlify/functions/skyler-bot-providers/factory.js`.

Environment variables:

- `AI_PROVIDER`: provider selector.
- `AI_MODEL`: shared model name used by the AI-backed providers.
- `AI_OPENAI_API_KEY`: key used by the OpenAI-backed provider.
- `AI_GEMINI_API_KEY`: key used by the Gemini-backed provider.
- `AI_MOCK_ANSWER`: optional response used by the `mock` provider.

Supported providers:

- `retrieval` / `local`: deterministic portfolio retrieval.
- `mock`: fixed response for local smoke tests.
- `gemini`: Gemini generation over retrieved portfolio context, with retrieval fallback if the API key is missing.
- `openai` / `codex`: OpenAI generation over retrieved portfolio context, with retrieval fallback if the API key is missing.

Smoke test:

- `npm run skyler-bot:smoke` runs the bot against a default question and fails if it does not return from the configured AI provider.

Skyler Bot currently uses local retrieval over public portfolio-safe content:

- `src/data/projects.js`
- `src/data/experience.js`
- `src/App.vue`
- `README.md`
- `documents/skyler-bot-profile.md`

Avoid adding private details, copied app-specific code, generated caches, or credentials here.
