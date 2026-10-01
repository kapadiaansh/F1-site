#!/usr/bin/env python3
"""
Fetch publisher-provided Formula 1 RSS feeds and generate news.js.

The site stores only:
- headline
- canonical article URL
- source
- publication time
- short RSS-provided summary

Full articles remain on the publishers' sites.
"""

from __future__ import annotations
import html
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from email.utils import parsedate_to_datetime

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "news.js"

FEEDS = [
    ("Motorsport.com", "https://www.motorsport.com/rss/f1/news/"),
    ("Autosport", "https://www.autosport.com/rss/f1/news/"),
]

UA = "APEX-F1-News-Aggregator/1.0 (+https://kapadiaansh.github.io/F1-site/)"

def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml"})
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()

def clean_text(value: str | None, limit: int = 280) -> str:
    value = value or ""
    value = re.sub(r"<[^>]+>", " ", value)
    value = html.unescape(value)
    value = re.sub(r"\s+", " ", value).strip()
    if len(value) > limit:
        value = value[:limit].rsplit(" ",1)[0] + "…"
    return value

def iso_date(value: str | None) -> str:
    if not value:
        return datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00","Z")
    except Exception:
        return datetime.now(timezone.utc).isoformat().replace("+00:00","Z")

def parse_feed(source: str, content: bytes) -> list[dict]:
    root = ET.fromstring(content)
    items = []
    for item in root.findall(".//item"):
        title = clean_text(item.findtext("title"), 180)
        url = clean_text(item.findtext("link"), 500)
        published = iso_date(item.findtext("pubDate") or item.findtext("date"))
        summary = clean_text(item.findtext("description"), 260)
        if not title or not url:
            continue
        items.append({
            "title": title,
            "url": url,
            "source": source,
            "published": published,
            "summary": summary,
        })
    return items

def main():
    collected = []
    errors = []
    for source, url in FEEDS:
        try:
            collected.extend(parse_feed(source, fetch(url)))
        except Exception as exc:
            errors.append(f"{source}: {exc}")

    # Keep previous feed if every upstream source is down.
    if not collected:
        if OUT.exists():
            print("All feeds failed; keeping last known-good news.js")
            for err in errors:
                print(err)
            return
        raise SystemExit("No feeds could be fetched and no prior news.js exists.")

    deduped = {}
    for item in collected:
        key = re.sub(r"[^a-z0-9]+"," ",item["title"].lower()).strip()
        # Prefer the newest version if the same headline appears twice.
        if key not in deduped or item["published"] > deduped[key]["published"]:
            deduped[key] = item

    items = sorted(deduped.values(), key=lambda x: x["published"], reverse=True)[:24]
    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),
        "items": items,
    }
    OUT.write_text(
        "window.F1_NEWS = " + json.dumps(payload, ensure_ascii=False, separators=(",",":")) + ";\n",
        encoding="utf-8"
    )
    print(f"Wrote {len(items)} F1 stories.")
    if errors:
        print("Partial source errors:", *errors, sep="\n- ")

if __name__ == "__main__":
    main()
