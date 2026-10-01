#!/usr/bin/env python3
"""
Generate an all-year "On This Day" Formula 1 archive from F1DB and licensed
Wikimedia Commons media for the current editorial date (America/Toronto).

The script:
1. downloads the latest F1DB CSV release,
2. discovers a race table by column signatures,
3. creates history.js grouped by MM-DD,
4. searches Wikimedia Commons for reusable event/venue images,
5. writes media.js with source, creator and license attribution.

If F1DB or Commons is temporarily unavailable, existing files are preserved.
"""

from __future__ import annotations
import csv, html, io, json, re, urllib.parse, urllib.request, zipfile
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
HISTORY_OUT=ROOT/"history.js"
MEDIA_OUT=ROOT/"media.js"
UA="APEX-F1-History-Media/1.0 (+https://kapadiaansh.github.io/F1-site/)"
TZ=ZoneInfo("America/Toronto")
GITHUB_API="https://api.github.com/repos/f1db/f1db/releases/latest"
COMMONS_API="https://commons.wikimedia.org/w/api.php"

def get_json(url,params=None):
    if params:
        url += ("&" if "?" in url else "?")+urllib.parse.urlencode(params)
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/json"})
    with urllib.request.urlopen(req,timeout=45) as r:return json.load(r)

def download(url):
    req=urllib.request.Request(url,headers={"User-Agent":UA})
    with urllib.request.urlopen(req,timeout=180) as r:return r.read()

def norm(s):return re.sub(r"[^a-z0-9]","",str(s).lower())

def find_key(headers,candidates):
    nh={norm(h):h for h in headers}
    for c in candidates:
        if norm(c) in nh:return nh[norm(c)]
    for c in candidates:
        nc=norm(c)
        for k,h in nh.items():
            if k.endswith(nc) or nc.endswith(k):return h
    return None

def strip_html(value):
    value=re.sub(r"<[^>]+>"," ",value or "")
    return re.sub(r"\s+"," ",html.unescape(value)).strip()

def race_rows():
    release=get_json(GITHUB_API)
    asset=next((a for a in release.get("assets",[]) if a["name"]=="f1db-csv.zip"),None)
    if not asset:raise RuntimeError("F1DB CSV release missing.")
    blob=download(asset["browser_download_url"])
    best=None
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        for name in z.namelist():
            if not name.endswith(".csv"):continue
            text=z.read(name).decode("utf-8-sig",errors="replace")
            reader=csv.DictReader(io.StringIO(text));rows=list(reader)
            h=reader.fieldnames or []
            date=find_key(h,["date","raceDate"])
            year=find_key(h,["year"])
            namek=find_key(h,["name","raceName","grandPrixName"])
            roundk=find_key(h,["round"])
            if not all([date,namek]):continue
            score=(5 if "race" in name.lower() else 0)+(2 if year else 0)+(2 if roundk else 0)+min(len(rows),100)/100
            if best is None or score>best[0]:best=(score,rows,h,date,year,namek,roundk)
    if not best:raise RuntimeError("Could not discover F1DB race table.")
    return release,best[1:]

def build_history():
    release,parts=race_rows()
    rows,h,datek,yeark,namek,roundk=parts
    days={}
    for row in rows:
        date=(row.get(datek) or "")[:10]
        m=re.match(r"(\d{4})-(\d{2})-(\d{2})",date)
        if not m:continue
        year=int(m.group(1)); key=f"{m.group(2)}-{m.group(3)}"
        name=(row.get(namek) or "Formula 1 Grand Prix").strip()
        title=f"{name} was held on this date"
        text=f"Formula 1 held the {name} on {date}. Open the event source for the full historical context and results."
        # F1DB rows often include a Wikipedia URL; detect one safely.
        url=""
        for k,v in row.items():
            if "url" in norm(k) and str(v).startswith("http"):
                url=v;break
        days.setdefault(key,[]).append({
            "year":year,"category":"RACE HISTORY","title":title,"text":text,
            "sourceUrl":url or "https://www.formula1.com/","event":f"{year} {name}"
        })
    for key in days:days[key].sort(key=lambda x:x["year"],reverse=True)
    payload={
        "generatedAt":datetime.now(TZ).isoformat(),
        "timezone":"America/Toronto",
        "source":"F1DB",
        "version":release.get("tag_name"),
        "days":days
    }
    return payload

def commons_image(query):
    params={
        "action":"query","format":"json","generator":"search","gsrsearch":query,
        "gsrnamespace":6,"gsrlimit":8,"prop":"imageinfo",
        "iiprop":"url|extmetadata","iiurlwidth":1600
    }
    data=get_json(COMMONS_API,params)
    pages=(data.get("query") or {}).get("pages") or {}
    candidates=[]
    for page in pages.values():
        info=(page.get("imageinfo") or [{}])[0]
        meta=info.get("extmetadata") or {}
        license_name=strip_html((meta.get("LicenseShortName") or {}).get("value",""))
        usage=(meta.get("UsageTerms") or {}).get("value","")
        combined=(license_name+" "+usage).lower()
        if not any(x in combined for x in ["public domain","cc by","cc0","creative commons attribution"]):
            continue
        image_url=info.get("thumburl") or info.get("url")
        if not image_url:continue
        creator=strip_html((meta.get("Artist") or {}).get("value",""))
        description=strip_html((meta.get("ImageDescription") or {}).get("value",""))
        license_url=(meta.get("LicenseUrl") or {}).get("value","")
        title=page.get("title","")
        page_url="https://commons.wikimedia.org/wiki/"+urllib.parse.quote(title.replace(" ","_"),safe=":/")
        candidates.append({
            "url":image_url,"page":page_url,"alt":description or query,
            "creator":creator,"license":license_name or "Reusable Wikimedia Commons media",
            "licenseUrl":license_url
        })
    return candidates[0] if candidates else None

def main():
    try:
        history=build_history()
        HISTORY_OUT.write_text("window.F1_HISTORY = "+json.dumps(history,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")
        print("History dates generated:",len(history["days"]))
    except Exception as exc:
        print("History update failed; keeping previous:",exc)
        history=None

    # Preserve existing media as fallback.
    media={"updatedAt":datetime.now(TZ).isoformat(),"hero":None,"history":{}}
    if MEDIA_OUT.exists():
        raw=MEDIA_OUT.read_text(encoding="utf-8")
        m=re.search(r"window\.F1_MEDIA\s*=\s*(\{.*\});?\s*$",raw,re.S)
        if m:
            try:media=json.loads(m.group(1))
            except:pass
    media["updatedAt"]=datetime.now(TZ).isoformat()

    try:
        hero=commons_image("Sepang International Circuit Formula 1")
        if hero:media["hero"]=hero
    except Exception as exc:print("Hero image search failed:",exc)

    if history:
        now=datetime.now(TZ)
        key=f"{now.month:02d}-{now.day:02d}"
        for story in history["days"].get(key,[])[:3]:
            try:
                image=commons_image(story["event"])
                if image:media.setdefault("history",{})[story["event"]]=image
            except Exception as exc:print("Commons event search failed:",story["event"],exc)

    MEDIA_OUT.write_text("window.F1_MEDIA = "+json.dumps(media,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")

if __name__=="__main__":
    main()
