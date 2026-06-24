const { RetrievalProvider } = require('./retrieval');
const {
  buildGroundingPrompt,
  buildNoEvidenceAnswer,
  buildSkylerBotInstructions,
  buildUnavailableAnswer,
} = require('./prompt');

class GeminiProvider {
  constructor(env = process.env) {
    this.name = 'gemini';
    this.apiKey =
      env.AI_GEMINI_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_API_KEY || '';
    this.model = env.AI_MODEL || 'gemini-2.5-flash';
    this.retrievalProvider = new RetrievalProvider();
  }

  async answerQuestion(question, context) {
    const retrievalResult = this.retrievalProvider.getEvidence(
      question,
      context,
    );

    context.log('retrieval_complete', {
      provider: this.retrievalProvider.name,
      questionIntents: retrievalResult.debug.questionIntents,
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
      context.log('gemini_missing_key_fallback', {
        provider: this.name,
        fallbackProvider: this.retrievalProvider.name,
      });

      return {
        ...retrievalResult,
        answer: buildUnavailableAnswer('missing_api_key'),
        debug: {
          ...retrievalResult.debug,
          provider: 'gemini-fallback-retrieval',
          model: this.model,
          fallbackReason: 'missing_api_key',
        },
      };
    }

    let response;

    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: [
                      buildSkylerBotInstructions(
                        retrievalResult.debug.sourceTailoringEnabled
                          ? context.sourceProfile
                          : null,
                      ),
                      '',
                      buildGroundingPrompt(
                        question,
                        retrievalResult.answer,
                        context.conversationContext,
                        context.repeatPenaltyProjectTitles,
                        context.recentProjectUsage,
                        retrievalResult.debug.toolExperienceAssessment,
                      ),
                    ].join('\n'),
                  },
                ],
              },
            ],
          }),
        },
      );
    } catch (error) {
      context.log('gemini_request_failed_fallback', {
        provider: this.name,
        errorName: error.name,
        errorMessage: error.message,
      });

      return {
        ...retrievalResult,
        answer: buildUnavailableAnswer('request_failed'),
        debug: {
          ...retrievalResult.debug,
          provider: 'gemini-fallback-retrieval',
          model: this.model,
          fallbackReason: 'gemini_request_failed',
        },
      };
    }

    if (!response.ok) {
      const isRateLimited = response.status === 429;

      context.log('gemini_response_error_fallback', {
        provider: this.name,
        status: response.status,
        statusText: response.statusText,
      });

      return {
        ...retrievalResult,
        answer: buildUnavailableAnswer(isRateLimited ? 'rate_limited' : 'http_error'),
        ...(isRateLimited ? { code: 'model_rate_limited' } : {}),
        debug: {
          ...retrievalResult.debug,
          provider: 'gemini-fallback-retrieval',
          model: this.model,
          fallbackReason: `gemini_http_${response.status}`,
        },
      };
    }

    const payload = await response.json();
    const answer =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim() || '';

    if (!answer) {
      context.log('gemini_empty_response_fallback', {
        provider: this.name,
      });

      return {
        ...retrievalResult,
        answer: buildUnavailableAnswer('empty_response'),
        debug: {
          ...retrievalResult.debug,
          provider: 'gemini-fallback-retrieval',
          model: this.model,
          fallbackReason: 'empty_gemini_response',
        },
      };
    }

    context.log('gemini_response_ready', {
      provider: this.name,
      model: this.model,
      answerLength: answer.length,
    });

    return {
      answer,
      debug: {
        ...retrievalResult.debug,
        provider: this.name,
        model: this.model,
      },
    };
  }
}

module.exports = {
  GeminiProvider,
};
