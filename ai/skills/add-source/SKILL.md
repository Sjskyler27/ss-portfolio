---
name: add-source
description: Add or update a recruiter/company source for this ss-portfolio repo, including the public source map, private source profile, encryption step, project sort override, and source-aware validation commands.
---

# Add Source

Use this skill when working in this repo to add or update a source profile.

## Files

- Public map: `src/data/source-info.json`
- Private editable profile: `documents/source-info.private.json`
- Private encrypted deploy copy: `documents/source-info.private.json.enc`

## Rules

- Keep `src/data/source-info.json` browser-safe.
- Put job descriptions, targeting notes, and recruiter guidance only in `documents/source-info.private.json`.
- After editing the private profile, run `npm run source-info:encrypt`.

## Workflow

1. Add a new public source entry with:
   - `id`
   - `key`
   - `label`
   - `urlKey`
   - `aliases`
2. Add the matching private source profile with:
   - `role`
   - `location`
   - `jobDescription`
   - `companySummary`
   - `cultureSummary`
   - `jobSummary`
   - `responsibilities`
   - `targetSkills`
   - `answerGuidance`
   - `sortOverride`
3. Choose `sortOverride` from ids in `src/data/projects.js`.
4. Encrypt and validate:
   - `npm run source-info:encrypt`
   - `npm run source-info:sort -- <source-key>`
   - `npm run build`

## Guidance

- Keep `answerGuidance` truthful and discreet.
- Explicitly avoid claiming unsupported domain experience or tools.
- Prefer aliases that match likely recruiter/company URL forms.
