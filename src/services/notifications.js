import { notificationNames } from "../data/notificationNames";
import { getCurrentSource } from "./sourceInfo";

const notificationPath = "/.netlify/functions/notify-view";
const activityKey = "portfolio-notify-activities";
const activeStateKey = "portfolio-notify-active-state";
const initialViewKey = "portfolio-notify-initial-view";
const engagementKey = "portfolio-notify-engaged";
const sessionClosedKey = "portfolio-notify-session-closed";
const sessionInfoKey = "portfolio-notify-session";
const sessionCountKey = "portfolio-notify-session-count";
const userKey = "portfolio-notify-user";
const disableWebhookKey = "disable_discord_webhook";

let activeTimerInitialized = false;

function getNotificationEndpoint() {
  if (process.env.NODE_ENV === "development" && window.location.port === "8080") {
    return `http://localhost:8888${notificationPath}`;
  }

  return notificationPath;
}

function getSource() {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("source");

  if (source === "none") {
    setStoredValue(localStorage, disableWebhookKey, "true");
    return "";
  }

  return getCurrentSource();
}

function getStoredValue(storage, key) {
  try {
    return storage.getItem(key);
  } catch (error) {
    return "";
  }
}

function setStoredValue(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch (error) {
    // Storage is best-effort. Notifications still send without persistence.
  }
}

function getActiveState() {
  try {
    return JSON.parse(
      sessionStorage.getItem(activeStateKey) ||
        '{"activeMs":0,"lastMessageActiveMs":0,"visibleStartedAt":0}'
    );
  } catch (error) {
    return {
      activeMs: 0,
      lastMessageActiveMs: 0,
      visibleStartedAt: 0,
    };
  }
}

function saveActiveState(state) {
  setStoredValue(sessionStorage, activeStateKey, JSON.stringify(state));
}

function syncActiveState() {
  const state = getActiveState();
  const now = Date.now();

  if (state.visibleStartedAt) {
    state.activeMs += Math.max(0, now - state.visibleStartedAt);
  }

  state.visibleStartedAt = document.visibilityState === "visible" ? now : 0;
  saveActiveState(state);
  return state;
}

function initializeActiveTimer() {
  if (activeTimerInitialized) {
    return;
  }

  activeTimerInitialized = true;

  if (!getStoredValue(sessionStorage, activeStateKey)) {
    saveActiveState({
      activeMs: 0,
      lastMessageActiveMs: 0,
      visibleStartedAt: document.visibilityState === "visible" ? Date.now() : 0,
    });
  } else {
    syncActiveState();
  }

  document.addEventListener("visibilitychange", syncActiveState);
}

function withInteractionTiming(payload) {
  const state = syncActiveState();
  const secondsSinceLastInteraction = Math.max(
    0,
    Math.round((state.activeMs - state.lastMessageActiveMs) / 1000)
  );

  return {
    ...payload,
    secondsSinceLastInteraction,
  };
}

function markMessageSent() {
  const state = syncActiveState();
  state.lastMessageActiveMs = state.activeMs;
  saveActiveState(state);
}

function generateUserName() {
  const name =
    notificationNames[Math.floor(Math.random() * notificationNames.length)] || "Guest";
  const suffix =
    window.crypto && window.crypto.getRandomValues
      ? window.crypto.getRandomValues(new Uint16Array(1))[0] % 90
      : Math.floor(Math.random() * 90);

  return `${name}${suffix + 10}`;
}

export function getNotificationUserName() {
  const existingUser = getStoredValue(localStorage, userKey);

  if (existingUser) {
    return existingUser;
  }

  const nextUser = generateUserName();
  setStoredValue(localStorage, userKey, nextUser);
  return nextUser;
}

function getSessionInfo() {
  initializeActiveTimer();

  const existingSession = getStoredValue(sessionStorage, sessionInfoKey);

  if (existingSession) {
    try {
      return JSON.parse(existingSession);
    } catch (error) {
      // Recreate malformed session data below.
    }
  }

  const previousCount = Number(getStoredValue(localStorage, sessionCountKey)) || 0;
  const session = {
    startedAt: new Date().toISOString(),
    sessionNumber: previousCount + 1,
    user: getNotificationUserName(),
  };

  setStoredValue(localStorage, sessionCountKey, String(session.sessionNumber));
  setStoredValue(sessionStorage, sessionInfoKey, JSON.stringify(session));
  setStoredValue(sessionStorage, activityKey, JSON.stringify([]));
  sessionStorage.removeItem(initialViewKey);
  sessionStorage.removeItem(engagementKey);
  saveActiveState({
    activeMs: 0,
    lastMessageActiveMs: 0,
    visibleStartedAt: document.visibilityState === "visible" ? Date.now() : 0,
  });
  sessionStorage.removeItem(sessionClosedKey);

  return session;
}

function withSession(payload) {
  const session = getSessionInfo();

  return {
    ...payload,
    sessionNumber: session.sessionNumber,
    sessionStartedAt: session.startedAt,
    user: session.user,
  };
}

function getActivities() {
  try {
    return JSON.parse(sessionStorage.getItem(activityKey) || "[]");
  } catch (error) {
    return [];
  }
}

function addActivity(activity) {
  const activities = getActivities();
  activities.push({
    activity,
    time: new Date().toISOString(),
  });
  setStoredValue(sessionStorage, activityKey, JSON.stringify(activities.slice(-25)));
}

function getDedupeKey(payload) {
  const source = payload.source || "unknown";
  const event = payload.event || "site_view";
  const target =
    payload.externalUrl || payload.resumePath || payload.projectId || payload.path || "/";

  return `portfolio-notify:${event}:${source}:${target}`;
}

function hasAlreadySent(payload) {
  try {
    const key = getDedupeKey(payload);

    if (sessionStorage.getItem(key)) {
      return true;
    }

    sessionStorage.setItem(key, "sent");
  } catch (error) {
    return false;
  }

  return false;
}

function queueInitialView(payload) {
  if (hasAlreadySent(payload)) {
    return;
  }

  setStoredValue(sessionStorage, initialViewKey, JSON.stringify(payload));
}

function getQueuedInitialView() {
  const queuedPayload = getStoredValue(sessionStorage, initialViewKey);

  if (!queuedPayload) {
    return null;
  }

  try {
    return JSON.parse(queuedPayload);
  } catch (error) {
    sessionStorage.removeItem(initialViewKey);
    return null;
  }
}

function hasEngagement() {
  return Boolean(getStoredValue(sessionStorage, engagementKey));
}

function markEngaged() {
  setStoredValue(sessionStorage, engagementKey, "true");
}

function sendQueuedInitialView() {
  const payload = getQueuedInitialView();

  if (!payload) {
    return;
  }

  sessionStorage.removeItem(initialViewKey);
  markEngaged();
  sendPayload(payload);
}

function isAutomatedPageLoad() {
  const userAgent = navigator.userAgent.toLowerCase();
  const botUserAgents = [
    "chrome-lighthouse",
    "google page speed",
    "lighthouse",
    "netlify",
    "pagespeed",
  ];

  return (
    navigator.webdriver ||
    document.prerendering ||
    botUserAgents.some((botUserAgent) => userAgent.includes(botUserAgent))
  );
}

function shouldSendNotifications() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  if (getStoredValue(localStorage, disableWebhookKey)) {
    return false;
  }

  return !isAutomatedPageLoad();
}

function sendPayload(payload, options = {}) {
  if (!shouldSendNotifications()) {
    return;
  }

  const payloadWithTiming = withInteractionTiming(payload);
  const body = JSON.stringify(payloadWithTiming);
  const isProduction = process.env.NODE_ENV === "production";

  if ((isProduction || options.preferBeacon) && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });

    if (navigator.sendBeacon(getNotificationEndpoint(), blob)) {
      markMessageSent();
      return;
    }
  }

  fetch(getNotificationEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  })
    .then((response) => {
      if (!response.ok && !isProduction) {
        console.warn(
          "Portfolio notification endpoint returned",
          response.status,
          response.statusText
        );
      }
      if (response.ok) {
        markMessageSent();
      }
    })
    .catch((error) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to send portfolio notification", error);
      }
    });
}

export function notifyPortfolioView(path = window.location.pathname) {
  const payload = withSession({
    event: "site_view",
    isSessionStart: true,
    path,
    source: getSource(),
    referrer: document.referrer,
  });

  queueInitialView(payload);
}

export function notifySectionView(section, path = window.location.pathname) {
  if (!section) {
    return;
  }

  const payload = withSession({
    event: "section_view",
    path,
    section,
    source: getSource(),
    referrer: document.referrer,
  });

  if (!hasAlreadySent(payload)) {
    addActivity(`Viewed ${section}`);
    sendQueuedInitialView();
    sendPayload(payload);
  }
}

export function notifyProjectView(project, path = window.location.pathname) {
  if (!project) {
    return;
  }

  const payload = withSession({
    event: "project_view",
    path,
    projectId: project.id,
    projectTitle: project.title,
    source: getSource(),
    referrer: document.referrer,
  });

  if (!hasAlreadySent(payload)) {
    addActivity(`Viewed ${project.id}`);
    sendQueuedInitialView();
    sendPayload(payload);
  }
}

export function notifyExternalSite(link, project, path = window.location.pathname) {
  if (!link || !link.url) {
    return;
  }

  const payload = withSession({
    event: "external_site",
    externalLabel: link.name || link.url,
    externalUrl: link.url,
    path,
    projectId: project && project.id,
    projectTitle: project && project.title,
    source: getSource(),
    referrer: document.referrer,
  });

  if (!hasAlreadySent(payload)) {
    addActivity(`external-site: ${payload.externalLabel}`);
    sendQueuedInitialView();
    sendPayload(payload);
  }
}

export function notifyResumeView(
  resumePath = "/Resume6-1.pdf",
  path = window.location.pathname
) {
  const payload = withSession({
    event: "resume_view",
    path,
    resumePath,
    source: getSource(),
    referrer: document.referrer,
  });

  if (!hasAlreadySent(payload)) {
    addActivity("Viewed resume");
    sendQueuedInitialView();
    sendPayload(payload);
  }
}

export function notifyPortfolioSessionEnd(path = window.location.pathname) {
  if (!hasEngagement()) {
    return;
  }

  if (getStoredValue(sessionStorage, sessionClosedKey)) {
    return;
  }

  const session = getSessionInfo();
  const endedAt = new Date();
  const startedAt = new Date(session.startedAt);
  const durationMs = Math.max(0, endedAt.getTime() - startedAt.getTime());

  setStoredValue(sessionStorage, sessionClosedKey, "true");

  sendPayload(
    {
      event: "session_end",
      path,
      source: getSource(),
      user: session.user,
      sessionNumber: session.sessionNumber,
      sessionStartedAt: session.startedAt,
      sessionEndedAt: endedAt.toISOString(),
      totalSeconds: Math.round(durationMs / 1000),
      activities: getActivities(),
    },
    { preferBeacon: true }
  );
}
