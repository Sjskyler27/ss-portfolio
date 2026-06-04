const notificationPath = "/.netlify/functions/notify-view";
const activityKey = "portfolio-notify-activities";
const sessionClosedKey = "portfolio-notify-session-closed";
const sessionInfoKey = "portfolio-notify-session";
const sessionCountKey = "portfolio-notify-session-count";
const userKey = "portfolio-notify-user";
const userNames = [
  "Bird",
  "Fox",
  "Oak",
  "River",
  "Maple",
  "Cedar",
  "Pine",
  "Stone",
];

function getNotificationEndpoint() {
  if (process.env.NODE_ENV === "development" && window.location.port === "8080") {
    return `http://localhost:8888${notificationPath}`;
  }

  return notificationPath;
}

function getSource() {
  const params = new URLSearchParams(window.location.search);
  return params.get("source") || "";
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

function generateUserName() {
  const name = userNames[Math.floor(Math.random() * userNames.length)];
  const suffix =
    window.crypto && window.crypto.getRandomValues
      ? window.crypto.getRandomValues(new Uint16Array(1))[0] % 90
      : Math.floor(Math.random() * 90);

  return `${name}${suffix + 10}`;
}

function getUserName() {
  const existingUser = getStoredValue(localStorage, userKey);

  if (existingUser) {
    return existingUser;
  }

  const nextUser = generateUserName();
  setStoredValue(localStorage, userKey, nextUser);
  return nextUser;
}

function getSessionInfo() {
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
    user: getUserName(),
  };

  setStoredValue(localStorage, sessionCountKey, String(session.sessionNumber));
  setStoredValue(sessionStorage, sessionInfoKey, JSON.stringify(session));
  setStoredValue(sessionStorage, activityKey, JSON.stringify([]));
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
  const target = payload.externalUrl || payload.projectId || payload.path || "/";

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

function sendPayload(payload, options = {}) {
  const body = JSON.stringify(payload);
  const isProduction = process.env.NODE_ENV === "production";

  if ((isProduction || options.preferBeacon) && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });

    if (navigator.sendBeacon(getNotificationEndpoint(), blob)) {
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

  if (!hasAlreadySent(payload)) {
    sendPayload(payload);
  }
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
    sendPayload(payload);
  }
}

export function notifyPortfolioSessionEnd(path = window.location.pathname) {
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
