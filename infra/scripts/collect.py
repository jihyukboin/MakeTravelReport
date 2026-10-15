#!/usr/bin/env python3
"""Download paginated national datasets; validated, resumable raw responses."""
import argparse
import concurrent.futures
import datetime as dt
import gzip
import hashlib
import json
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
TOUR = 'https://apis.data.go.kr/B551011/KorService2/'
PHOTO = 'https://apis.data.go.kr/B551011/PhotoGalleryService1/'
SUN = 'https://apis.data.go.kr/B090041/openapi/service/RiseSetInfoService/getAreaRiseSetInfo'

def env():
    return dict(line.split('=', 1) for line in (ROOT / '.env').read_text().splitlines()
                if line.strip() and not line.startswith('#'))

def parse(raw):
    if raw.lstrip().startswith(b'{'):
        obj = json.loads(raw)
        if 'response' not in obj:
            h = obj.get('OpenAPI_ServiceResponse', {}).get('cmmMsgHeader', {})
            raise ValueError(f"API {h.get('returnReasonCode')}: {h.get('errMsg', 'invalid response')}")
        h = obj['response']['header']
        if str(h.get('resultCode')) not in ('00', '0000', '0'):
            raise ValueError(f"API {h.get('resultCode')}: {h.get('resultMsg')}")
        body = obj['response']['body']
        items = (body.get('items') or {}).get('item', []) if isinstance(body.get('items'), dict) else []
        return ([items] if isinstance(items, dict) else items), int(body.get('totalCount', 0))
    root = ET.fromstring(raw)
    error = root.find('.//cmmMsgHeader')
    if error is not None:
        raise ValueError(f"API {error.findtext('returnReasonCode')}: {error.findtext('errMsg')}")
    code = root.findtext('.//resultCode')
    if code not in ('00', '0000', '0'):
        raise ValueError(f"API {code}: {root.findtext('.//resultMsg')}")
    return [{c.tag: (c.text or '').strip() for c in i} for i in root.findall('.//items/item')], int(root.findtext('.//totalCount', '0'))

def fetch(url, params, path):
    if path.exists():
        with gzip.open(path, 'rb') as f:
            return parse(f.read())
    path.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(4):
        try:
            request = urllib.request.Request(url + '?' + urllib.parse.urlencode(params), headers={'User-Agent': 'EnjoyTrip-dataset/1.0'})
            with urllib.request.urlopen(request, timeout=90) as r:
                raw = r.read()
            result = parse(raw)
            tmp = path.with_suffix('.tmp')
            with gzip.open(tmp, 'wb') as f:
                f.write(raw)
            tmp.replace(path)
            return result
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            # Never log exception URLs (they contain credentials).
            if isinstance(exc, ValueError) and any(f'API {c}:' in str(exc) for c in ('20', '22', '30', '31')):
                raise RuntimeError(str(exc)) from None
            if attempt == 3:
                raise RuntimeError(f'{path.name}: {type(exc).__name__}; retries exhausted') from None
            time.sleep(2 ** attempt)

def paged(name, url, params, page_size):
    folder = DATA / 'raw' / name
    total_rows, total, page, hashes = 0, None, 1, set()
    while total is None or total_rows < total:
        rows, count = fetch(url, dict(params, pageNo=page, numOfRows=page_size), folder / f'{page:05d}.gz')
        if total is None:
            total = count
        if not rows and total_rows < total:
            raise RuntimeError(f'{name}: unexpected empty page {page}')
        digest = hashlib.sha256(json.dumps(rows, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        if rows and digest in hashes:
            raise RuntimeError(f'{name}: repeated page {page}')
        hashes.add(digest)
        total_rows += len(rows)
        print(f'{name}: {total_rows}/{total} (page {page})', flush=True)
        page += 1
        if page > 950:
            raise RuntimeError(f'{name}: daily request budget guard')
        time.sleep(.15)
    if total_rows != total:
        raise RuntimeError(f'{name}: expected {total}, got {total_rows}; snapshot changed')
    report = dict(dataset=name, status='complete', expected=total, downloaded=total_rows, pages=page-1, endpoint=url, collected_at=dt.datetime.now(dt.timezone.utc).isoformat())
    folder.joinpath('manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    return report

def collect_sun(start, end, locations):
    key = env()['DATA_GO_KR_SERVICE_KEY']
    report = dict(dataset='sun', start=start.isoformat(), end=end.isoformat(), locations=locations, expected=(end-start).days * len(locations) + len(locations), downloaded=0, unavailable=[], status='running')
    if report['expected'] > 9500:
        raise RuntimeError('Sun range exceeds 9,500-call budget; choose smaller date windows')
    for offset in range((end-start).days+1):
        day = (start+dt.timedelta(days=offset)).strftime('%Y%m%d')
        def one(location):
            path = DATA / 'raw' / 'sun' / day / f'{location}.gz'
            cached = path.exists()
            rows, total = fetch(SUN, dict(serviceKey=key, locdate=day, location=location), path)
            if not rows and total == 0:
                if not cached:
                    time.sleep(.2)
                return (0, location)
            if len(rows) != 1 or rows[0].get('location') != location or rows[0].get('locdate') != day:
                raise RuntimeError(f'Sun missing or mismatched record: {location} {day}')
            if not cached:
                time.sleep(.2)
            return (1, location)
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
            for count, location in ex.map(one, locations):
                report['downloaded'] += count
                if count == 0:
                    report['unavailable'].append(dict(date=day, location=location))
        print(f"sun: {day} {report['downloaded']}/{report['expected']}", flush=True)
    report['status'] = 'complete'
    (DATA / 'raw' / 'sun' / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    return report

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--sun-start', type=dt.date.fromisoformat)
    p.add_argument('--sun-end', type=dt.date.fromisoformat)
    p.add_argument('--sun-locations', nargs='+', default=json.loads((ROOT / 'sun_locations.json').read_text()))
    p.add_argument('--only', choices=['national', 'sun'], default='national')
    args = p.parse_args()
    DATA.mkdir(exist_ok=True)
    if args.only == 'sun':
        if not args.sun_start or not args.sun_end or not args.sun_locations or args.sun_end < args.sun_start:
            p.error('sun requires valid --sun-start, --sun-end and --sun-locations')
        collect_sun(args.sun_start, args.sun_end, args.sun_locations)
        return
    common = dict(serviceKey=env()['DATA_GO_KR_SERVICE_KEY'], MobileOS='ETC', MobileApp='EnjoyTrip', _type='json')
    jobs = [
        ('districts', TOUR+'ldongCode2', dict(common, lDongListYn='Y'), 1000),
        ('categories', TOUR+'lclsSystmCode2', dict(common, lclsSystmListYn='Y'), 1000),
        ('attractions', TOUR+'areaBasedSyncList2', dict(common, showflag='1', arrange='A'), 1000),
        ('photos', PHOTO+'gallerySyncDetailList1', dict(common, showflag='1'), 1000),
        ('chargers', 'https://apis.data.go.kr/B552584/EvCharger/getChargerInfo', dict(serviceKey=env()['DATA_GO_KR_SERVICE_KEY']), 9999),
    ]
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
        futures = {ex.submit(paged, *job): job[0] for job in jobs}
        for f in concurrent.futures.as_completed(futures):
            name = futures[f]
            try:
                results.append(f.result())
            except Exception as exc:
                results.append(dict(dataset=name, status='failed', error=str(exc)))
                print(name, 'FAILED', str(exc), flush=True)
    (DATA / 'collection.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
    if any(r['status'] != 'complete' for r in results):
        raise SystemExit(1)

if __name__ == '__main__':
    main()
