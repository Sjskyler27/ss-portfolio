<template>
  <div class="skyler-bot" :class="{ open: isOpen }">
    <Transition name="skyler-bot-panel">
      <section
        v-if="isOpen"
        class="skyler-bot-panel"
        :style="panelStyle"
        aria-label="Skyler Bot chat"
      >
        <button
          type="button"
          class="skyler-bot-resize-handle"
          aria-label="Resize chat"
          title="Resize chat"
          @pointerdown="startPanelResize"
          @keydown="resizePanelWithKeyboard"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 3h8v2H5v6H3V3Zm4 4h6v2H9v4H7V7Z" />
          </svg>
        </button>
        <header class="skyler-bot-header">
          <div class="skyler-bot-title">
            <span class="skyler-bot-avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path
                  d="M4.8 6.6c0-2 1.7-3.6 3.8-3.6h6.8c2.1 0 3.8 1.6 3.8 3.6v4.9c0 2-1.7 3.6-3.8 3.6h-4.3l-4.8 3.3v-3.5c-1-.6-1.5-1.8-1.5-3.1V6.6Z"
                />
              </svg>
            </span>
            <span>Skyler Bot</span>
            <small>Ask about work, projects, and skills</small>
          </div>
        </header>

        <TransitionGroup
          ref="messageList"
          name="skyler-bot-message-list"
          tag="div"
          class="skyler-bot-messages"
          aria-live="polite"
        >
          <article
            v-for="message in messages"
            :key="message.id"
            :class="['skyler-bot-message', message.role]"
          >
            <p>
              <template
                v-for="(part, index) in getMessageParts(message.text)"
                :key="`${message.id}-${index}`"
              >
                <a
                  v-if="part.href"
                  :href="part.href"
                  :target="part.external ? '_blank' : null"
                  :rel="part.external ? 'noreferrer' : null"
                >
                  {{ part.text }}
                </a>
                <span v-else>{{ part.text }}</span>
              </template>
            </p>
            <time :datetime="message.createdAt">
              {{ formatMessageTime(message.createdAt) }}
            </time>
          </article>

          <article
            v-if="isLoading"
            key="skyler-bot-loading"
            class="skyler-bot-message bot loading"
            aria-label="Skyler Bot is writing"
          >
            <span class="typing-dots" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <time :datetime="loadingStartedAt">
              {{ formatMessageTime(loadingStartedAt) }}
            </time>
          </article>
        </TransitionGroup>

        <div
          v-if="showSuggestions"
          class="skyler-bot-suggestions"
          role="group"
          aria-label="Suggested questions"
        >
          <button
            v-for="(suggestion, index) in suggestedQuestions"
            :key="`suggestion-${index}`"
            type="button"
            class="skyler-bot-suggestion"
            :disabled="isLoading"
            @click="askSuggested(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>

        <form class="skyler-bot-form" @submit.prevent="sendMessage">
          <div class="skyler-bot-input-wrap" :style="textareaStyle">
            <button
              type="button"
              class="skyler-bot-input-resize-handle"
              aria-label="Resize message input"
              title="Resize message input"
              @pointerdown="startTextareaResize"
              @keydown="resizeTextareaWithKeyboard"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3h8v2H5v6H3V3Zm4 4h6v2H9v4H7V7Z" />
              </svg>
            </button>
            <textarea
              v-model.trim="draft"
              rows="2"
              maxlength="250"
              :disabled="isLoading"
              placeholder="Ask about Skyler's experience..."
              @input="sanitizeDraft"
              @keydown.enter.exact.prevent="sendMessage"
            />
          </div>
          <button type="submit" :disabled="!canSend || isLoading">
            <span
              v-if="isLoading"
              class="send-loading"
              aria-hidden="true"
            ></span>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 12h14.2l-5.1-5.1 1.4-1.4L22 13l-7.5 7.5-1.4-1.4 5.1-5.1H4v-2Z"
              />
            </svg>
            <span class="sr-only">{{ isLoading ? 'Sending' : 'Send' }}</span>
          </button>
          <p v-if="draftError" class="skyler-bot-form-error">
            {{ draftError }}
          </p>
        </form>
      </section>
    </Transition>

    <Transition name="skyler-bot-intro">
      <button
        v-if="showIntroPrompt"
        type="button"
        class="skyler-bot-intro"
        :class="{ exiting: isIntroPromptExiting }"
        aria-label="Open Skyler Bot"
        @click="openChatFromIntro"
      >
        <strong>I'm Skyler's chat bot.</strong>
        <span>Have a question about him? Ask me.</span>
      </button>
    </Transition>

    <button
      type="button"
      class="skyler-bot-toggle"
      :aria-expanded="isOpen.toString()"
      aria-label="Open Skyler Bot"
      @click="toggleChat"
    >
      <svg v-if="!isOpen" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4.8 6.6c0-2 1.7-3.6 3.8-3.6h6.8c2.1 0 3.8 1.6 3.8 3.6v4.9c0 2-1.7 3.6-3.8 3.6h-4.3l-4.8 3.3v-3.5c-1-.6-1.5-1.8-1.5-3.1V6.6Z"
        />
        <circle cx="9" cy="9.2" r="1.1" />
        <circle cx="12" cy="9.2" r="1.1" />
        <circle cx="15" cy="9.2" r="1.1" />
      </svg>
      <span v-else aria-hidden="true">&times;</span>
    </button>
  </div>
</template>

<script>
import { getCurrentSource } from '../services/sourceInfo';

const storageKey = 'skyler-bot-chat-history';
const introPromptStorageKey = 'skyler-bot-intro-seen';
const disableDiscordWebhookKey = 'disable_discord_webhook';
const rateLimitKey = 'skyler-bot-rate-history';
const maxQuestionLength = 250;
const allowedQuestionPattern = /^[A-Za-z0-9 .,?!'"/&():-]*$/;
const disallowedQuestionChars = /[^A-Za-z0-9 .,?!'"/&():-]/g;
const projectLinkPattern = /\/projects\/([A-Za-z0-9_-]+)/g;
// Map smart punctuation (mobile auto-insert) to ASCII so it is kept, not stripped.
const smartPunctuationReplacements = [
  [/[‘’‚‛]/g, "'"],
  [/[“”„‟]/g, '"'],
  [/[–—]/g, '-'],
  [/…/g, '...'],
];

function normalizeSmartPunctuation(value) {
  return smartPunctuationReplacements.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  );
}
// Recruiter-facing prompts that produce Skyler's strongest, best-cited answers.
const suggestedQuestions = [
  'What makes Skyler stand out as a candidate?',
  'What impact has Skyler had in his current role?',
  "What is Skyler's most impressive project?",
];
const maxMessagesPerMinute = 10;
const maxMessagesPerDay = 35;
const maxConversationContextMessages = 6;
const maxRecentProjectMemoryMessages = 20;
const maxConversationContextTextLength = 260;
const dailyWarningThreshold = Math.ceil(maxMessagesPerDay / 2);
const minuteMs = 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;
const introPromptDelayMs = 900;
const introPromptVisibleMs = 5200;
const introPromptExitMs = 720;

const welcomeMessage = {
  id: 'welcome',
  role: 'bot',
  createdAt: new Date().toISOString(),
  text: "Hi, I am Skyler Bot. I can answer questions about Skyler's work history, projects, skills, and portfolio details.",
};

function createMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    createdAt: new Date().toISOString(),
  };
}

function cleanConversationContextText(value) {
  const cleanText = normalizeSmartPunctuation(String(value || ''))
    .replace(disallowedQuestionChars, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanText.length <= maxConversationContextTextLength) {
    return cleanText;
  }

  return `${cleanText.slice(0, 130).trim()} ... ${cleanText
    .slice(-120)
    .trim()}`;
}

function getProjectIdsFromText(value) {
  const ids = new Set();
  const text = String(value || '');

  projectLinkPattern.lastIndex = 0;
  let match = projectLinkPattern.exec(text);

  while (match) {
    ids.add(decodeURIComponent(match[1]));
    match = projectLinkPattern.exec(text);
  }

  return [...ids];
}

function getProjectCountsFromMessages(messages) {
  return messages.reduce((counts, message) => {
    getProjectIdsFromText(message.text).forEach((projectId) => {
      counts[projectId] = (counts[projectId] || 0) + 1;
    });

    return counts;
  }, {});
}

function isSafeMessageHref(href) {
  return (
    href.startsWith('/') ||
    href.startsWith('https://') ||
    href.startsWith('http://')
  );
}

function readRateHistory() {
  try {
    const parsed = JSON.parse(getStoredValue(rateLimitKey) || '[]');

    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === 'number')
      : [];
  } catch (error) {
    return [];
  }
}

function getStoredValue(key) {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(key) || '';
  } catch (error) {
    console.warn('[SkylerBot] localStorage read failed', {
      key,
      message: error.message,
    });
    return '';
  }
}

function setStoredValue(key, value) {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn('[SkylerBot] localStorage write failed', {
      key,
      message: error.message,
    });
    return false;
  }
}

export default {
  name: 'SkylerBot',
  data() {
    return {
      isOpen: false,
      isLoading: false,
      loadingStartedAt: '',
      draft: '',
      draftError: '',
      messages: [],
      panelSize: {
        width: 392,
        height: 540,
      },
      textareaHeight: 44,
      resizeState: null,
      textareaResizeState: null,
      showIntroPrompt: false,
      isIntroPromptExiting: false,
      introPromptTimers: [],
      suggestedQuestions,
    };
  },
  created() {
    this.messages = this.loadMessages();
  },
  mounted() {
    this.scheduleIntroPrompt();
  },
  beforeUnmount() {
    this.clearIntroPromptTimers();
    this.stopPanelResize();
    this.stopTextareaResize();
    this.stopOutsideClickListener();
  },
  computed: {
    panelStyle() {
      return {
        width: `${this.panelSize.width}px`,
        height: `${this.panelSize.height}px`,
      };
    },
    textareaStyle() {
      return {
        height: `${this.textareaHeight}px`,
      };
    },
    canSend() {
      return (
        Boolean(this.draft.trim()) &&
        this.draft.length <= maxQuestionLength &&
        allowedQuestionPattern.test(this.draft)
      );
    },
    showSuggestions() {
      return (
        !this.isLoading &&
        !this.messages.some((message) => message.role === 'user')
      );
    },
  },
  watch: {
    isOpen(isOpen) {
      if (isOpen) {
        this.startOutsideClickListener();
        this.scrollMessagesToEnd();
        return;
      }

      this.stopOutsideClickListener();
    },
    messages: {
      deep: true,
      handler() {
        this.saveMessages();
      },
    },
  },
  methods: {
    askSuggested(question) {
      if (this.isLoading) {
        return;
      }

      this.draft = question;
      this.draftError = '';
      this.sendMessage();
    },
    toggleChat() {
      this.isOpen = !this.isOpen;

      if (this.isOpen) {
        this.dismissIntroPrompt({ animate: false });
      }
    },
    openChatFromIntro() {
      this.dismissIntroPrompt({ animate: false });
      this.isOpen = true;
    },
    scheduleIntroPrompt() {
      if (getStoredValue(introPromptStorageKey) || this.isOpen) {
        return;
      }

      this.introPromptTimers.push(
        window.setTimeout(() => {
          if (this.isOpen || getStoredValue(introPromptStorageKey)) {
            return;
          }

          this.showIntroPrompt = true;
          this.introPromptTimers.push(
            window.setTimeout(() => {
              this.dismissIntroPrompt({ animate: true });
            }, introPromptVisibleMs),
          );
        }, introPromptDelayMs),
      );
    },
    dismissIntroPrompt({ animate }) {
      setStoredValue(introPromptStorageKey, '1');

      if (!this.showIntroPrompt) {
        this.clearIntroPromptTimers();
        return;
      }

      this.clearIntroPromptTimers();

      if (!animate) {
        this.showIntroPrompt = false;
        this.isIntroPromptExiting = false;
        return;
      }

      this.isIntroPromptExiting = true;
      this.introPromptTimers.push(
        window.setTimeout(() => {
          this.showIntroPrompt = false;
          this.isIntroPromptExiting = false;
        }, introPromptExitMs),
      );
    },
    clearIntroPromptTimers() {
      this.introPromptTimers.forEach((timer) => window.clearTimeout(timer));
      this.introPromptTimers = [];
    },
    startOutsideClickListener() {
      if (typeof document === 'undefined') {
        return;
      }

      document.addEventListener('pointerdown', this.closeChatOnOutsideClick);
    },
    stopOutsideClickListener() {
      if (typeof document === 'undefined') {
        return;
      }

      document.removeEventListener('pointerdown', this.closeChatOnOutsideClick);
    },
    closeChatOnOutsideClick(event) {
      if (!this.isOpen || this.$el?.contains(event.target)) {
        return;
      }

      this.isOpen = false;
    },
    async sendMessage() {
      const question = this.draft.trim();

      if (!question || this.isLoading || !this.canSend) {
        this.sanitizeDraft();
        return;
      }

      const rateLimit = this.checkClientRateLimit();

      if (!rateLimit.allowed) {
        this.draftError = rateLimit.message;
        return;
      }

      const dailyMessageCount = this.recordClientRateHit();
      const conversationContext = this.getConversationContext();
      const recentProjectIds = this.getRecentProjectIds();
      const recentProjectCounts = this.getRecentProjectCounts();
      this.messages.push(createMessage('user', question));

      if (dailyMessageCount === dailyWarningThreshold) {
        this.messages.push(
          createMessage(
            'bot',
            `Heads up: you've used ${dailyMessageCount} of today's ${maxMessagesPerDay} Skyler Bot messages.`,
          ),
        );
      }

      this.draft = '';
      this.isLoading = true;
      this.loadingStartedAt = new Date().toISOString();
      this.scrollMessagesToEnd();

      try {
        const startedAt = performance.now();
        const response = await fetch('/.netlify/functions/skyler-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            conversationContext,
            recentProjectIds,
            recentProjectCounts,
            source: getCurrentSource(),
            disableDiscordWebhook: this.isDiscordWebhookDisabled(),
          }),
        });
        const payload = await response.json();
        const elapsedMs = Math.round(performance.now() - startedAt);

        console.debug('[SkylerBot] response', {
          requestId:
            payload.requestId ||
            response.headers.get('x-skyler-bot-request-id'),
          status: response.status,
          elapsedMs,
          debug: payload.debug,
        });

        if (!response.ok) {
          this.messages.push(
            createMessage(
              'bot',
              payload.answer ||
                payload.error ||
                "That question cannot be answered by Skyler Bot. Try asking about Skyler's work, projects, skills, or education.",
            ),
          );
          return;
        }

        this.messages.push(
          createMessage(
            'bot',
            payload.answer ||
              'I could not find a good answer in the portfolio context yet.',
          ),
        );
      } catch (error) {
        console.error('[SkylerBot] request failed', {
          message: error.message,
          questionLength: question.length,
        });
        this.messages.push(
          createMessage(
            'bot',
            'I could not reach the portfolio knowledge base. Please try again in a moment.',
          ),
        );
      } finally {
        this.isLoading = false;
        this.loadingStartedAt = '';
        this.scrollMessagesToEnd();
      }
    },
    loadMessages() {
      try {
        const storedMessages = JSON.parse(getStoredValue(storageKey) || '[]');

        if (!Array.isArray(storedMessages) || !storedMessages.length) {
          return [createMessage(welcomeMessage.role, welcomeMessage.text)];
        }

        const validMessages = storedMessages
          .filter(
            (message) =>
              message &&
              ['bot', 'user'].includes(message.role) &&
              typeof message.text === 'string',
          )
          .map((message) => ({
            id: message.id || `${message.role}-${Date.now()}`,
            role: message.role,
            text: message.text,
            createdAt: message.createdAt || new Date().toISOString(),
          }));

        return validMessages.length
          ? validMessages
          : [createMessage(welcomeMessage.role, welcomeMessage.text)];
      } catch (error) {
        console.warn('[SkylerBot] could not load stored chat history', {
          message: error.message,
        });
        return [createMessage(welcomeMessage.role, welcomeMessage.text)];
      }
    },
    saveMessages() {
      setStoredValue(storageKey, JSON.stringify(this.messages.slice(-40)));
    },
    getConversationContext() {
      return this.messages
        .filter(
          (message) =>
            message &&
            ['bot', 'user'].includes(message.role) &&
            message.id !== welcomeMessage.id &&
            message.text !== welcomeMessage.text,
        )
        .slice(-maxConversationContextMessages)
        .map((message) => ({
          role: message.role,
          text: cleanConversationContextText(message.text),
        }))
        .filter((message) => message.text);
    },
    getRecentProjectIds() {
      return Object.keys(this.getRecentProjectCounts()).slice(-6);
    },
    getRecentProjectCounts() {
      const counts = getProjectCountsFromMessages(
        this.messages.slice(-maxRecentProjectMemoryMessages),
      );

      return Object.fromEntries(
        Object.entries(counts)
          .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
          .slice(0, 8),
      );
    },
    sanitizeDraft() {
      const nextDraft = normalizeSmartPunctuation(this.draft)
        .replace(disallowedQuestionChars, '')
        .slice(0, maxQuestionLength);

      if (nextDraft !== this.draft) {
        this.draft = nextDraft;
        this.draftError =
          'Questions can use letters, numbers, spaces, and basic punctuation.';
        return;
      }

      this.draftError =
        this.draft.length >= maxQuestionLength
          ? 'Questions must be 250 characters or fewer.'
          : '';
    },
    checkClientRateLimit() {
      const now = Date.now();
      const recent = readRateHistory().filter((ts) => now - ts < dayMs);
      const inLastMinute = recent.filter((ts) => now - ts < minuteMs).length;

      if (inLastMinute >= maxMessagesPerMinute) {
        return {
          allowed: false,
          message: `You can send up to ${maxMessagesPerMinute} messages per minute. Please wait a moment.`,
        };
      }

      if (recent.length >= maxMessagesPerDay) {
        return {
          allowed: false,
          message: `You've reached the daily limit of ${maxMessagesPerDay} messages. Please check back tomorrow.`,
        };
      }

      return { allowed: true };
    },
    recordClientRateHit() {
      const now = Date.now();
      const recent = readRateHistory().filter((ts) => now - ts < dayMs);

      recent.push(now);
      setStoredValue(rateLimitKey, JSON.stringify(recent));

      return recent.length;
    },
    isDiscordWebhookDisabled() {
      return Boolean(getStoredValue(disableDiscordWebhookKey));
    },
    formatMessageTime(value) {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return '';
      }

      return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    },
    getMessageParts(text) {
      const parts = [];
      const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      let lastIndex = 0;
      let match = linkPattern.exec(text);

      while (match) {
        const [fullMatch, label] = match;
        // Trim whitespace the model sometimes adds inside the parens, e.g.
        // "[label]( /projects/x )", which would otherwise fail the safe-href check.
        const href = match[2].trim();

        if (match.index > lastIndex) {
          parts.push({
            text: text.slice(lastIndex, match.index),
            href: '',
          });
        }

        if (isSafeMessageHref(href)) {
          parts.push({
            text: label.trim(),
            href,
            external: href.startsWith('http://') || href.startsWith('https://'),
          });
        } else {
          parts.push({
            text: fullMatch,
            href: '',
          });
        }

        lastIndex = match.index + fullMatch.length;
        match = linkPattern.exec(text);
      }

      if (lastIndex < text.length) {
        parts.push({
          text: text.slice(lastIndex),
          href: '',
        });
      }

      return parts.length ? parts : [{ text, href: '' }];
    },
    getPanelSizeBounds() {
      if (typeof window === 'undefined') {
        return {
          minWidth: 320,
          minHeight: 420,
          maxWidth: 392,
          maxHeight: 540,
        };
      }

      return {
        minWidth: 320,
        minHeight: 420,
        maxWidth: Math.max(320, window.innerWidth - 28),
        maxHeight: Math.max(420, window.innerHeight - 112),
      };
    },
    clampPanelSize(width, height) {
      const bounds = this.getPanelSizeBounds();

      return {
        width: Math.min(Math.max(width, bounds.minWidth), bounds.maxWidth),
        height: Math.min(Math.max(height, bounds.minHeight), bounds.maxHeight),
      };
    },
    clampTextareaHeight(height) {
      return Math.min(Math.max(height, 44), 140);
    },
    startPanelResize(event) {
      if (typeof window === 'undefined' || event.pointerType === 'touch') {
        return;
      }

      event.preventDefault();

      this.resizeState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: this.panelSize.width,
        startHeight: this.panelSize.height,
      };

      document.body.classList.add('skyler-bot-resizing');
      event.currentTarget.setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove', this.resizePanel);
      window.addEventListener('pointerup', this.stopPanelResize);
      window.addEventListener('pointercancel', this.stopPanelResize);
    },
    resizePanel(event) {
      if (!this.resizeState || event.pointerId !== this.resizeState.pointerId) {
        return;
      }

      const nextSize = this.clampPanelSize(
        this.resizeState.startWidth + this.resizeState.startX - event.clientX,
        this.resizeState.startHeight + this.resizeState.startY - event.clientY,
      );

      this.panelSize = nextSize;
    },
    resizePanelWithKeyboard(event) {
      const step = event.shiftKey ? 40 : 16;
      const directions = {
        ArrowLeft: [step, 0],
        ArrowUp: [0, step],
        ArrowRight: [-step, 0],
        ArrowDown: [0, -step],
      };
      const direction = directions[event.key];

      if (!direction) {
        return;
      }

      event.preventDefault();

      this.panelSize = this.clampPanelSize(
        this.panelSize.width + direction[0],
        this.panelSize.height + direction[1],
      );
    },
    stopPanelResize() {
      if (typeof window === 'undefined') {
        return;
      }

      this.resizeState = null;
      document.body.classList.remove('skyler-bot-resizing');
      window.removeEventListener('pointermove', this.resizePanel);
      window.removeEventListener('pointerup', this.stopPanelResize);
      window.removeEventListener('pointercancel', this.stopPanelResize);
    },
    startTextareaResize(event) {
      if (typeof window === 'undefined' || event.pointerType === 'touch') {
        return;
      }

      event.preventDefault();

      this.textareaResizeState = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startHeight: this.textareaHeight,
      };

      document.body.classList.add('skyler-bot-input-resizing');
      event.currentTarget.setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove', this.resizeTextarea);
      window.addEventListener('pointerup', this.stopTextareaResize);
      window.addEventListener('pointercancel', this.stopTextareaResize);
    },
    resizeTextarea(event) {
      if (
        !this.textareaResizeState ||
        event.pointerId !== this.textareaResizeState.pointerId
      ) {
        return;
      }

      this.textareaHeight = this.clampTextareaHeight(
        this.textareaResizeState.startHeight +
          this.textareaResizeState.startY -
          event.clientY,
      );
    },
    resizeTextareaWithKeyboard(event) {
      const step = event.shiftKey ? 24 : 8;
      const directions = {
        ArrowUp: step,
        ArrowDown: -step,
      };
      const direction = directions[event.key];

      if (!direction) {
        return;
      }

      event.preventDefault();
      this.textareaHeight = this.clampTextareaHeight(
        this.textareaHeight + direction,
      );
    },
    stopTextareaResize() {
      if (typeof window === 'undefined') {
        return;
      }

      this.textareaResizeState = null;
      document.body.classList.remove('skyler-bot-input-resizing');
      window.removeEventListener('pointermove', this.resizeTextarea);
      window.removeEventListener('pointerup', this.stopTextareaResize);
      window.removeEventListener('pointercancel', this.stopTextareaResize);
    },
    scrollMessagesToEnd() {
      this.$nextTick(() => {
        const messageList = this.$refs.messageList?.$el;

        if (messageList) {
          messageList.scrollTop = messageList.scrollHeight;
        }
      });
    },
  },
};
</script>

<style scoped lang="scss">
.skyler-bot {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.skyler-bot-panel {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(392px, calc(100vw - 28px));
  height: min(540px, calc(100vh - 112px));
  min-width: 320px;
  min-height: 420px;
  max-width: calc(100vw - 28px);
  max-height: calc(100vh - 112px);
  overflow: hidden;
  border: 1px solid rgba(38, 113, 111, 0.18);
  border-radius: 8px;
  background: linear-gradient(
    180deg,
    rgba(255, 250, 244, 0.98),
    rgba(237, 247, 246, 0.98)
  );
  box-shadow: 0 24px 70px rgba(18, 74, 128, 0.26);
  backdrop-filter: blur(12px);
}

.skyler-bot-resize-handle {
  position: absolute;
  top: -1px;
  left: -1px;
  z-index: 2;
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(241, 143, 85, 0.5);
  border-radius: 8px 0 8px 0px;
  background: rgba(255, 250, 244, 0.96);
  color: #a3442f;
  box-shadow: 0 10px 24px rgba(163, 68, 47, 0.16);
  cursor: nwse-resize;
  touch-action: none;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;
}

.skyler-bot-resize-handle:hover,
.skyler-bot-resize-handle:focus-visible {
  background: #f18f55;
  color: #124a80;
  outline: none;
  transform: translate(-1px, -1px);
}

.skyler-bot-resize-handle svg {
  width: 17px;
  height: 17px;
  fill: currentColor;
}

:global(.skyler-bot-resizing) {
  cursor: nwse-resize;
  user-select: none;
}

.skyler-bot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid rgba(38, 113, 111, 0.14);
  background: rgba(255, 250, 244, 0.74);
  color: #124a80;
  padding: 14px;
}

.skyler-bot-title {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  column-gap: 10px;
  align-items: center;
}

.skyler-bot-avatar {
  grid-row: span 2;
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 247, 237, 0.8);
  color: #124a80;
}

.skyler-bot-avatar svg {
  width: 21px;
  height: 21px;
  fill: currentColor;
}

.skyler-bot-title > span:not(.skyler-bot-avatar) {
  display: block;
  font-size: 16px;
  font-weight: 800;
}

.skyler-bot-header small {
  display: block;
  color: #6b6474;
  font-size: 12px;
}

.skyler-bot-header button,
.skyler-bot-toggle,
.skyler-bot-form > button {
  border: 0;
  cursor: pointer;
  font-weight: 800;
}

.skyler-bot-header button {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(18, 74, 128, 0.08);
  color: #124a80;
  font-size: 24px;
  line-height: 1;
}

.skyler-bot-messages {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 16px 14px;
}

.skyler-bot-message {
  max-width: 88%;
  border-radius: 8px;
  padding: 11px 13px;
  transform-origin: bottom;
}

.skyler-bot-message p {
  margin: 0;
  white-space: pre-line;
  font-size: 14px;
  line-height: 1.45;
}

.skyler-bot-message a {
  color: #a3442f;
  font-weight: 800;
  text-decoration-color: rgba(163, 68, 47, 0.36);
  text-underline-offset: 3px;
}

.skyler-bot-message.user a {
  color: #ffffff;
  text-decoration-color: rgba(255, 255, 255, 0.54);
}

.skyler-bot-message time {
  display: block;
  margin-top: 7px;
  color: #7b7683;
  font-size: 11px;
  line-height: 1;
}

.skyler-bot-message.bot {
  align-self: flex-start;
  border: 1px solid rgba(38, 113, 111, 0.12);
  background: rgba(255, 255, 255, 0.72);
  color: #213136;
  box-shadow: 0 8px 18px rgba(18, 74, 128, 0.06);
}

.skyler-bot-message.user {
  align-self: flex-end;
  background: rgba(255, 247, 237, 0.8);
  color: #124a80;
}

.skyler-bot-message.user time {
  color: rgba(18, 74, 128, 0.66);
}

.skyler-bot-message.loading {
  min-width: 74px;
}

.typing-dots {
  display: inline-flex;
  height: 20px;
  align-items: center;
  gap: 4px;
  padding: 2px 1px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #124a80;
  animation: skyler-bot-typing 1s ease-in-out infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 140ms;
}

.typing-dots span:nth-child(3) {
  animation-delay: 280ms;
}

.skyler-bot-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-top: 1px solid rgba(38, 113, 111, 0.14);
  background: rgba(255, 250, 244, 0.5);
  padding: 12px 12px 0;
}

.skyler-bot-suggestion {
  border: 1px solid rgba(38, 113, 111, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  color: #124a80;
  padding: 7px 12px;
  font-family: inherit;
  font-size: 12.5px;
  line-height: 1.2;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease,
    transform 160ms ease;
}

.skyler-bot-suggestion:hover:not(:disabled) {
  background: #f18f55;
  color: #124a80;
  border-color: #f18f55;
  transform: translateY(-1px);
}

.skyler-bot-suggestion:disabled {
  opacity: 0.55;
  cursor: default;
}

.skyler-bot-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 56px;
  gap: 8px;
  border-top: 1px solid rgba(38, 113, 111, 0.18);
  background: rgba(255, 250, 244, 0.82);
  padding: 12px;
}

.skyler-bot-input-wrap {
  position: relative;
  min-height: 44px;
  overflow: hidden;
  border-radius: 8px;
}

.skyler-bot-input-wrap textarea {
  width: 100%;
  height: 100%;
  resize: none;
  border: 1px solid rgba(38, 113, 111, 0.2);
  border-radius: 8px;
  background: #ffffff;
  color: #213136;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.35;
  padding: 13px 12px 10px 18px;
}

.skyler-bot-input-wrap textarea:focus {
  border-color: #124a80;
  outline: 2px solid rgba(18, 74, 128, 0.22);
  outline-offset: 1px;
}

.skyler-bot-input-resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  display: inline-flex;
  width: 17px;
  height: 17px;
  min-height: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(241, 143, 85, 0.5);
  border-radius: 8px 0 8px 0;
  background: rgba(255, 250, 244, 0.96);
  color: #a3442f;
  line-height: 1;
  padding: 0;
  box-shadow: 0 8px 16px rgba(163, 68, 47, 0.12);
  cursor: ns-resize;
  touch-action: none;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;
}

.skyler-bot-input-resize-handle:hover,
.skyler-bot-input-resize-handle:focus-visible {
  background: #f18f55;
  color: #124a80;
  outline: none;
}

.skyler-bot-input-resize-handle svg {
  width: 11px;
  height: 11px;
  fill: currentColor;
}

:global(.skyler-bot-input-resizing) {
  cursor: ns-resize;
  user-select: none;
}

.skyler-bot-form > button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 247, 237, 0.8);
  color: #124a80;
  transition: background 160ms ease, transform 160ms ease;
}

.skyler-bot-form > button svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
}

.send-loading {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(18, 74, 128, 0.24);
  border-top-color: #124a80;
  border-radius: 50%;
  animation: skyler-bot-spin 720ms linear infinite;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.skyler-bot-form > button:not(:disabled):hover {
  background: rgba(255, 247, 237, 0.8);
  transform: translateY(-1px);
}

.skyler-bot-form > button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.skyler-bot-form-error {
  grid-column: 1 / -1;
  margin: -2px 2px 0;
  color: #a3442f;
  font-size: 12px;
  line-height: 1.3;
}

.skyler-bot-intro {
  position: absolute;
  right: 0;
  bottom: 74px;
  width: min(256px, calc(100vw - 44px));
  border: 1px solid rgba(38, 113, 111, 0.16);
  border-radius: 8px;
  background: rgba(255, 250, 244, 0.96);
  color: #213136;
  box-shadow: 0 18px 44px rgba(18, 74, 128, 0.2);
  font-family: inherit;
  line-height: 1.35;
  padding: 13px 15px 14px;
  text-align: left;
  transform-origin: calc(100% - 29px) calc(100% + 45px);
  transition: border-color 180ms ease, box-shadow 180ms ease,
    transform 180ms ease;
}

.skyler-bot-intro::after {
  content: '';
  position: absolute;
  right: 21px;
  bottom: -8px;
  width: 14px;
  height: 14px;
  border-right: 1px solid rgba(38, 113, 111, 0.16);
  border-bottom: 1px solid rgba(38, 113, 111, 0.16);
  background: rgba(255, 250, 244, 0.96);
  transform: rotate(45deg);
}

.skyler-bot-intro:hover,
.skyler-bot-intro:focus-visible {
  border-color: rgba(241, 143, 85, 0.55);
  box-shadow: 0 20px 48px rgba(163, 68, 47, 0.22);
  outline: none;
  transform: translateY(-2px);
}

.skyler-bot-intro strong,
.skyler-bot-intro span {
  position: relative;
  z-index: 1;
  display: block;
}

.skyler-bot-intro strong {
  color: #124a80;
  font-size: 14px;
  font-weight: 800;
}

.skyler-bot-intro span {
  margin-top: 2px;
  color: #6b6474;
  font-size: 12.5px;
}

.skyler-bot-intro.exiting {
  pointer-events: none;
  animation: skyler-bot-intro-suck 720ms ease-in forwards;
}

.skyler-bot-toggle {
  display: inline-flex;
  width: 58px;
  height: 58px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgba(255, 247, 237, 0.8);
  border: 2px solid #f18f55;
  color: #124a80;
  box-shadow: 0 16px 34px rgba(163, 68, 47, 0.24);
  transition: background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}

.skyler-bot-toggle:hover {
  background: #f6a46f;
  box-shadow: 0 18px 38px rgba(163, 68, 47, 0.3);
  transform: translateY(-2px);
}

.skyler-bot-toggle svg {
  width: 27px;
  height: 27px;
  fill: currentColor;
}

.skyler-bot-toggle span:last-child {
  font-size: 28px;
  line-height: 1;
}

.skyler-bot-intro-enter-active,
.skyler-bot-intro-leave-active {
  transition: opacity 260ms ease, transform 260ms ease;
}

.skyler-bot-intro-enter-from,
.skyler-bot-intro-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}

.skyler-bot-panel-enter-active,
.skyler-bot-panel-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.skyler-bot-panel-enter-from,
.skyler-bot-panel-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.skyler-bot-message-list-enter-active,
.skyler-bot-message-list-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.skyler-bot-message-list-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.skyler-bot-message-list-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

@keyframes skyler-bot-typing {
  0%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  35% {
    opacity: 1;
    transform: translateY(-5px);
  }

  70% {
    opacity: 0.55;
    transform: translateY(0);
  }
}

@keyframes skyler-bot-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes skyler-bot-intro-suck {
  0% {
    opacity: 1;
    filter: blur(0);
    transform: translate(0, 0) scale(1);
  }

  55% {
    opacity: 0.9;
    filter: blur(0);
    transform: translate(18px, 42px) scale(0.72);
  }

  100% {
    opacity: 0;
    filter: blur(2px);
    transform: translate(76px, 88px) scale(0.08) rotate(8deg);
  }
}

@media (max-width: 560px) {
  .skyler-bot {
    right: 14px;
    bottom: 14px;
  }

  .skyler-bot-panel {
    width: calc(100vw - 28px);
    height: min(540px, calc(100vh - 94px));
    min-width: 0;
  }

  .skyler-bot-resize-handle {
    display: none;
  }

  .skyler-bot-messages {
    min-height: 0;
  }

  .skyler-bot-intro {
    bottom: 70px;
    width: min(244px, calc(100vw - 28px));
  }
}
</style>
