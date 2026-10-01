#!/usr/bin/env python3
"""
Normalize F1DB into small JSON files for the APEX static site.

Source:
  https://github.com/f1db/f1db

License:
  F1DB data is CC BY 4.0. Keep attribution visible on the website.

This script deliberately downloads a release artifact at build/update time rather
than making every website visitor call a third-party service.
"""

from __future__ import annotations

import io
import json
import os
import re
import shutil
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "f1db"
GITHUB_API = "https://api.github.com/repos/f1db/f1db/releases/latest"
USER_AGENT = "APEX-Motorsport-Data/0.3 (+static historical snapshot)"

def fetch_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()

def find_json_files(base: Path):
    return list(base.rglob("*.json"))

def load_any(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def choose_file(files, keywords):
    scored = []
    for f in files:
        name = f.name.lower()
        score = sum(1 for k in keywords if k in name)
        if score:
            scored.append((score, len(name), f))
    scored.sort(key=lambda x: (-x[0], x[1]))
    return scored[0][2] if scored else None

def list_payload(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        # common F1DB split-distribution wrappers
        for key in ("drivers","seasons","races","constructors","circuits","data","items"):
            if isinstance(data.get(key), list):
                return data[key]
    return []

def first(obj, *keys, default=None):
    if not isinstance(obj, dict):
        return default
    for key in keys:
        if key in obj and obj[key] not in (None, ""):
            return obj[key]
    return default

def full_name(obj):
    direct = first(obj, "name", "fullName", "full_name")
    if direct:
        return str(direct)
    given = first(obj, "firstName", "givenName", "forename", "first_name", default="")
    family = first(obj, "lastName", "familyName", "surname", "last_name", default="")
    return f"{given} {family}".strip()

def normalize_drivers(items):
    out = []
    for d in items:
        did = first(d, "id", "driverId", "driverIdString", "driverRef", "abbreviation")
        name = full_name(d)
        if not did or not name:
            continue
        out.append({
            "id": str(did),
            "name": name,
            "givenName": first(d, "firstName", "givenName", "forename", "first_name"),
            "familyName": first(d, "lastName", "familyName", "surname", "last_name"),
            "nationality": first(d, "nationality", "country", "countryId"),
            "dateOfBirth": first(d, "dateOfBirth", "dob", "birthDate"),
            "number": first(d, "permanentNumber", "number"),
        })
    return out

def normalize_season_shell(year):
    return {
        "year": year,
        "races": [],
        "driverStandings": [],
        "constructorStandings": [],
        "driverChampion": None,
        "constructorChampion": None,
    }

def main():
    print("Fetching latest F1DB release metadata...")
    release = fetch_json(GITHUB_API)
    version = release["tag_name"]

    asset = next(
        (a for a in release.get("assets", []) if a["name"] == "f1db-json-splitted.zip"),
        None,
    )
    if not asset:
        raise RuntimeError("f1db-json-splitted.zip not found in latest release.")

    print(f"Downloading {version}...")
    blob = download(asset["browser_download_url"])

    with tempfile.TemporaryDirectory() as td:
        temp = Path(td)
        with zipfile.ZipFile(io.BytesIO(blob)) as zf:
            zf.extractall(temp)

        files = find_json_files(temp)
        if not files:
            raise RuntimeError("No JSON files found inside F1DB split archive.")

        # Keep a raw copy outside the public website so future normalizers can
        # be improved without downloading the source again.
        raw = ROOT / ".f1db-raw"
        if raw.exists():
            shutil.rmtree(raw)
        raw.mkdir(parents=True)
        for f in files:
            target = raw / f.name
            shutil.copy2(f, target)

        driver_file = choose_file(files, ["driver"])
        drivers = []
        if driver_file:
            drivers = normalize_drivers(list_payload(load_any(driver_file)))

        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / "seasons").mkdir(parents=True, exist_ok=True)

        # At minimum create the canonical driver index and all season shells.
        # More fields can be added incrementally as F1DB schema versions evolve.
        (OUT / "drivers.json").write_text(json.dumps(drivers, ensure_ascii=False, indent=2), encoding="utf-8")

        current_year = datetime.now().year
        seasons_index = []
        for year in range(1950, current_year + 1):
            seasons_index.append({"year": year, "era": ""})
            spath = OUT / "seasons" / f"{year}.json"
            if not spath.exists():
                spath.write_text(json.dumps(normalize_season_shell(year), indent=2), encoding="utf-8")

        (OUT / "seasons.json").write_text(json.dumps(seasons_index, indent=2), encoding="utf-8")

        manifest = {
            "ready": True,
            "source": "F1DB",
            "license": "CC BY 4.0",
            "sourceUrl": "https://github.com/f1db/f1db",
            "version": version,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "rawJsonFiles": len(files),
            "driversNormalized": len(drivers),
            "normalizerVersion": 1,
        }
        (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

        print(f"Historical snapshot prepared from {version}.")
        print(f"Drivers normalized: {len(drivers)}")
        print("Season shells generated. Expand this normalizer as additional historical UI is added.")

if __name__ == "__main__":
    main()
