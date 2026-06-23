class MockProvider {
  constructor(answer = process.env.AI_MOCK_ANSWER || process.env.SKYLER_BOT_MOCK_ANSWER) {
    this.name = 'mock';
    this.answer =
      answer ||
      'Skyler Bot mock response. Set AI_PROVIDER=retrieval for portfolio answers.';
  }

  answerQuestion(question, context) {
    context.log('mock_provider_response', {
      provider: this.name,
      questionLength: question.length,
    });

    return {
      answer: this.answer,
      debug: {
        provider: this.name,
        privateInfoBlocked: false,
        queryTokenCount: 0,
        matchCount: 0,
        matches: [],
        knowledge: null,
      },
    };
  }
}

module.exports = {
  MockProvider,
};
