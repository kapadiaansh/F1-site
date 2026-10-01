# APEX Motorsport Data — V8

V8 adds automated news collection and scheduled data-source checks.

## Automatic news
GitHub Actions runs `scripts/update_news.py` every 30 minutes.

Sources:
- Motorsport.com Formula 1 RSS
- Autosport Formula 1 RSS

The generated `news.js` is committed to the repository. The public site therefore
reads a local copy and does not depend on the RSS servers during page load.

Only headline-level metadata is stored. Every story links to the original publisher.

## Automatic data checks
GitHub Actions runs `scripts/check_f1db.py` every day.

It checks the latest F1DB release and verifies the JSON release artifact.

The update is intentionally fail-safe: a new external schema can never overwrite
the verified `data.js` automatically until a full normalization pass validates
the replacement. This keeps the public site working even if F1DB changes format.

## Enable the automations
GitHub Actions must be enabled for the repository.

After uploading V8:
1. Open the repository on GitHub.
2. Open the **Actions** tab.
3. If prompted, enable workflows.
4. Open **Update F1 news** and click **Run workflow** once.
5. Open **Check F1 data release** and click **Run workflow** once.

After that:
- news checks every 30 minutes
- F1DB release checks daily
- both workflows commit changes directly to `main`

GitHub Pages will redeploy after those commits.

## Important
Scheduled GitHub Actions are not guaranteed to fire at the exact minute during
heavy GitHub load, but they normally run close to the requested cadence.

Footer marker: `BUILD V8 · AUTO NEWS + DATA CHECKS`
