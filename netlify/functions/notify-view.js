const allowedEvents = new Set(["site_view", "project_view"]);
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

function formatDiscordMessage(payload) {
  const eventName = allowedEvents.has(payload.event) ? payload.event : "site_view";
  const source = formatSource(payload.source);
  const path = cleanValue(payload.path, 180) || "/";
  const referrer = cleanValue(payload.referrer, 220);
  const projectTitle = cleanValue(payload.projectTitle, 140);
  const projectId = cleanValue(payload.projectId, 100);
  const timestamp = new Date().toISOString();

  const lines =
    eventName === "project_view"
      ? [
          "Project view",
          `Source: ${source}`,
          `Project: ${projectTitle || projectId || "unknown"}`,
          `Page: ${path}`,
          `Time: ${timestamp}`,
        ]
      : [
          "Portfolio view",
          `Source: ${source}`,
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
