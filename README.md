# APEX Motorsport Data — V7 clean rewrite

This build replaces the accumulated V1–V6 front end with a clean static site.

## Core files
- `index.html`
- `styles.css`
- `data.js`
- `app.js`

## Why this build is more reliable
- No external API is required to render the page.
- No local `fetch()` calls.
- No framework or build process.
- No duplicated legacy stylesheets.
- Old page URLs redirect to the relevant section of the new single-page site.
- Current data is a verified static snapshot dated 2026-09-30.

## Interactive features
- live countdown
- local/track session-time switch
- standings tabs
- standings search
- expand/collapse standings
- full-result toggle
- calendar filters and horizontal navigation
- driver comparison
- On This Day carousel
- sticky active navigation
- scroll progress indicator
- reveal animations
- responsive mobile navigation

## Deploy
Delete the old repository contents first, then upload **all contents of this folder** to the repository root.
GitHub Pages should deploy from `main` / root.

The footer must read: `BUILD V7 · CLEAN REWRITE`.
