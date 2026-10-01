#!/usr/bin/env python3
"""
Build a verified current-season overlay from the latest F1DB CSV release.

The parser discovers tables by filenames + column signatures rather than assuming
one hard-coded schema. If the expected relationships cannot be validated, the
script exits without touching online-data.js. The website then keeps data.js as
its last-known-good fallback.
"""

from __future__ import annotations
import csv, io, json, re, tempfile, urllib.request, zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "online-data.js"
API = "https://api.github.com/repos/f1db/f1db/releases/latest"
UA = "APEX-F1DB-Normalizer/2.0"
YEAR = datetime.now(timezone.utc).year

def request_json(url):
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/vnd.github+json"})
    with urllib.request.urlopen(req,timeout=45) as r: return json.load(r)

def download(url):
    req=urllib.request.Request(url,headers={"User-Agent":UA})
    with urllib.request.urlopen(req,timeout=180) as r: return r.read()

def norm(s): return re.sub(r"[^a-z0-9]","",str(s).lower())

def find_key(headers, candidates):
    nh={norm(h):h for h in headers}
    for c in candidates:
        if norm(c) in nh: return nh[norm(c)]
    for c in candidates:
        nc=norm(c)
        for k,h in nh.items():
            if k.endswith(nc) or nc.endswith(k): return h
    return None

def read_tables(blob):
    tables=[]
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        for name in z.namelist():
            if not name.lower().endswith(".csv"): continue
            raw=z.read(name).decode("utf-8-sig",errors="replace")
            reader=csv.DictReader(io.StringIO(raw))
            rows=list(reader)
            if reader.fieldnames:
                tables.append({"name":name.lower(),"headers":reader.fieldnames,"rows":rows})
    return tables

def choose(tables, filename_words, required_groups):
    best=None
    for t in tables:
        score=sum(3 for w in filename_words if w in t["name"])
        for group in required_groups:
            if find_key(t["headers"],group): score+=2
            else: score-=5
        if best is None or score>best[0]: best=(score,t)
    return best[1] if best and best[0]>=0 else None

def val(row,key,default=None):
    return row.get(key,default) if key else default

def as_int(v,default=None):
    try: return int(float(str(v)))
    except: return default

def as_float(v,default=0):
    try: return float(str(v))
    except: return default

def driver_name(row, first_key, last_key, full_key):
    full=val(row,full_key)
    if full: return full
    return f"{val(row,first_key,'')} {val(row,last_key,'')}".strip()

def main():
    release=request_json(API)
    asset=next((a for a in release.get("assets",[]) if a["name"]=="f1db-csv.zip"),None)
    if not asset: raise SystemExit("F1DB CSV asset missing.")
    tables=read_tables(download(asset["browser_download_url"]))

    races=choose(tables,["race"],[["year"],["round"],["date","raceDate"],["id","raceId"],["name","raceName","grandPrixName"]])
    drivers=choose(tables,["driver"],[["driverId","id"],["firstName","forename","givenName","name"]])
    results=choose(tables,["result"],[["raceId"],["driverId"],["position","positionNumber","positionDisplayOrder"]])
    driver_st=choose(tables,["driver","standing"],[["driverId"],["position","positionNumber"],["points"]])
    constructors=choose(tables,["constructor"],[["constructorId","id"],["name","fullName"]])
    constructor_st=choose(tables,["constructor","standing"],[["constructorId"],["position","positionNumber"],["points"]])

    if not all([races,drivers,results]):
        raise SystemExit("Could not confidently identify core F1DB CSV tables; keeping previous online-data.js.")

    # Key discovery
    rh=races["headers"]
    race_id=find_key(rh,["raceId","id"])
    race_year=find_key(rh,["year"])
    race_round=find_key(rh,["round"])
    race_date=find_key(rh,["date","raceDate"])
    race_name=find_key(rh,["name","raceName","grandPrixName"])
    race_circuit=find_key(rh,["circuitName","circuit","circuitId"])

    drh=drivers["headers"]
    driver_id=find_key(drh,["driverId","id"])
    first=find_key(drh,["firstName","forename","givenName"])
    last=find_key(drh,["lastName","surname","familyName"])
    full=find_key(drh,["fullName","name"])
    code=find_key(drh,["code","abbreviation"])
    number=find_key(drh,["number","permanentNumber"])
    nationality=find_key(drh,["nationality","country"])

    driver_map={str(val(r,driver_id)):r for r in drivers["rows"]}

    rr=[r for r in races["rows"] if as_int(val(r,race_year))==YEAR]
    if not rr: raise SystemExit(f"No {YEAR} races found; keeping fallback.")
    rr.sort(key=lambda r: as_int(val(r,race_round),999))
    race_map={str(val(r,race_id)):r for r in rr}

    resh=results["headers"]
    res_race=find_key(resh,["raceId"])
    res_driver=find_key(resh,["driverId"])
    res_pos=find_key(resh,["position","positionNumber","positionDisplayOrder"])
    res_points=find_key(resh,["points"])
    res_time=find_key(resh,["time","gap","timeMillis"])
    res_constructor=find_key(resh,["constructorId"])

    by_race={}
    for row in results["rows"]:
        rid=str(val(row,res_race))
        if rid in race_map: by_race.setdefault(rid,[]).append(row)

    completed=[r for r in rr if str(val(r,race_id)) in by_race and any(as_int(val(x,res_pos))==1 for x in by_race[str(val(r,race_id))])]
    if not completed: raise SystemExit("No completed race result found.")
    latest=completed[-1]
    latest_id=str(val(latest,race_id))
    latest_results=sorted(by_race[latest_id],key=lambda r:as_int(val(r,res_pos),999))

    # Constructor names
    con_map={}
    if constructors:
        ch=constructors["headers"]
        cid=find_key(ch,["constructorId","id"])
        cname=find_key(ch,["name","fullName"])
        con_map={str(val(r,cid)):val(r,cname,"") for r in constructors["rows"]}

    def dname(did):
        row=driver_map.get(str(did),{})
        return driver_name(row,first,last,full) or f"Driver {did}"

    races_out=[]
    for r in rr:
        rid=str(val(r,race_id))
        winner=None
        if rid in by_race:
            win=next((x for x in by_race[rid] if as_int(val(x,res_pos))==1),None)
            if win: winner=dname(val(win,res_driver))
        races_out.append({
            "round":as_int(val(r,race_round)),
            "country":"",
            "name":val(r,race_name,"Grand Prix"),
            "date":val(r,race_date),
            "winner":winner
        })

    latest_out=[]
    for row in latest_results[:10]:
        did=val(row,res_driver)
        drow=driver_map.get(str(did),{})
        latest_out.append({
            "pos":as_int(val(row,res_pos)),
            "number":as_int(val(drow,number),0),
            "name":dname(did),
            "team":con_map.get(str(val(row,res_constructor)),""),
            "time":val(row,res_time,""),
            "points":as_float(val(row,res_points),0)
        })

    overlay={
        "meta":{
            "verified":True,
            "source":"F1DB",
            "version":release.get("tag_name"),
            "generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
        },
        "races":races_out,
        "latestResult":{
            "name":val(latest,race_name,"Latest Grand Prix"),
            "date":val(latest,race_date),
            "circuit":val(latest,race_circuit,""),
            "results":latest_out
        }
    }

    # Standings overlay only if tables can be safely joined.
    if driver_st:
        sh=driver_st["headers"]
        sid=find_key(sh,["raceId"])
        sdid=find_key(sh,["driverId"])
        spos=find_key(sh,["position","positionNumber"])
        spts=find_key(sh,["points"])
        swins=find_key(sh,["wins"])
        srows=[x for x in driver_st["rows"] if not sid or str(val(x,sid))==latest_id]
        if not sid:
            sy=find_key(sh,["year"])
            if sy: srows=[x for x in srows if as_int(val(x,sy))==YEAR]
        normalized=[]
        for s in srows:
            pos=as_int(val(s,spos))
            if not pos: continue
            did=val(s,sdid); drow=driver_map.get(str(did),{})
            normalized.append({
                "pos":pos,
                "number":as_int(val(drow,number),0),
                "code":val(drow,code,""),
                "name":dname(did),
                "nationality":val(drow,nationality,""),
                "team":"",
                "points":as_float(val(s,spts),0),
                "wins":as_int(val(s,swins),0)
            })
        normalized.sort(key=lambda x:x["pos"])
        if len(normalized)>=10: overlay["drivers"]=normalized

    if constructor_st and con_map:
        sh=constructor_st["headers"]
        srid=find_key(sh,["raceId"])
        scid=find_key(sh,["constructorId"])
        spos=find_key(sh,["position","positionNumber"])
        spts=find_key(sh,["points"])
        rows=[x for x in constructor_st["rows"] if not srid or str(val(x,srid))==latest_id]
        normalized=[]
        for s in rows:
            pos=as_int(val(s,spos))
            if not pos: continue
            normalized.append({"pos":pos,"team":con_map.get(str(val(s,scid)),""),"points":as_float(val(s,spts),0)})
        normalized.sort(key=lambda x:x["pos"])
        if len(normalized)>=5: overlay["teams"]=normalized

    # Sanity checks before replacing public overlay.
    if len(overlay["latestResult"]["results"]) < 3 or len(overlay["races"]) < 10:
        raise SystemExit("Normalized payload failed sanity checks.")

    OUT.write_text("window.F1_ONLINE_DATA = "+json.dumps(overlay,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")
    print("Applied verified F1DB overlay",release.get("tag_name"))

if __name__=="__main__":
    main()
