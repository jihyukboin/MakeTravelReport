#!/usr/bin/env python3
"""Build relational SQLite/CSV/MySQL exports from validated API raw pages."""
import csv
import datetime as dt
import gzip
import json
import math
from pathlib import Path
import re
import sqlite3
from collect import ROOT, DATA, parse

TABLES = ['regions','districts','categories','content_types','attractions','attraction_images','photos','keywords','photo_keywords','charging_operators','charging_stations','chargers','charger_status','astronomy_locations','sun_times']

def rows(name):
    for p in sorted((DATA / 'raw' / name).rglob('*.gz')):
        with gzip.open(p, 'rb') as f:
            yield from parse(f.read())[0]

def text(v):
    return str(v).strip() if v is not None and str(v).strip() else None

def number(v):
    try:
        n = float(v)
        return n if math.isfinite(n) else None
    except (ValueError, TypeError):
        return None

def integer(v):
    n = number(v)
    return int(n) if n is not None and n.is_integer() else None

def timestamp(v):
    if not v or str(v).startswith('0000'):
        return None
    try:
        return dt.datetime.strptime(str(v).strip(), '%Y%m%d%H%M%S').isoformat(' ')
    except ValueError:
        return None

def clock(v):
    s = str(v or '').strip()
    if not s.isdigit() or len(s) not in (4,6):
        return None
    try:
        return dt.datetime.strptime(s, '%H%M' if len(s) == 4 else '%H%M%S').strftime('%H:%M:%S')
    except ValueError:
        return None

def yes(v):
    return {'Y':1, 'N':0}.get(v)

def coord(v, bound):
    n = number(v)
    return n if n is not None and n != 0 and -bound <= n <= bound else None

def build():
    for n in ('districts','categories','attractions','photos','chargers','sun'):
        m = DATA / 'raw' / n / 'manifest.json'
        if not m.exists() or json.loads(m.read_text())['status'] != 'complete':
            raise RuntimeError(f'{n}: complete collection manifest required')
    output = DATA / 'normalized'
    output.mkdir(exist_ok=True)
    tmp = output / 'enjoytrip.tmp.sqlite3'
    tmp.unlink(missing_ok=True)
    db = sqlite3.connect(tmp)
    db.execute('PRAGMA foreign_keys=ON')
    db.executescript((ROOT / 'schema.sql').read_text())
    def put(t, vals, ignore=False):
        db.execute(f"INSERT OR {'IGNORE' if ignore else 'REPLACE'} INTO {t} VALUES ({','.join('?' for _ in vals)})", vals)
    for r in rows('districts'):
        put('regions',(r['lDongRegnCd'],r['lDongRegnNm']),True)
        put('districts',(r['lDongRegnCd'],r['lDongSignguCd'],r['lDongSignguNm']),True)
    for r in rows('categories'):
        parent = None
        for level in (1,2,3):
            c = r[f'lclsSystm{level}Cd']
            put('categories',(c,r[f'lclsSystm{level}Nm'],parent,level),True)
            parent = c
    types = {'12':'관광지','14':'문화시설','15':'축제·공연·행사','25':'여행코스','28':'레포츠','32':'숙박','38':'쇼핑','39':'음식점'}
    for k,v in types.items():
        put('content_types',(k,v))
    ids = set()
    for r in rows('attractions'):
        cid = r['contentid']
        if cid in ids:
            raise RuntimeError(f'Duplicate attraction {cid}; pagination changed')
        ids.add(cid)
        reg, dist = text(r.get('lDongRegnCd')), text(r.get('lDongSignguCd'))
        if reg:
            put('regions',(reg,None),True)
        if reg and dist:
            put('districts',(reg,dist,None),True)
        else:
            dist = None
        parent = None
        for level in (1,2,3):
            c = text(r.get(f'lclsSystm{level}'))
            if c:
                put('categories',(c,None,parent,level),True)
                parent = c
        typ = str(r['contenttypeid'])
        if typ not in types:
            raise RuntimeError(f'Unknown content type {typ}')
        put('attractions',(cid,typ,r['title'],reg,dist,parent,text(r.get('addr1')),text(r.get('addr2')),text(r.get('zipcode')),text(r.get('tel')),coord(r.get('mapx'),180),coord(r.get('mapy'),90),timestamp(r.get('createdtime')),timestamp(r.get('modifiedtime'))))
        if r.get('firstimage') or r.get('firstimage2'):
            put('attraction_images',(cid,text(r.get('firstimage')),text(r.get('firstimage2')),text(r.get('cpyrhtDivCd'))))
    db.commit()
    print('attractions normalized',len(ids),flush=True)
    ids = set()
    for r in rows('photos'):
        pid = r['galContentId']
        if pid in ids:
            raise RuntimeError(f'Duplicate photo {pid}; pagination changed')
        ids.add(pid)
        month = text(r.get('galPhotographyMonth'))
        month = month[:4]+'-'+month[4:6] if month and len(month) == 6 else None
        put('photos',(pid,text(r.get('galTitle')),text(r.get('galWebImageUrl')),month,text(r.get('galPhotographyLocation')),text(r.get('galPhotographer')),timestamp(r.get('galCreatedtime')),timestamp(r.get('galModifiedtime'))))
        for keyword in set(x.strip() for x in (r.get('galSearchKeyword') or '').split(',') if x.strip()):
            if len(keyword)>255:
                raise RuntimeError('Keyword exceeds schema width')
            put('keywords',(keyword,),True)
            put('photo_keywords',(pid,keyword),True)
    db.commit()
    print('photos normalized',len(ids),flush=True)
    ids = set()
    for r in rows('chargers'):
        sid, cid = r['statId'], r['chgerId']
        if (sid,cid) in ids:
            raise RuntimeError(f'Duplicate charger {sid}/{cid}; pagination changed')
        ids.add((sid,cid))
        operator = text(r.get('busiId'))
        if operator:
            put('charging_operators',(operator,text(r.get('busiNm') or r.get('bnm')),text(r.get('busiCall'))),True)
        put('charging_stations',(sid,text(r.get('statNm')),operator,text(r.get('addr')),coord(r.get('lat'),90),coord(r.get('lng'),180),text(r.get('useTime')),text(r.get('zcode')),text(r.get('zscode')),yes(r.get('parkingFree')),yes(r.get('limitYn')),text(r.get('limitDetail')),text(r.get('kind')),text(r.get('kindDetail')),text(r.get('note'))),True)
        put('chargers',(sid,cid,text(r.get('chgerType')),number(r.get('output')),text(r.get('method')),text(r.get('location')),text(r.get('addrDetail')),yes(r.get('delYn')),text(r.get('delDetail')),yes(r.get('trafficYn')),integer(r.get('year')),text(r.get('floorNum')),text(r.get('floorType')),text(r.get('maker'))))
        put('charger_status',(sid,cid,text(r.get('stat')),timestamp(r.get('statUpdDt')),timestamp(r.get('lastTsdt')),timestamp(r.get('lastTedt')),timestamp(r.get('nowTsdt'))))
    db.commit()
    print('chargers normalized',len(ids),flush=True)
    for r in rows('sun'):
        loc = r['location']
        put('astronomy_locations',(loc,coord(r.get('latitudeNum'),90),coord(r.get('longitudeNum'),180)),True)
        day = dt.datetime.strptime(r['locdate'],'%Y%m%d').date().isoformat()
        times = [clock(r.get(k)) for k in ('sunrise','sunset','suntransit','moonrise','moonset','moontransit','civilm','civile','nautm','naute','astm','aste')]
        put('sun_times',(loc,day,*times))
    db.commit()
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
    assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    counts = {t:db.execute(f'SELECT count(*) FROM {t}').fetchone()[0] for t in TABLES}
    for dataset,table in [('attractions','attractions'),('photos','photos'),('chargers','chargers'),('sun','sun_times')]:
        manifest=json.loads((DATA/'raw'/dataset/'manifest.json').read_text())
        if counts[table] != manifest['downloaded']:
            raise RuntimeError(f'{dataset}: normalization count mismatch')
    for t, cols in [('attractions','region_code, district_code'),('attractions','latitude, longitude'),('charging_stations','latitude, longitude'),('photo_keywords','keyword'),('sun_times','observation_date')]:
        db.execute(f'CREATE INDEX idx_{t}_{cols.replace(", ","_")} ON {t} ({cols})')
    db.commit()
    export(db, output)
    (output / 'counts.json').write_text(json.dumps(counts,ensure_ascii=False,indent=2)+'\n')
    db.close()
    tmp.replace(output/'enjoytrip.sqlite3')
    print(json.dumps(counts,ensure_ascii=False,indent=2),flush=True)

def export(db, output):
    # Hex UTF-8 literals preserve quotes, backslashes, line breaks and Unicode independently of SQL mode.
    def literal(v):
        if v is None:
            return 'NULL'
        if isinstance(v,(int,float)):
            return str(v)
        return "CONVERT(X'"+str(v).encode().hex()+"' USING utf8mb4)"
    with gzip.open(output/'enjoytrip.mysql.sql.gz','wt',encoding='utf-8') as sql:
        sql.write('SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n')
        for t in reversed(TABLES):
            sql.write(f'DROP TABLE IF EXISTS `{t}`;\n')
        sql.write((ROOT/'schema.sql').read_text().replace(');', ') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;')+'\nSET FOREIGN_KEY_CHECKS=1;\n')
        for t in TABLES:
            cur=db.execute(f'SELECT * FROM {t}')
            cols=[x[0] for x in cur.description]
            with (output/f'{t}.csv').open('w',newline='',encoding='utf-8-sig') as f:
                writer=csv.writer(f);writer.writerow(cols)
                batch=[]
                for row in cur:
                    writer.writerow(['\\N' if x is None else x for x in row])
                    batch.append('('+','.join(literal(x) for x in row)+')')
                    if len(batch)==250:
                        sql.write(f'INSERT INTO `{t}` VALUES '+','.join(batch)+';\n');batch=[]
                if batch:
                    sql.write(f'INSERT INTO `{t}` VALUES '+','.join(batch)+';\n')
        for t,cols in [('attractions','region_code, district_code'),('attractions','latitude, longitude'),('charging_stations','latitude, longitude'),('photo_keywords','keyword'),('sun_times','observation_date')]:
            sql.write(f'CREATE INDEX idx_{t}_{cols.replace(", ","_")} ON {t} ({cols});\n')

if __name__=='__main__':
    build()
