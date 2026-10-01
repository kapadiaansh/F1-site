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
