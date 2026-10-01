# APEX Motorsport Data — V9

V9 converts the site from a mostly static snapshot into a fail-safe online-fed site.

## Content sources

### Current / post-race statistics
F1DB release artifacts (CC BY 4.0) are checked every 6 hours.
`scripts/update_f1_data.py` normalizes a validated partial overlay into `online-data.js`.

The website merges:
`data.js` (last-known-good fallback) + `online-data.js` (verified online overlay).

If normalization ever fails, the fallback remains untouched.

### Current news
Autosport and Motorsport.com publisher RSS feeds are checked every 30 minutes.
Only headline metadata, source, timestamp, short feed summary and original link are displayed.

### On This Day
Every day `scripts/update_history_media.py` downloads the latest F1DB CSV release and
builds `history.js`, grouping historical Grands Prix by month/day.

The browser chooses today's editorial date from this generated archive.

### Photography
The history/media updater searches Wikimedia Commons through the official MediaWiki API.
Only media whose metadata identifies a reusable license such as public domain, CC0,
CC BY or CC BY-SA is considered.

Every displayed Commons image includes creator/license attribution and links back to its
Commons file page.

### Circuit layouts
`scripts/update_circuit.py` searches the F1DB circuit SVG repository and downloads a
matching Sepang SVG when available. F1DB circuit assets are CC BY 4.0.

## Update cadence

- News: every 30 minutes
- F1DB race-data normalization: every 6 hours
- Historical archive + licensed media: daily
- GitHub Pages redeploys automatically after bot commits

## GitHub setup

After replacing the old repository with V9:

1. Open **Actions**.
2. Enable workflows if GitHub asks.
3. Run **Update F1 news** once.
4. Run **Refresh F1 race data** once.
5. Run **Refresh F1 history and media** once.
6. Check the Actions logs.
7. GitHub Pages will redeploy after the commits.

## Core fail-safe rule

Automated scripts never deliberately replace the verified fallback with incomplete data.
When an online source is unavailable or its schema cannot be confidently normalized,
the previous successful files remain active.

Footer marker:
`BUILD V9 · ONLINE DATA + LICENSED MEDIA`


## V9.1 hotfix
- Restores missing `renderNews()` and `relativeTime()` helpers.
- All reveal content is visible by default.
- Every major panel has static HTML fallback content.
- Initialization is isolated per feature with `safeRun()`, so one widget cannot blank the whole page.
- Footer marker: `BUILD V9.1 · FAIL-OPEN FIX`.
