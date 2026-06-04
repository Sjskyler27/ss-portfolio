const notificationPath = "/.netlify/functions/notify-view";

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

function getDedupeKey(payload) {
  const source = payload.source || "unknown";
  const event = payload.event || "site_view";
  const target = payload.projectId || payload.path || "/";

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

function sendPayload(payload) {
  const body = JSON.stringify(payload);
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && navigator.sendBeacon) {
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
  const payload = {
    event: "site_view",
    path,
    source: getSource(),
    referrer: document.referrer,
  };

  if (!hasAlreadySent(payload)) {
    sendPayload(payload);
  }
}

export function notifyProjectView(project, path = window.location.pathname) {
  if (!project) {
    return;
  }

  const payload = {
    event: "project_view",
    path,
    projectId: project.id,
    projectTitle: project.title,
    source: getSource(),
    referrer: document.referrer,
  };

  if (!hasAlreadySent(payload)) {
    sendPayload(payload);
  }
}
