# Custom Project Layout Requirements

## Purpose

Customize project ordering based on the visitor's source query parameter. This allows shared portfolio links to emphasize projects that are most relevant to a company, role, or audience while keeping the default portfolio experience unchanged.

## Goals

- Support source-specific project ranking through query parameters.
- Keep `/projects/:id` routes working with query parameters.
- Show higher-priority projects first for known sources.
- Preserve the default project order when no source is provided.
- Avoid making the customized experience feel visibly targeted or awkward.
- Keep source ranking configuration easy to update.

## Non-Goals

- Do not create separate portfolio pages for each company.
- Do not hide all non-ranked projects by default.
- Do not require a backend for project ordering.
- Do not change project ids or route formats.
- Do not show text such as "Customized for Icon Health" unless explicitly enabled later.

## User Stories

- As the portfolio owner, I want `?source=icon_health` to prioritize healthcare and product workflow projects.
- As the portfolio owner, I want `?source=game_studio` to prioritize games and interactive projects.
- As the portfolio owner, I want direct project URLs like `/projects/wordis?source=game_studio` to still open the correct project.
- As a visitor, I want the project page to feel natural, with relevant projects appearing earlier.

## Supported URL Format

```text
/?source=icon_health
/projects/healthcare_app?source=icon_health
/projects/wordis?source=game_studio
```

The source value should be lowercase snake case:

```text
icon_health
game_studio
frontend_role
healthcare_role
```

## Source Profile Model

Create a source profile configuration that maps source ids to ranking rules.

Example:

```js
export const sourceProfiles = {
  icon_health: {
    label: "Icon Health",
    projectOrder: [
      "healthcare_app",
      "app-rebuild",
      "onboarding",
      "component-library",
      "state-partnerships",
    ],
  },
  game_studio: {
    label: "Game Studio",
    projectOrder: [
      "wordis",
      "dungeon-draft",
      "codenames",
      "heat",
    ],
  },
  frontend_role: {
    label: "Frontend Role",
    projectOrder: [
      "component-library",
      "onboarding",
      "state-partnerships",
      "practice-mobile",
      "wordis",
    ],
  },
};
```

## Ranking Behavior

- If the source is unknown or missing, use the normal `projects` order.
- If the source is known, projects listed in `projectOrder` should appear first.
- Listed projects should follow the order defined in `projectOrder`.
- Unlisted projects should still appear after ranked projects in their original relative order.
- If a project id in `projectOrder` does not exist, ignore it.
- Do not mutate the original `projects` array.

## Direct Project Route Behavior

Direct routes must still open the requested project:

```text
/projects/wordis?source=icon_health
```

Expected behavior:

- Open the `wordis` project modal.
- Keep source context as `icon_health`.
- Rank the project list using the `icon_health` source profile in the background.
- Preserve the query parameter when closing the modal, resulting in `/projects?source=icon_health`.

## Navigation Behavior

- When navigating between internal sections, preserve the current `source` query parameter.
- When opening a project card, preserve source in the URL:

```text
/projects/healthcare_app?source=icon_health
```

- When closing a project modal, preserve source in the URL:

```text
/projects?source=icon_health
```

- When returning to About or Experience, preserve source if the visitor originally arrived with one:

```text
/?source=icon_health
/experience?source=icon_health
```

## Suggested File Structure

```text
src/
  data/
    projects.js
    sourceProfiles.js
```

## Suggested Implementation Details

- Add a `source` data property in `App.vue`.
- Parse `source` using `new URLSearchParams(window.location.search)`.
- Add a computed property such as `rankedProjects`.
- Replace the project grid loop with `rankedProjects`.
- Update the URL helper to preserve query parameters.

Example computed behavior:

```js
rankedProjects() {
  const profile = sourceProfiles[this.source];

  if (!profile) {
    return this.projects;
  }

  const rankByProjectId = new Map(
    profile.projectOrder.map((projectId, index) => [projectId, index])
  );

  return [...this.projects].sort((a, b) => {
    const aRank = rankByProjectId.has(a.id) ? rankByProjectId.get(a.id) : Infinity;
    const bRank = rankByProjectId.has(b.id) ? rankByProjectId.get(b.id) : Infinity;

    if (aRank !== bRank) {
      return aRank - bRank;
    }

    return this.projects.indexOf(a) - this.projects.indexOf(b);
  });
}
```

## Optional Enhancements

- Add source-specific featured copy for project summaries.
- Add source-specific hidden project groups.
- Add a private source profile for each job application.
- Add a source profile preview command or local test page.
- Combine this feature with Discord notifications so notifications include the active source.

## Acceptance Criteria

- `/?source=icon_health` shows Icon Health-ranked projects first.
- `/projects/healthcare_app?source=icon_health` opens the Healthcare Data Platform modal.
- `/projects/wordis?source=game_studio` opens Wordis and keeps game-focused ordering.
- Unknown sources fall back to the default project order.
- Query parameters are preserved during internal navigation.
- Existing project routes without query parameters continue to work.
- `npm run build` completes successfully.

