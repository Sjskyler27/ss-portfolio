const allowedEvents = new Set([
  "external_site",
  "site_view",
  "section_view",
  "project_view",
  "session_end",
]);
const corsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function cleanValue(value, maxLength = 140) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch (error) {
    return {};
  }
}

function formatSource(source) {
  const cleanSource = cleanValue(source, 80);
  return cleanSource || "unknown";
}

function formatUser(user) {
  return cleanValue(user, 40) || "Unknown";
}

function formatSessionNumber(sessionNumber) {
  const cleanNumber = Number(sessionNumber);
  return Number.isFinite(cleanNumber) && cleanNumber > 0 ? cleanNumber : 1;
}

function formatDuration(totalSeconds) {
  const cleanSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(cleanSeconds / 60);
  const seconds = cleanSeconds % 60;

  if (minutes <= 0) {
    return `${seconds} seconds`;
  }

  if (seconds === 0) {
    return `${minutes} minutes`;
  }

  return `${minutes} minutes ${seconds} seconds`;
}

function formatCompactActivity(payload, user) {
  const eventName = allowedEvents.has(payload.event) ? payload.event : "site_view";
  const projectTitle = cleanValue(payload.projectTitle, 140);
  const projectId = cleanValue(payload.projectId, 100);
  const section = cleanValue(payload.section, 80);
  const externalLabel = cleanValue(payload.externalLabel, 120);
  const externalUrl = cleanValue(payload.externalUrl, 180);
  const path = cleanValue(payload.path, 180) || "/";

  if (eventName === "external_site") {
    return `+ ${user} external-site: ${externalLabel || externalUrl || "unknown"}`;
  }

  if (eventName === "project_view") {
    return `+ ${user} viewed ${projectTitle || projectId || "project"}`;
  }

  if (eventName === "section_view") {
    return `+ ${user} viewed ${section || path}`;
  }

  return `+ ${user} viewed ${path}`;
}

function formatDiscordMessage(payload) {
  const eventName = allowedEvents.has(payload.event) ? payload.event : "site_view";
  const source = formatSource(payload.source);
  const user = formatUser(payload.user);
  const sessionNumber = formatSessionNumber(payload.sessionNumber);
  const path = cleanValue(payload.path, 180) || "/";
  const referrer = cleanValue(payload.referrer, 220);
  const timestamp = cleanValue(payload.sessionStartedAt, 40) || new Date().toISOString();

  if (eventName === "session_end") {
    const endedAt = cleanValue(payload.sessionEndedAt, 40) || new Date().toISOString();
    return [
      `+ ${user} closed portfolio ${endedAt}`,
      `+ total time ${formatDuration(payload.totalSeconds)}`,
    ].join("\n");
  }

  if (!payload.isSessionStart) {
    return formatCompactActivity(payload, user);
  }

  const lines =
    [
      "--------------------",
      "Portfolio view",
      `Source: ${source}`,
      `User: ${user}`,
      `Session: ${sessionNumber}`,
      `Page: ${path}`,
      `Time: ${timestamp}`,
    ];

  if (referrer) {
    lines.push(`Referrer: ${referrer}`);
  }

  return lines.join("\n");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
    };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    return jsonResponse(500, { error: "Missing DISCORD_WEBHOOK_URL" });
  }

  const payload = parseBody(event);
  const content = formatDiscordMessage(payload);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (response.ok) {
      return {
        statusCode: 204,
        headers: corsHeaders,
      };
    }
  } catch (error) {
    // Return the same public response for Discord rate limits and network errors.
  }

  return jsonResponse(502, { error: "Discord webhook failed" });
};
