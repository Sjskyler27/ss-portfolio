# Skyler Bot

Skyler Bot answers portfolio visitor questions about Skyler's professional background, projects, skills, and work history.

Current MVP behavior:

- Runs as a Netlify function.
- Uses an env-selected provider factory.
- Defaults to deterministic keyword retrieval, not an external LLM.
- Supports `AI_PROVIDER=retrieval`, `AI_PROVIDER=mock`, `AI_PROVIDER=gemini`, `AI_PROVIDER=openai`, and `AI_PROVIDER=codex`.
- Refuses personal/private information questions.
- Reads only portfolio-safe source files and `documents/skyler-bot-profile.md`.
- Emits sanitized debug logs with request IDs for tracing.

Future improvements can add provider-backed generation, embeddings, source citations, or an admin-only debug panel, but the privacy guard should stay in front of any model call.
