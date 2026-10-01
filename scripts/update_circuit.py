#!/usr/bin/env python3
"""
Download a matching reusable circuit SVG from the f1db/f1-circuits-svg repository.
The repository is CC BY 4.0. This script searches the GitHub tree rather than
assuming a fragile filename.
"""

import json, urllib.parse, urllib.request, re
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"assets"/"circuits"/"current.svg"
MEDIA=ROOT/"media.js"
UA="APEX-Circuit-Updater/1.0"
QUERY="sepang"

def get_json(url):
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/vnd.github+json"})
    with urllib.request.urlopen(req,timeout=45) as r:return json.load(r)

def get_bytes(url):
    req=urllib.request.Request(url,headers={"User-Agent":UA})
    with urllib.request.urlopen(req,timeout=60) as r:return r.read()

def main():
    repo=get_json("https://api.github.com/repos/f1db/f1-circuits-svg")
    branch=repo.get("default_branch","main")
    tree=get_json(f"https://api.github.com/repos/f1db/f1-circuits-svg/git/trees/{branch}?recursive=1")
    paths=[x["path"] for x in tree.get("tree",[]) if x.get("type")=="blob" and x["path"].lower().endswith(".svg")]
    candidates=[p for p in paths if QUERY in p.lower() and ("white-outline" in p.lower() or "white_outline" in p.lower())]
    if not candidates:candidates=[p for p in paths if QUERY in p.lower()]
    if not candidates:raise SystemExit("No Sepang SVG found.")
    path=candidates[0]
    url=f"https://raw.githubusercontent.com/f1db/f1-circuits-svg/{branch}/{urllib.parse.quote(path,safe='/')}"
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_bytes(get_bytes(url))
    print("Downloaded circuit asset:",path)

if __name__=="__main__":
    main()
