#!/usr/bin/env python3
"""Check duplicate in-flight saves and retry behavior using a real recorded demo chat."""
import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright, expect


async def main():
    capture = json.loads(Path('docs/media/capture.json').read_text())
    base = capture['base_url']
    errors = []
    saves = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1440, 'height': 1000})
        page = await context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        await page.goto(base, wait_until='networkidle')
        await page.get_by_role('button', name='로그인', exact=True).click()
        await page.get_by_label('ID', exact=True).fill('test')
        await page.get_by_label('PW', exact=True).fill('test')
        await page.get_by_role('dialog').get_by_role('button', name='로그인', exact=True).click()
        await expect(page.get_by_role('button', name='로그아웃')).to_be_visible()
        await page.goto(f"{base}/c/{capture['chat_id']}", wait_until='networkidle')
        url = f"**/api/chats/{capture['chat_id']}"

        async def delayed(route):
            saves.append(route.request.post_data_json)
            await asyncio.sleep(1.2)
            await route.continue_()

        await page.route(url, delayed)
        await page.get_by_role('textbox', name='여행 메시지 입력').fill('출발 전에 충전소 운영 시간을 확인할게요.')
        async with page.expect_request(lambda r: '/api/chats/' in r.url and r.method == 'PUT'):
            await page.get_by_role('button', name='전송', exact=True).click()
        async with page.expect_popup() as popup_info:
            await page.get_by_role('link', name='계획서 보러가기').click()
        popup = await popup_info.value
        await popup.wait_for_url('**/result')
        await popup.close()
        await page.wait_for_timeout(1800)
        assert len(saves) == 1, f'Duplicate saves for one state: {len(saves)}'
        await page.unroute(url, delayed)

        failures = 0

        async def fail_once(route):
            nonlocal failures
            failures += 1
            if failures == 1:
                await route.fulfill(status=503, content_type='application/json', body='{"message":"injected save outage"}')
            else:
                await route.continue_()

        await page.route(url, fail_once)
        await page.get_by_role('textbox', name='여행 메시지 입력').fill('배터리 잔량도 다시 확인할게요.')
        await page.get_by_role('button', name='전송', exact=True).click()
        await expect(page.get_by_role('button', name='저장 재시도')).to_be_visible()
        async with page.expect_response(lambda r: '/api/chats/' in r.url and r.status == 200):
            await page.get_by_role('button', name='저장 재시도').click()
        await expect(page.get_by_role('button', name='저장 재시도')).to_have_count(0)
        assert failures == 2
        assert not errors, errors
        report = {'in_flight_same_state_save_count': len(saves), 'retry_requests_including_failure': failures,
                  'browser_errors': errors, 'fault_injection': 'One HTTP 503 only in this regression check; walkthrough video has no mocked API responses',
                  'result': 'passed'}
        Path('docs/evidence/chat-saving.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps(report, ensure_ascii=False, indent=2))
        await context.close()
        await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
