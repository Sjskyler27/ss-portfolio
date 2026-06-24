const { RetrievalProvider } = require('./retrieval');
const {
  buildGroundingPrompt,
  buildNoEvidenceAnswer,
  buildSkylerBotInstructions,
  buildUnavailableAnswer,
} = require('./prompt');

class OpenAIProvider {
  constructor(env = process.env) {
    this.name = 'openai';
    this.apiKey =
      env.AI_OPENAI_API_KEY ||
      env.AI_API_KEY ||
      env.OPENAI_API_KEY ||
      env.CODEX_API_KEY ||
      '';
    this.model = env.AI_MODEL || 'gpt-5.4-mini';
    this.retrievalProvider = new RetrievalProvider();
  }

  extractOutputText(payload) {
    if (typeof payload.output_text === 'string') {
      return payload.output_text.trim();
    }

    return (payload.output || [])
      .flatMap((item) => item.content || [])
      .map((content) => content.text || '')
      .join('')
      .trim();
  }

  readRateLimitHeaders(response) {
    return {
      limitRequests: response.headers.get('x-ratelimit-limit-requests') || '',
      limitTokens: response.headers.get('x-ratelimit-limit-tokens') || '',
      remainingRequests:
        response.headers.get('x-ratelimit-remaining-requests') || '',
      remainingTokens:
        response.headers.get('x-ratelimit-remaining-tokens') || '',
      resetRequests: response.headers.get('x-ratelimit-reset-requests') || '',
      resetTokens: response.headers.get('x-ratelimit-reset-tokens') || '',
      requestId: response.headers.get('x-request-id') || '',
    };
  }

  async answerQuestion(question, context) {
    const retrievalResult = this.retrievalProvider.getEvidence(
      question,
      context,
    );

    context.log('retrieval_complete', {
      provider: this.retrievalProvider.name,
      queryTokenCount: retrievalResult.debug.queryTokenCount,
      queryTokens: retrievalResult.debug.queryTokens,
      sourceTailoringEnabled: retrievalResult.debug.sourceTailoringEnabled,
      knowledge: retrievalResult.debug.knowledge,
      matches: retrievalResult.debug.matches,
      topCandidates: retrievalResult.debug.topCandidates,
    });

    if (!retrievalResult.debug.matches.length) {
      return {
        ...retrievalResult,
        answer: buildNoEvidenceAnswer(),
        debug: {
          ...retrievalResult.debug,
          provider: this.name,
          fallbackReason: 'no_retrieval_matches',
        },
      };
    }

    if (!this.apiKey) {
      context.log('openai_missing_key_fallback', {
        provider: this.name,
        hasAiKey: Boolean(process.env.AI_OPENAI_API_KEY || process.env.AI_API_KEY),
        fallbackProvider: this.retrievalProvider.name,
      });

      return {
        ...retrievalResult,
        answer: buildUnavailableAnswer('missing_api_key'),
        debug: {
          ...retrievalResult.debug,
          provider: 'openai-fallback-retrieval',
          model: this.model,
          fallbackReason: 'missing_api_key',
        },
      };
    }

    let response;

    try {
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          instructions: buildSkylerBotInstructions(
            retrievalResult.debug.sourceTailoringEnabled
              ? context.sourceProfile
              : null,
          ),
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: [
                    buildGroundingPrompt(
                      question,
                      retrievalResult.answer,
                      context.conversationContext,
                      context.repeatPenaltyProjectTitles,
                      context.recentProjectUsage,
                    ),
                  ].join('\n'),
                },
              ],
            },
          ],
          store: false,
        }),
      });
    } catch (error) {
      context.log('openai_request_failed_fallback', {
        provider: this.name,
        errorName: error.name,
        errorMessage: error.message,
      });

      return {
        ...retrievalResult,
        answer: buildUnavailableAnswer('request_failed'),
        debug: {
          ...retrievalResult.debug,
          provider: 'openai-fallback-retrieval',
          model: this.model,
          fallbackReason: 'openai_request_failed',
        },
      };
    }

    if (!response.ok) {
      const errorBody = await response.text();
      const rateLimits = this.readRateLimitHeaders(response);
      const isRateLimited = response.status === 429;

      context.log('openai_response_error_fallback', {
        provider: this.name,
        status: response.status,
        statusText: response.statusText,
        rateLimits,
        errorBody: errorBody.slice(0, 400),
      });

      return {
        ...retrievalResult,
        answer: buildUnavailableAnswer(isRateLimited ? 'rate_limited' : 'http_error'),
        ...(isRateLimited ? { code: 'model_rate_limited' } : {}),
        debug: {
          ...retrievalResult.debug,
          provider: 'openai-fallback-retrieval',
          model: this.model,
          fallbackReason: `openai_http_${response.status}`,
          rateLimits,
        },
      };
    }

    const payload = await response.json();
    const answer = this.extractOutputText(payload);
    const rateLimits = this.readRateLimitHeaders(response);

    if (!answer) {
      context.log('openai_empty_response_fallback', {
        provider: this.name,
      });

      return {
        ...retrievalResult,
        answer: buildUnavailableAnswer('empty_response'),
        debug: {
          ...retrievalResult.debug,
          provider: 'openai-fallback-retrieval',
          model: this.model,
          fallbackReason: 'empty_openai_response',
        },
      };
    }

    context.log('openai_response_ready', {
      provider: this.name,
      model: this.model,
      answerLength: answer.length,
      rateLimits,
    });

    return {
      answer,
      debug: {
        ...retrievalResult.debug,
        provider: this.name,
        model: this.model,
        rateLimits,
      },
    };
  }
}

module.exports = {
  OpenAIProvider,
};
