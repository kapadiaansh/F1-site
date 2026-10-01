# APEX // Motorsport Data — Version 1

A modern, static motorsport dashboard designed to work on GitHub Pages.

## Included in V1

- Responsive dark motorsport UI
- Current-season race calendar from OpenF1
- Next session countdown
- Race-weekend session schedule
- Latest completed race podium
- Driver championship standings
- Constructor championship standings
- Session-center status
- "On This Day" history engine using a local JSON file
- Mobile navigation
- Reserved future monetization slot
- No build system and no framework

## Files

```text
index.html
style.css
script.js
data/history.json
```

## Run it locally

Because the site loads `data/history.json`, do not simply double-click `index.html`.

### Easy option: VS Code Live Server

1. Open this folder in VS Code.
2. Install the "Live Server" extension.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.

### Python option

If Python is installed, open a terminal inside this folder and run:

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Publish with GitHub Pages

1. Create a new GitHub repository.
2. Upload the contents of this folder to the repository root.
3. Commit the files.
4. In GitHub open **Settings → Pages**.
5. Under **Build and deployment**, select **Deploy from a branch**.
6. Select the `main` branch and `/ (root)`.
7. Save.

GitHub will provide your public Pages URL.

## Data source

The dynamic site uses OpenF1:

- Meetings / race weekends
- Sessions
- Drivers
- Driver championship standings
- Team championship standings
- Session results

OpenF1 is an unofficial project and is not associated with Formula 1.

## Important note about live data

The site is "live-ready", but the free version currently uses calendar data and completed-session data. OpenF1 requires paid access for real-time data.

## Edit the placeholder name

Search these files for `APEX` and replace it after choosing a permanent name.

## Expand "On This Day"

Open:

```text
data/history.json
```

Each story follows this format:

```json
{
  "date": "09-30",
  "year": "2007",
  "category": "RACE HISTORY",
  "title": "Headline",
  "description": "Your original summary."
}
```

Multiple entries can use the same date. The arrow buttons automatically cycle through them.

## Next development targets

- Full 2026 calendar page
- Driver profiles
- Constructor profiles
- Historical season archive
- Search
- Driver-vs-driver comparison
- Circuit pages
- Race-control feed
- Weather
- SEO pages
- Analytics
- Ad/affiliate integration after substantial original content exists


# Version 2 additions

Version 2 expands the homepage into a multi-page site.

## New pages

- `calendar.html` — full current-season calendar
- `race.html?meeting=...` — dynamic race-weekend page
- `drivers.html` — searchable current grid
- `driver.html?number=...` — dynamic individual driver profile
- `compare.html` — current-season driver comparison

## New JavaScript

- `common.js` — shared OpenF1/API/UI helpers
- `calendar.js`
- `race.js`
- `drivers.js`
- `driver.js`
- `compare.js`

All pages remain plain HTML/CSS/JavaScript and work on GitHub Pages with no build step.


# Version 3 additions

Version 3 introduces the long-term historical-data architecture.

## Why the historical source changed

StatsF1 remains a useful manual verification/reference website, but this project should not depend on scraping it.

Jolpica is excellent technically, but its published data terms restrict free usage to non-commercial projects. Since this site is intended to become monetized, the production historical layer is instead designed around F1DB.

F1DB:
- covers Formula 1 from 1950 onward
- ships JSON/CSV/SQL/SQLite releases
- is licensed CC BY 4.0
- therefore supports commercial reuse with attribution

## New pages

- `archive.html` — 1950-present season browser
- `season.html?year=YYYY` — historical season route
- `sources.html` — transparent data-source and attribution page

## New architecture

- `data-source.js` — source abstraction
- `data/f1db/` — normalized public historical snapshot
- `scripts/sync_f1db.py` — historical snapshot updater
- `.github/workflows/sync-f1db.yml` — weekly/manual GitHub Action

## Historical sync

From the repository root:

```bash
python3 scripts/sync_f1db.py
```

The script downloads the latest F1DB split JSON release, creates a local normalized snapshot, and writes source/version attribution to:

```text
data/f1db/manifest.json
```

The first normalizer version prepares the canonical infrastructure and driver index. Additional race/standings normalization can be expanded incrementally without changing page URLs.

## Production data strategy

```text
OpenF1 -> current/session-rich data
F1DB   -> 1950-present historical database
APEX   -> original editorial / On This Day content
StatsF1 -> manual verification/reference only
```


# Version 4 reliability update

The current-season UI no longer depends on OpenF1 being reachable.

## New local snapshot

`data/current/2026.json`

Contains:
- all 23 current drivers and championship positions
- all 11 team standings
- all 23 calendar rounds
- winners for completed rounds
- complete latest Azerbaijan finishing order
- next Bahrain GP in Malaysia weekend structure

Current data was verified against the official Formula 1 results, standings and calendar pages on 2026-09-30.

## Why this was needed

OpenF1's free access is historical, while current/live-season access can require authentication.
A GitHub Pages site cannot safely store private API credentials in browser JavaScript.

The public site therefore renders from a local snapshot first. OpenF1 can still be used later for authenticated live-session enhancements through a serverless/backend layer.


# Version 5 standalone reliability update

Core current-season pages now work even when the HTML files are opened directly from Finder.

The current 2026 snapshot, history entries and season index are embedded as JavaScript files:
- `current-snapshot.js`
- `history-data.js`
- `archive-data.js`

This removes browser `file://` restrictions caused by fetching local JSON files.

GitHub Pages is still the recommended deployment method, but it is no longer required just to preview the core site locally.
