#!/usr/bin/env python3
"""Record the real browser flow against user-managed running servers. No API mocks."""
import argparse
import json
import os
import re
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright, expect


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://localhost:3003')
    parser.add_argument('--output', type=Path, default=Path('docs/media'))
    parser.add_argument('--date', default='2026-10-15', help='A date present in the local sun_times dataset')
    args = parser.parse_args()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checkpoints = []
    errors = []
    requests = []

    with tempfile.TemporaryDirectory(prefix='enjoytrip-fonts-') as temporary, sync_playwright() as p:
        # The external address iframe also needs a system fallback font for Hangul.
        # Reuse the project's OFL font through this browser's private fontconfig.
        font_config = Path(temporary) / 'fonts.conf'
        font_directory = Path(__file__).resolve().parents[1] / 'frontend/app/fonts'
        font_config.write_text(f'<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">'
                               f'<fontconfig><include>/etc/fonts/fonts.conf</include>'
                               f'<dir>{font_directory}</dir><cachedir>{temporary}/cache</cachedir></fontconfig>')
        browser = p.chromium.launch(headless=True, slow_mo=250,
                                    env={**os.environ, 'FONTCONFIG_FILE': str(font_config)})
        context = browser.new_context(viewport={'width': 1440, 'height': 1000},
                                      record_video_dir=str(output / 'raw'),
                                      record_video_size={'width': 1440, 'height': 1000},
                                      accept_downloads=True, locale='ko-KR', timezone_id='Asia/Seoul')
        page = context.new_page()
        page.set_default_timeout(45000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: requests.append({'path': re.sub(r'/[0-9a-f-]{36}', '/{id}', response.url.split(args.base_url)[-1]),
                                                              'status': response.status}) if response.url.startswith(args.base_url) and '/api/' in response.url else None)

        def shot(name, label, target=None):
            if target is not None:
                target.scroll_into_view_if_needed()
                target.evaluate("el => { const scroller = el.closest('.trip-report'); if (scroller) scroller.scrollTop += el.getBoundingClientRect().top - 90; }")
            page.wait_for_timeout(1500)
            page.screenshot(path=str(output / f'{name}.webp'), type='jpeg', quality=88)
            # Convert the genuine screenshot to WebP without changing its content.
            from PIL import Image
            path = output / f'{name}.webp'
            with Image.open(path) as image:
                image.save(path, 'WEBP', quality=88)
            checkpoints.append({'step': name, 'label': label, 'seconds': round(time.monotonic() - started, 1)})
            print(name, label, flush=True)

        try:
            page.goto(args.base_url, wait_until='networkidle')
            expect(page.get_by_role('heading', name='어떤 여행을 기록해 볼까요?')).to_be_visible()
            shot('01-home', '홈 화면')
            page.get_by_role('button', name='로그인', exact=True).click()
            page.get_by_label('ID', exact=True).fill('test')
            page.get_by_label('PW', exact=True).fill('test')
            shot('02-login', '데모 계정 로그인')
            page.get_by_role('dialog').get_by_role('button', name='로그인', exact=True).click()
            expect(page.get_by_role('button', name='로그아웃')).to_be_visible()

            page.get_by_role('textbox', name='여행 메시지 입력').fill('전기차로 한강의 일몰을 보러 가는 여행 계획을 만들어줘')
            page.get_by_role('button', name='전송', exact=True).click()
            page.wait_for_url('**/c/*')
            chat_url = page.url
            chat_id = chat_url.rsplit('/', 1)[-1]
            page.get_by_role('button', name='출발지 주소 검색').click()
            page.wait_for_timeout(2500)
            frame = next(frame for frame in page.frames if 'postcode.map.kakao.com/search' in frame.url)
            frame.locator('input[type="text"]').fill('서울 중구 세종대로 110')
            frame.get_by_role('button', name='검색', exact=True).click()
            address = frame.get_by_role('button', name=re.compile(r'^서울 중구 세종대로 110'))
            expect(address).to_be_visible()
            shot('03-address-search', '실제 카카오 우편번호 검색')
            address.click()
            shot('04-departure', '서울시청 출발지 선택', page.get_by_role('button', name='출발지로 설정'))
            page.get_by_role('button', name='출발지로 설정').click()
            page.locator('input[type="date"]').fill(args.date)
            page.get_by_role('slider').fill('80')
            vehicle = page.get_by_role('button', name=re.compile('Electrified G80'))
            shot('05-vehicle', '차량·배터리 80%·여행 날짜 선택', vehicle)
            vehicle.click()
            atmosphere = page.get_by_role('button', name=re.compile('자연 속에서 쉬어가기'))
            shot('06-atmosphere', '자연 속에서 쉬어가는 분위기 선택', atmosphere)
            atmosphere.click()
            detail = page.get_by_role('button', name=re.compile('탁 트인 물가'))
            shot('07-preference', '하천·해양 풍경 취향 선택', detail)
            detail.click()
            moment = page.get_by_role('button', name=re.compile('하루를 물들이는 일몰'))
            shot('08-moment', '일몰 선택')
            with page.expect_response(lambda r: '/api/recommendations' in r.url and r.request.method == 'POST') as recommendation:
                moment.click()
            response = recommendation.value
            assert response.status == 200, response.status
            result = response.json()
            assert len(result['destinations']) == 1, result
            plan_link = page.get_by_role('link', name='계획서 보러가기')
            expect(plan_link).to_be_visible()
            shot('09-recommendation', '실제 MySQL 기반 여행지·충전소 추천', page.get_by_role('heading', level=2).last)
            shot('10-charger', '충전소·일몰 시각·계획서 연결', plan_link)
            # Allow the automatic save to finish, then prove persistence by a real reload.
            page.wait_for_timeout(2000)
            page.reload(wait_until='networkidle')
            expect(page.get_by_role('link', name='계획서 보러가기')).to_be_visible()
            shot('11-restored-chat', '새로고침 후 대화·추천 결과 복원', page.get_by_role('heading', level=2).last)

            with page.expect_popup() as popup_info:
                page.get_by_role('link', name='계획서 보러가기').click()
            popup = popup_info.value
            popup.wait_for_url('**/result')
            report_url = popup.url
            # Display the real opened report in the recorded tab for one continuous video.
            page.goto(report_url, wait_until='domcontentloaded')
            popup.close()
            expect(page.get_by_role('heading', level=1)).to_be_visible(timeout=90000)
            page.wait_for_function('Array.from(document.images).every(img => img.complete)', timeout=45000)
            shot('12-report-cover', '서버에서 렌더링한 여행 계획서')
            shot('13-report-vehicle', '차량 정보와 여행 동선', page.get_by_role('heading', name='오늘의 여행 파트너'))
            shot('14-report-routes', '실제 TMAP 도로 경로·지도·안내', page.get_by_role('heading', name='출발지 → 여행지'))
            shot('15-report-charging', '충전소와 일몰 계획', page.get_by_role('heading', name='다음 여정을 위한 여유'))
            route_maps = page.get_by_role('img', name=re.compile('자동차 이동 경로 지도')).count()
            route_unavailable = page.get_by_text('현재 이 구간의 도로 경로를 불러오지 못했습니다.').count()
            page.get_by_role('link', name='PDF 다운로드').scroll_into_view_if_needed()
            with page.expect_download(timeout=120000) as download_info:
                page.get_by_role('link', name='PDF 다운로드').click()
            download = download_info.value
            assert download.failure() is None, download.failure()
            download.save_as(str(output / 'sample-travel-plan.pdf'))
            shot('16-pdf-download', '실제 여행 계획서 PDF 다운로드 완료')

            from pypdf import PdfReader
            pdf = PdfReader(output / 'sample-travel-plan.pdf')
            text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
            assert result['destinations'][0]['attraction']['title'] in text
            assert len(pdf.pages) >= 5
            page.goto(chat_url, wait_until='networkidle')
            expect(page.get_by_role('link', name='계획서 보러가기')).to_be_visible()
            page.get_by_role('button', name='로그아웃').click()
            expect(page.get_by_role('heading', name='어떤 여행을 기록해 볼까요?')).to_be_visible()
            shot('17-logout', '로그아웃 후 홈 화면 복귀')
            assert not errors, errors
            metadata = {'captured_at': datetime.now(timezone.utc).isoformat(), 'base_url': args.base_url,
                        'mocked_api_responses': False, 'viewport': '1440x1000', 'chat_id': chat_id,
                        'trip_date': args.date, 'recommendation': result, 'pdf_pages': len(pdf.pages),
                        'browser_errors': errors, 'api_responses': requests, 'checkpoints': checkpoints,
                        'report_url': report_url, 'route_map_images': route_maps, 'unavailable_route_legs': route_unavailable}
            (output / 'capture.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
        except Exception:
            page.screenshot(path=str(output / 'capture-failure.png'))
            raise
        finally:
            video = page.video
            context.close()
            video.save_as(str(output / 'walkthrough.webm'))
            browser.close()


if __name__ == '__main__':
    main()
