const { buildNoEvidenceAnswer } = require("./prompt");

class RetrievalProvider {
  constructor() {
    this.name = "retrieval";
    this.directToolPatterns = [
      { label: "Docker", pattern: /\bdocker\b/i },
      { label: "Linux", pattern: /\blinux\b/i },
      { label: "Ubuntu", pattern: /\bubuntu\b/i },
      { label: "WSL", pattern: /\bwsl\b/i },
      { label: "SharePoint", pattern: /\bsharepoint\b/i },
      { label: "OneDrive", pattern: /\bonedrive\b/i },
      { label: "Microsoft Graph", pattern: /\bmicrosoft graph\b/i },
      { label: "Lawmatics", pattern: /\blawmatics\b/i },
      { label: "PHP", pattern: /\bphp\b/i },
      { label: "PowerShell", pattern: /\bpowershell\b/i },
      { label: "Bash", pattern: /\bbash\b/i },
      { label: "SQL", pattern: /\bsql\b/i },
      { label: "Backend", pattern: /\bbackend\b/i },
      { label: "Frontend", pattern: /\bfrontend|front end\b/i },
    ];
    this.strictPublicEvidenceTools = new Set([
      "SharePoint",
      "OneDrive",
      "Microsoft Graph",
      "Lawmatics",
      "PHP",
      "PowerShell",
      "Bash",
    ]);
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

  classifyQuestion(question) {
    const lowerQuestion = String(question || "").toLowerCase();
    const intents = [];

    if (/\b(where does he work|where is he working|who does he work for|current employer|employer|works? at|workplace|company)\b/.test(lowerQuestion)) {
      intents.push("current_employer");
    }

    if (/\b(education|school|schooling|college|degree|bachelor|byu)\b/.test(lowerQuestion)) {
      intents.push("education");
    }

    if (/\b(docker|linux|ubuntu|wsl|sharepoint|onedrive|microsoft graph|lawmatics|php|powershell|bash|sql|backend|frontend)\b/.test(lowerQuestion)) {
      intents.push("direct_skill_or_tool");
    }

    if (/\b(why|hire|hiring|candidate|fit|role|team|culture|summary|pitch|stand out|strengths?|background)\b/.test(lowerQuestion)) {
      intents.push("hiring_or_fit");
    }

    if (/\b(projects?|built|shipped|delivered|production|professionally|professional work)\b/.test(lowerQuestion)) {
      intents.push("projects_or_work");
    }

    return intents.length ? intents : ["general"];
  }

  getRequestedDirectTools(question) {
    const lowerQuestion = String(question || "").toLowerCase();
    const asksDirectExperience =
      /\b(know|knows|experience|worked with|used|uses|good with|familiar|handle|can he|does he|has he)\b/.test(
        lowerQuestion
      );

    if (!asksDirectExperience) {
      return [];
    }

    return this.directToolPatterns
      .filter((tool) => tool.pattern.test(lowerQuestion))
      .map((tool) => tool.label);
  }

  buildToolExperienceAssessment(question, matches) {
    const requestedTools = this.getRequestedDirectTools(question);

    if (!requestedTools.length) {
      return null;
    }

    const supportedTools = [];
    const unsupportedTools = [];

    for (const tool of requestedTools) {
      const toolPattern = this.directToolPatterns.find(
        (entry) => entry.label === tool
      )?.pattern;
      const supportingMatches = matches.filter((match) => {
        if (match.alwaysInclude) {
          return false;
        }

        if (
          this.strictPublicEvidenceTools.has(tool) &&
          match.type !== "project" &&
          match.type !== "experience"
        ) {
          return false;
        }

        const evidenceText = [
          match.title,
          match.sourceLabel,
          match.text,
          ...(match.tags || []),
        ].join(" ");

        return toolPattern?.test(evidenceText);
      });

      if (supportingMatches.length) {
        supportedTools.push({
          tool,
          evidenceTitles: supportingMatches
            .slice(0, 3)
            .map((match) => match.sourceLabel || match.title),
        });
      } else {
        unsupportedTools.push(tool);
      }
    }

    return {
      requestedTools,
      supportedTools,
      unsupportedTools,
      mustUseLimitationLanguage: unsupportedTools.length > 0,
    };
  }

  getQueryAliases(question) {
    const aliases = [];
    const lowerQuestion = question.toLowerCase();
    const specificToolPattern =
      /\b(docker|linux|ubuntu|wsl|sharepoint|onedrive|microsoft graph|lawmatics|php|powershell|bash|sql|backend|frontend)\b/;
    const asksSpecificToolExperience =
      specificToolPattern.test(lowerQuestion) && /\bexperience\b/.test(lowerQuestion);

    if (/\b(tell me about skyler|who is skyler|about skyler)\b/.test(lowerQuestion)) {
      aliases.push("background", "frontend", "full-stack", "projects", "skills");
    }

    if (
      /\b(where does he work|where is he working|who does he work for|current employer|employer|works? at|workplace|company)\b/.test(
        lowerQuestion
      )
    ) {
      aliases.push(
        "current",
        "employer",
        "ondiem",
        "gig",
        "forces",
        "full-stack",
        "software",
        "engineer"
      );
    }

    if (/\b(stand out|impressive|differentiates?|sets him apart)\b/.test(lowerQuestion)) {
      aliases.push(
        "strengths",
        "professional",
        "production",
        "full-stack",
        "product",
        "ownership",
        "ondiem",
        "stonecrest",
        "healthcare",
        "component"
      );
    }

    if (/\b(shipped|delivered|production|professionally|professional work|actually built)\b/.test(lowerQuestion)) {
      aliases.push(
        "ondiem",
        "stonecrest",
        "app",
        "rebuild",
        "onboarding",
        "component",
        "state",
        "partnerships",
        "production",
        "professional"
      );
    }

    if (
      /\b(history|background|work history)\b/.test(lowerQuestion) ||
      (/\bexperience\b/.test(lowerQuestion) && !asksSpecificToolExperience)
    ) {
      aliases.push("ondiem", "stonecrest", "professional", "experience");
    }

    if (/\b(hire|hiring|candidate|recruiter|interview|role|job)\b/.test(lowerQuestion)) {
      aliases.push(
        "strengths",
        "professional",
        "experience",
        "product",
        "ownership",
        "workflows",
        "collaboration",
        "debugging",
        "ondiem",
        "stonecrest"
      );
    }

    if (/\b(senior|seniority|junior|mid-level|mid level|level|career timeline|timeline|years|experience level)\b/.test(lowerQuestion)) {
      aliases.push(
        "professional",
        "experience",
        "background",
        "software",
        "engineer",
        "ondiem",
        "education",
        "projects"
      );
    }

    if (/\b(strengths?|strongest|good at|best at)\b/.test(lowerQuestion)) {
      aliases.push("strengths", "frontend", "vue", "full-stack", "product");
    }

    if (/\b(proud|proudest|most proud|favorite|favourite|best project|showcase)\b/.test(lowerQuestion)) {
      aliases.push(
        "strongest",
        "strengths",
        "project",
        "healthcare",
        "stonecrest",
        "full-stack",
        "backend",
        "frontend",
        "product"
      );
    }

    if (/\b(culture|fit|team|collaborat|communication|working style|work style|values|startup|ownership|pace|autonomy)\b/.test(lowerQuestion)) {
      aliases.push(
        "culture",
        "fit",
        "team",
        "collaboration",
        "communication",
        "ownership",
        "startup",
        "product",
        "debugging",
        "workflows"
      );
    }

    if (/\b(latest|newest|recent|most recent)\b/.test(lowerQuestion)) {
      aliases.push("everee", "rust", "payroll", "integration");
    }

    if (/\b(lead dev|lead developer|tech lead|lead engineer|leadership)\b/.test(lowerQuestion)) {
      aliases.push("component", "library", "workflows", "documentation", "product");
    }

    if (/\b(documents?|files?|file sync|document management|archive|records?|csv|imports?|exports?)\b/.test(lowerQuestion)) {
      aliases.push(
        "document",
        "workflow",
        "admin",
        "tooling",
        "automation",
        "data",
        "csv",
        "etl",
        "reporting",
        "api",
        "troubleshooting"
      );
    }

    if (/\b(frontend|front end|web developer|developr|designer|design)\b/.test(lowerQuestion)) {
      aliases.push("frontend", "vue", "react", "figma", "ui");
    }

    if (/\b(terminal|command line|cli|powershell|shell)\b/.test(lowerQuestion)) {
      aliases.push("docker", "powershell", "python", "script", "automation");
    }

    if (/\b(linux|ubuntu|wsl)\b/.test(lowerQuestion)) {
      aliases.push(
        "ubuntu",
        "wsl",
        "shell",
        "terminal",
        "docker",
        "home",
        "assistant",
        "automation",
        "development",
        "environment"
      );
    }

    if (/\b(education|school|schooling|college|degree|bachelor)\b/.test(lowerQuestion)) {
      aliases.push("education", "byu-idaho", "degree", "web development");
    }

    if (/\b(ai|a\.i\.|artificial intelligence|machine learning|ml|llm|ocr|automation|gpt|copilot)\b/.test(lowerQuestion)) {
      aliases.push("ai", "ai-assisted", "ocr", "document", "automation", "ondiem", "workflow");
    }

    return aliases;
  }

  buildSourceTokens(context) {
    const sourceProfile = context.sourceProfile || {};
    const sourceHints = [
      sourceProfile.role,
      sourceProfile.companySummary,
      sourceProfile.cultureSummary,
      sourceProfile.jobSummary,
      sourceProfile.jobDescription,
      ...(Array.isArray(sourceProfile.responsibilities)
        ? sourceProfile.responsibilities
        : []),
      ...(Array.isArray(sourceProfile.targetSkills)
        ? sourceProfile.targetSkills
        : []),
      ...(Array.isArray(sourceProfile.answerGuidance)
        ? sourceProfile.answerGuidance
        : []),
      ...(Array.isArray(sourceProfile.sortOverride)
        ? sourceProfile.sortOverride
        : []),
    ];

    return context.tokenize(sourceHints.join(" "));
  }

  shouldUseFollowUpContext(question, context) {
    if (!context.isFollowUpQuestion) {
      return false;
    }

    const lowerQuestion = String(question || "").toLowerCase();

    if (
      /\b(docker|linux|ubuntu|wsl|sharepoint|onedrive|microsoft graph|lawmatics|php|powershell|bash|sql|backend|frontend|education|school|degree)\b/.test(
        lowerQuestion
      )
    ) {
      return false;
    }

    return true;
  }

  getImmediateFollowUpContext(conversationContext) {
    return String(conversationContext || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-2)
      .join("\n");
  }

  buildQueryTokens(question, context) {
    const followUpContext = this.shouldUseFollowUpContext(question, context)
      ? this.getImmediateFollowUpContext(context.conversationContext)
      : "";

    return context.tokenize(
      [
        question,
        followUpContext,
        ...this.getQueryAliases(question),
      ].join(" ")
    );
  }

  shouldUseSourceTailoring(question) {
    const lowerQuestion = String(question || "").toLowerCase();
    const intents = this.classifyQuestion(question);

    if (
      intents.includes("direct_skill_or_tool") ||
      intents.includes("education") ||
      intents.includes("current_employer") ||
      /\b(sharepoint|onedrive|microsoft graph|lawmatics|linux|php|powershell|bash|sql|backend|frontend|education|school|degree)\b/.test(
        lowerQuestion
      ) ||
      /\b(experience with|type of .*experience|worked with|used|know|knows|direct experience)\b/.test(
        lowerQuestion
      )
    ) {
      return false;
    }

    return /\b(why|hire|hiring|candidate|fit|role|team|culture|summary|pitch|stand out|strengths?|background)\b/.test(
      lowerQuestion
    );
  }

  dedupeMatches(matches) {
    const seen = new Set();

    return matches.filter((match) => {
      const label =
        match.internalSource && match.type === "info"
          ? match.title
          : match.sourceLabel || match.title;
      const key = `${match.type}:${label}`.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  getChunkProjectId(chunk) {
    if (chunk.type === "project" && chunk.id) {
      return chunk.id;
    }

    const sourceUrl = String(chunk.sourceUrl || "");
    const match = sourceUrl.match(/\/projects\/([A-Za-z0-9_-]+)/);

    return match ? decodeURIComponent(match[1]) : "";
  }

  escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  redactUnsupportedToolTerms(text, toolExperienceAssessment) {
    const unsupportedTools = toolExperienceAssessment?.unsupportedTools || [];

    if (!unsupportedTools.length) {
      return text;
    }

    const supportedToolNames = new Set(
      (toolExperienceAssessment.supportedTools || []).map((item) => item.tool)
    );
    const strictUnsupportedOrUnprovenTools = [...this.strictPublicEvidenceTools]
      .filter((tool) => !supportedToolNames.has(tool));
    const toolsToRedact = [
      ...new Set([...unsupportedTools, ...strictUnsupportedOrUnprovenTools]),
    ];

    return toolsToRedact.reduce((cleanText, tool) => {
      const pattern = new RegExp(`\\b${this.escapeRegExp(tool)}\\b`, "gi");

      return cleanText.replace(pattern, "[unsupported requested tool]");
    }, text);
  }

  isSourceProjectCapped(chunk, context) {
    if (!context.sourceProfile) {
      return false;
    }

    const projectId = this.getChunkProjectId(chunk);

    return projectId && (context.recentProjectCounts || {})[projectId] >= 2;
  }

  scoreChunk(chunk, queryTokens, context) {
    const baseScore = context.scoreChunk(chunk, queryTokens);
    const sourceProfile = context.sourceProfile || {};
    const sourceProjectIndex = Array.isArray(sourceProfile.sortOverride)
      ? sourceProfile.sortOverride.indexOf(chunk.id)
      : -1;
    const sourceProjectBoost =
      context.sourceTailoringEnabled && sourceProjectIndex >= 0
        ? Math.max(10, 54 - sourceProjectIndex * 7)
        : 0;
    const recentProjectMentions = new Set(context.repeatPenaltyProjectIds || []);
    const recentProjectCounts = context.recentProjectCounts || {};
    const sourceUrl = String(chunk.sourceUrl || "").toLowerCase();
    const isRepeatedProjectEvidence =
      chunk.type === "project" && recentProjectMentions.has(chunk.id);
    const repeatedLinkedProjectId = [...recentProjectMentions].find(
      (projectId) => {
        const route = `/projects/${encodeURIComponent(projectId).toLowerCase()}`;

        return sourceUrl.includes(route);
      }
    );
    const repeatedProjectId = isRepeatedProjectEvidence
      ? chunk.id
      : repeatedLinkedProjectId;
    const repeatedProjectCount = repeatedProjectId
      ? recentProjectCounts[repeatedProjectId] || 1
      : 0;
    const repeatedProjectPenalty =
      repeatedProjectCount >= 2 ? 132 : repeatedProjectCount === 1 ? 58 : 0;
    const sourceText = `${chunk.title || ""} ${chunk.sourceLabel || ""}`.toLowerCase();
    const tagBoost = (chunk.tags || []).some((tag) =>
      context.tokenize(tag).some((tagToken) => queryTokens.includes(tagToken))
    )
      ? 10
      : 0;

    if (/\beducation|school|degree|bachelor\b/i.test(queryTokens.join(" "))) {
      return /\beducation\b/.test(sourceText)
        ? baseScore + tagBoost + sourceProjectBoost - repeatedProjectPenalty + 12
        : baseScore + tagBoost + sourceProjectBoost - repeatedProjectPenalty;
    }

    return baseScore + tagBoost + sourceProjectBoost - repeatedProjectPenalty;
  }

  retrieve(question, context, limit = 6) {
    const questionIntents = this.classifyQuestion(question);
    const queryTokens = this.buildQueryTokens(question, context);
    const sourceTailoringEnabled = this.shouldUseSourceTailoring(question);
    const scoringContext = {
      ...context,
      sourceTailoringEnabled,
    };
    const scoringTokens = [
      ...new Set([
        ...queryTokens,
        ...(sourceTailoringEnabled ? this.buildSourceTokens(context) : []),
      ]),
    ];
    const knowledge = context.buildKnowledge();
    const allScored = knowledge
      .map((chunk) => ({
        ...chunk,
        score: this.scoreChunk(chunk, scoringTokens, scoringContext),
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
      .filter((chunk) => !this.isSourceProjectCapped(chunk, context))
      .sort(
        (a, b) =>
          b.score - a.score ||
          this.getTypePriority(b.type) - this.getTypePriority(a.type)
      );
    const alwaysIncludedMatches = allScored.filter((chunk) => chunk.alwaysInclude);

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
      ...alwaysIncludedMatches,
      ...botInfoMatches,
      ...portfolioMatches,
    ]).slice(0, limit + alwaysIncludedMatches.length);
    const toolExperienceAssessment = this.buildToolExperienceAssessment(
      question,
      matches
    );

    return {
      questionIntents,
      queryTokens,
      sourceTailoringEnabled,
      matches,
      toolExperienceAssessment,
      topCandidates,
      knowledgeStats: context.getKnowledgeStats(),
    };
  }

  formatEvidence(matches, context, toolExperienceAssessment = null) {
    return matches
      .map((match) => {
        const excerpt = this.redactUnsupportedToolTerms(
          context.convertFirstPersonToThirdPerson(
            context.trimToSentence(match.text, 700)
          ),
          toolExperienceAssessment
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
    const {
      questionIntents,
      queryTokens,
      sourceTailoringEnabled,
      matches,
      toolExperienceAssessment,
      topCandidates,
      knowledgeStats,
    } =
      this.retrieve(question, context);

    return {
      answer: matches.length
        ? this.formatEvidence(matches, context, toolExperienceAssessment)
        : "",
      debug: {
        provider: this.name,
        privateInfoBlocked: false,
        questionIntents,
        queryTokenCount: queryTokens.length,
        queryTokens,
        sourceTailoringEnabled,
        toolExperienceAssessment,
        matchCount: matches.length,
        matches: matches.map((match) => ({
          id: match.id || "",
          title: match.title,
          type: match.type,
          source: match.sourceLabel || match.title,
          sourceUrl: match.sourceUrl || "",
          internalSource: match.internalSource || "",
          alwaysInclude: Boolean(match.alwaysInclude),
          score: match.score,
          evidencePreview: context.trimToSentence(match.text, 360),
          tags: match.tags || [],
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
      questionIntents: evidenceResult.debug.questionIntents,
      queryTokenCount: evidenceResult.debug.queryTokenCount,
      queryTokens: evidenceResult.debug.queryTokens,
      sourceTailoringEnabled: evidenceResult.debug.sourceTailoringEnabled,
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
