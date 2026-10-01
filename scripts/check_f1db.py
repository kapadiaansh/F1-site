#!/usr/bin/env python3
"""
Daily F1DB release checker.

This updater is intentionally fail-safe:
- It checks the latest F1DB release every day.
- It records the release/version in data-status.js.
- If a new release is found, it downloads the JSON artifact for future normalization.
- It NEVER overwrites the site's verified data.js unless a normalizer explicitly
  validates and writes a complete replacement.

This prevents an upstream schema change from breaking the public website.
"""

from __future__ import annotations
import io
import json
import re
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATUS = ROOT / "data-status.js"
API = "https://api.github.com/repos/f1db/f1db/releases/latest"
UA = "APEX-F1-Data-Updater/1.0"

def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent":UA,"Accept":"application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)

def download(url):
    req = urllib.request.Request(url, headers={"User-Agent":UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()

def main():
    release = get_json(API)
    tag = release["tag_name"]
    published = release.get("published_at")
    match = re.search(r"v(\d{4})\.(\d+)", tag)
    round_no = int(match.group(2)) if match else None

    asset = next((a for a in release.get("assets",[]) if a["name"]=="f1db-json-single.zip"), None)
    downloaded = False

    # Download once to verify that the published artifact is reachable.
    if asset:
        try:
            blob = download(asset["browser_download_url"])
            with zipfile.ZipFile(io.BytesIO(blob)) as zf:
                names = [n for n in zf.namelist() if n.endswith(".json")]
                if not names:
                    raise RuntimeError("F1DB artifact contained no JSON.")
            downloaded = True
        except Exception as exc:
            print(f"Artifact verification failed: {exc}")

    payload = {
        "checkedAt": datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),
        "version": tag,
        "releaseDate": published,
        "round": round_no,
        "source": "F1DB",
        "artifactVerified": downloaded,
        "dataApplied": False,
        "note": "Latest release checked automatically. Public data.js remains last-known-good until normalization validation succeeds."
    }
    STATUS.write_text(
        "window.F1_DATA_STATUS = " + json.dumps(payload,separators=(",",":")) + ";\n",
        encoding="utf-8"
    )
    print(f"Latest F1DB release: {tag}")

if __name__ == "__main__":
    main()
