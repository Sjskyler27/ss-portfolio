const { buildNoEvidenceAnswer } = require("./prompt");

class RetrievalProvider {
  constructor() {
    this.name = "retrieval";
  }

  getTypePriority(type) {
    // The curated bot knowledge file (info/profile/overview) is the
    // authoritative source and is referenced first; project/experience chunks
    // are always included afterwards so answers can link to their routes.
    const priorities = {
      info: 7,
      profile: 6,
      overview: 5,
      experience: 4,
      project: 4,
    };

    return priorities[type] || 0;
  }

  isBotInfoType(type) {
    return type === 'info' || type === 'profile' || type === 'overview';
  }

  getQueryAliases(question) {
    const aliases = [];
    const lowerQuestion = question.toLowerCase();

    if (/\b(tell me about skyler|who is skyler|about skyler)\b/.test(lowerQuestion)) {
      aliases.push("background", "frontend", "full-stack", "projects", "skills");
    }

    if (/\b(history|background|work history|experience)\b/.test(lowerQuestion)) {
      aliases.push("ondiem", "stonecrest", "professional", "experience");
    }

    if (/\b(strengths?|strongest|good at|best at)\b/.test(lowerQuestion)) {
      aliases.push("strengths", "frontend", "vue", "full-stack", "product");
    }

    if (/\b(latest|newest|recent|most recent)\b/.test(lowerQuestion)) {
      aliases.push("everee", "rust", "payroll", "integration");
    }

    if (/\b(lead dev|lead developer|tech lead|lead engineer|leadership)\b/.test(lowerQuestion)) {
      aliases.push("component", "library", "workflows", "documentation", "product");
    }

    if (/\b(frontend|front end|web developer|developr|designer|design)\b/.test(lowerQuestion)) {
      aliases.push("frontend", "vue", "react", "figma", "ui");
    }

    if (/\b(terminal|command line|cli|powershell|shell)\b/.test(lowerQuestion)) {
      aliases.push("docker", "powershell", "python", "script", "automation");
    }

    if (/\b(education|school|schooling|college|degree|bachelor)\b/.test(lowerQuestion)) {
      aliases.push("education", "byu-idaho", "degree", "web development");
    }

    if (/\b(ai|a\.i\.|artificial intelligence|machine learning|ml|llm|ocr|automation|gpt|copilot)\b/.test(lowerQuestion)) {
      aliases.push("ai", "ai-assisted", "ocr", "document", "automation", "ondiem", "workflow");
    }

    return aliases;
  }

  buildQueryTokens(question, context) {
    return context.tokenize([question, ...this.getQueryAliases(question)].join(" "));
  }

  dedupeMatches(matches) {
    const seen = new Set();

    return matches.filter((match) => {
      const key = `${match.type}:${match.sourceLabel || match.title}`.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  scoreChunk(chunk, queryTokens, context) {
    const baseScore = context.scoreChunk(chunk, queryTokens);
    const sourceText = `${chunk.title || ""} ${chunk.sourceLabel || ""}`.toLowerCase();

    if (/\beducation|school|degree|bachelor\b/i.test(queryTokens.join(" "))) {
      return /\beducation\b/.test(sourceText) ? baseScore + 12 : baseScore;
    }

    return baseScore;
  }

  retrieve(question, context, limit = 6) {
    const queryTokens = this.buildQueryTokens(question, context);
    const knowledge = context.buildKnowledge();
    const allScored = knowledge
      .map((chunk) => ({
        ...chunk,
        score: this.scoreChunk(chunk, queryTokens, context),
      }))
      .sort((a, b) => b.score - a.score);

    // Top scorers regardless of threshold — useful for debugging why a question
    // returned no matches (e.g. a near-miss at score 2 below the cutoff of 3).
    const topCandidates = allScored.slice(0, 3).map((chunk) => ({
      title: chunk.title,
      type: chunk.type,
      score: chunk.score,
    }));

    const scored = allScored
      .filter((chunk) => chunk.score >= 3)
      .sort(
        (a, b) =>
          b.score - a.score ||
          this.getTypePriority(b.type) - this.getTypePriority(a.type)
      );

    // Reference the bot knowledge file first, but always reserve room for
    // project/experience chunks so the answer keeps routes to those pages.
    const botInfoLimit = Math.max(1, limit - 2);
    const botInfoMatches = scored
      .filter((chunk) => this.isBotInfoType(chunk.type))
      .slice(0, botInfoLimit);
    const portfolioMatches = scored.filter(
      (chunk) => !this.isBotInfoType(chunk.type)
    );

    const matches = this.dedupeMatches([
      ...botInfoMatches,
      ...portfolioMatches,
    ]).slice(0, limit);

    return {
      queryTokens,
      matches,
      topCandidates,
      knowledgeStats: context.getKnowledgeStats(),
    };
  }

  formatEvidence(matches, context) {
    return matches
      .map((match) => {
        const excerpt = context.convertFirstPersonToThirdPerson(
          context.trimToSentence(match.text, 700)
        );
        const label = match.sourceLabel || match.title;
        const sourceLink = match.sourceUrl
          ? `[${label}](${match.sourceUrl})`
          : "none (do not cite a link for this fact)";

        return [
          `Source link: ${sourceLink}`,
          `Type: ${match.type}`,
          `Title: ${match.title}`,
          `Evidence: ${excerpt}`,
        ].join("\n");
      })
      .join("\n\n");
  }

  getEvidence(question, context) {
    const { queryTokens, matches, topCandidates, knowledgeStats } =
      this.retrieve(question, context);

    return {
      answer: matches.length ? this.formatEvidence(matches, context) : "",
      debug: {
        provider: this.name,
        privateInfoBlocked: false,
        queryTokenCount: queryTokens.length,
        queryTokens,
        matchCount: matches.length,
        matches: matches.map((match) => ({
          title: match.title,
          type: match.type,
          source: match.sourceLabel || match.title,
          sourceUrl: match.sourceUrl || "",
          score: match.score,
        })),
        // Best-scoring chunks even when nothing cleared the threshold — shown
        // in logs so a zero-match question is diagnosable at a glance.
        topCandidates,
        knowledge: knowledgeStats,
      },
    };
  }

  answerQuestion(question, context) {
    const evidenceResult = this.getEvidence(question, context);

    context.log("retrieval_complete", {
      provider: this.name,
      queryTokenCount: evidenceResult.debug.queryTokenCount,
      queryTokens: evidenceResult.debug.queryTokens,
      knowledge: evidenceResult.debug.knowledge,
      matches: evidenceResult.debug.matches,
      topCandidates: evidenceResult.debug.topCandidates,
    });

    if (!evidenceResult.debug.matches.length) {
      return {
        answer:
          buildNoEvidenceAnswer(),
        debug: evidenceResult.debug,
      };
    }

    return {
      answer:
        "Skyler Bot found relevant portfolio context, but the answer model is not enabled. Set an AI provider to turn the retrieved context into a natural answer.",
      debug: evidenceResult.debug,
    };
  }
}

module.exports = {
  RetrievalProvider,
};
