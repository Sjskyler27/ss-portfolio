# Discord Notification Requirements

## Purpose

Add private Discord notifications when visitors view the portfolio or open a project-specific link. The feature should help identify which portfolio links are being used without exposing secrets in frontend code or collecting unnecessary personal data.

## Goals

- Notify the owner when a visitor opens the portfolio.
- Notify the owner when a visitor opens a specific project route such as `/projects/healthcare_app`.
- Support source-tagged links using query parameters such as `?source=icon_health`.
- Keep the Discord webhook URL private.
- Avoid sending personally identifying visitor data by default.
- Prevent excessive duplicate notifications from refreshes or quick navigation.

## Non-Goals

- Do not identify the actual person viewing the page.
- Do not infer that a visitor works at a company just because they opened a company-labeled link.
- Do not expose the Discord webhook URL in client-side JavaScript.
- Do not collect IP addresses, exact location, browser fingerprints, names, emails, or other personal data unless a future opt-in form is added.
- Do not build a full analytics dashboard.

## User Stories

- As the portfolio owner, I want to know when someone opens my portfolio so I can see when shared links are active.
- As the portfolio owner, I want to know which project page someone opened so I can understand what content is being viewed.
- As the portfolio owner, I want source-tagged links so I can tell whether someone opened a link I shared for a specific company or role.
- As a visitor, I should not see any visible interruption or notification UI during normal browsing.

## Link Format

Supported URLs:

```text
/?source=icon_health
/projects/healthcare_app?source=icon_health
/projects/wordis?source=game_studio
```

The `source` query parameter is optional. If it is missing, the notification should still send with source set to `unknown` or omitted.

## Notification Events

### Site View

Triggered when the app first loads.

Payload sent from frontend to Netlify Function:

```json
{
  "event": "site_view",
  "path": "/",
  "source": "icon_health",
  "referrer": "https://example.com"
}
```

Discord message example:

```text
Portfolio view
Source: icon_health
Page: /
Referrer: https://example.com
```

### Project View

Triggered when a project modal opens from either a direct route or a user click.

Payload sent from frontend to Netlify Function:

```json
{
  "event": "project_view",
  "path": "/projects/healthcare_app",
  "projectId": "healthcare_app",
  "projectTitle": "Healthcare Data Platform",
  "source": "icon_health",
  "referrer": "https://example.com"
}
```

Discord message example:

```text
Project view
Source: icon_health
Project: Healthcare Data Platform
Page: /projects/healthcare_app
```

## Technical Requirements

- Implement notification delivery through a Netlify Function.
- Store `DISCORD_WEBHOOK_URL` as a Netlify environment variable.
- The frontend must call only the Netlify Function endpoint.
- The frontend must never call the Discord webhook URL directly.
- The function must validate and sanitize input before formatting the Discord message.
- The function must handle missing webhook configuration with a clear server-side error response.
- The function must return quickly and avoid blocking the user experience.
- The frontend notification call should use `navigator.sendBeacon` when practical, with `fetch` as a fallback.

## Suggested File Structure

```text
netlify/
  functions/
    notify-view.js
src/
  services/
    notifications.js
```

## Frontend Behavior

- On initial app load, send a `site_view` event once per browser session.
- When a project opens, send a `project_view` event once per project per browser session.
- Preserve query parameters when navigating from page links where practical so the source context is retained.
- If the function call fails, do not show an error to the visitor.
- Log failures only in development mode.

## Rate Limiting And Dedupe

Minimum dedupe behavior:

- Use `sessionStorage` to avoid repeated `site_view` events in the same tab session.
- Use `sessionStorage` to avoid repeated `project_view` events for the same `source` and `projectId` in the same tab session.

Recommended key format:

```text
portfolio-notify:site_view:icon_health:/
portfolio-notify:project_view:icon_health:healthcare_app
```

Optional future hardening:

- Add Netlify Function-side rate limiting.
- Drop duplicate messages from the same anonymous session token.
- Add a cooldown window for repeated project events.

## Privacy Requirements

- Default notifications should include only event type, source, path, project id/title, referrer, and timestamp.
- Do not send visitor IP addresses to Discord.
- Do not send user agent strings to Discord unless there is a specific debugging need.
- Do not claim a visitor is from a company. Use wording like "Someone opened your Icon Health link."
- If a future opt-in form collects a name or message, the UI must clearly state what will be sent before the visitor submits.

## Acceptance Criteria

- Opening `/?source=icon_health` sends one site view notification to Discord.
- Opening `/projects/healthcare_app?source=icon_health` opens the project and sends one project view notification.
- Opening the same project repeatedly in the same tab session does not spam duplicate Discord messages.
- The Discord webhook URL is not present in the built frontend bundle.
- The site still works if the notification function fails.
- `npm run build` completes successfully.

