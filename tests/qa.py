from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa';OUT.mkdir(exist_ok=True)
KEY='mosenc-wordpress-plan.progress.v1'
report=[]
with sync_playwright() as p:
    exe=list((Path.home()/'.cache/ms-playwright').glob('chromium-*/chrome-linux*/chrome'))[-1]
    browser=p.chromium.launch(headless=True,executable_path=str(exe))
    page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
    page.set_default_timeout(5000)
    errors=[];network=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:')) else None)
    page.goto((ROOT/'plan.html').as_uri())
    assert page.locator('.task').count()==34
    assert page.locator('#count').inner_text()=='0 / 30'
    assert page.evaluate("Array.from(document.querySelectorAll('a[href^=\"#\"]')).every(a=>document.getElementById(a.hash.slice(1)))")
    assert page.evaluate("new Set(Array.from(document.querySelectorAll('[id]')).map(x=>x.id)).size===document.querySelectorAll('[id]').length")
    page.screenshot(path=str(OUT/'desktop.png'))
    page.locator('#check-X01').check()
    assert page.locator('#count').inner_text()=='0 / 30'
    page.locator('#check-M01').check()
    assert page.locator('#count').inner_text()=='1 / 30'
    assert page.locator('#percent').inner_text()=='3%'
    page.locator('#next-button').click()
    assert page.locator('#M02>details').get_attribute('open') is not None
    page.locator('#filter').select_option('done')
    assert page.locator('.task:visible').count()==2
    page.locator('#filter').select_option('open')
    assert page.locator('.task:visible').count()==32
    report.append('task counts, optional exclusion, next task, filters, unique IDs and anchors: PASS')
    # Invalid import cannot erase existing state.
    bad={'name':'bad.json','mimeType':'application/json','buffer':b'{bad json'}
    page.locator('#import-file').set_input_files(bad)
    page.wait_for_function("document.getElementById('status').textContent.includes('Файл не загружен')")
    assert page.locator('#check-M01').is_checked()
    valid=page.evaluate(f'JSON.parse(localStorage.getItem({json.dumps(KEY)}))')
    valid['tasks']['M01']['done']=False
    page.once('dialog',lambda d:d.dismiss())
    page.locator('#import-file').set_input_files({'name':'cancel.json','mimeType':'application/json','buffer':json.dumps(valid).encode()})
    page.wait_for_function("document.getElementById('status').textContent.includes('Загрузка отменена')")
    assert page.locator('#check-M01').is_checked()
    report.append('invalid import rejection and cancel-before-replace: PASS')
    # Printing expands hidden/closed instructions and restores the working view.
    before=page.locator('.task:visible').count()
    page.evaluate("window.dispatchEvent(new Event('beforeprint'))")
    assert page.locator('.task:visible').count()==34
    assert page.locator('.task>details[open]').count()==34
    page.pdf(path=str(OUT/'plan-print-test.pdf'),format='A4',print_background=True)
    page.evaluate("window.dispatchEvent(new Event('afterprint'))")
    assert page.locator('.task:visible').count()==before
    report.append('print expands all instructions and restores filter: PASS')
    # Mobile including long paths, forms, all instructions.
    page.locator('#filter').select_option('all')
    page.locator('#collapse').click()
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow at {width}'
        if width==390:
            assert page.locator('#count').bounding_box()['height']<30, 'progress fraction wraps on mobile'
            page.screenshot(path=str(OUT/'mobile.png'))
    page.locator('#expand').click()
    page.set_viewport_size({'width':320,'height':900})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    report.append('responsive layouts 320/390/768/1440 incl expanded tasks: PASS')
    assert not errors,errors
    assert not network,network
    report.append('browser JS errors: 0; external network requests: 0')
    # Browser-state corruption is preserved until explicit reset/import.
    corrupt=browser.new_page()
    corrupt.goto((ROOT/'plan.html').as_uri())
    corrupt.evaluate(f'localStorage.setItem({json.dumps(KEY)},"not-json")')
    corrupt.reload()
    assert corrupt.locator('#raw-backup').is_visible()
    corrupt.locator('#check-M01').check()
    assert corrupt.evaluate(f'localStorage.getItem({json.dumps(KEY)})')=='not-json'
    report.append('corrupt local progress not overwritten; recovery export available: PASS')
    # Storage denied leaves app usable with explicit export warning.
    blocked=browser.new_page()
    blocked.add_init_script("Storage.prototype.setItem=function(){throw new DOMException('denied','SecurityError')};")
    blocked.goto((ROOT/'plan.html').as_uri())
    blocked.locator('#check-M01').check()
    assert 'не сохранил' in blocked.locator('#status').inner_text()
    with blocked.expect_download():blocked.locator('#export').click()
    report.append('blocked persistence shows warning; export remains functional: PASS')
    view=browser.new_page(viewport={'width':1200,'height':1000})
    view.goto((ROOT/'overview.html').as_uri())
    assert view.locator('textarea').count()==0
    assert 'C:\\Users' not in view.inner_text('body')
    assert 'localStorage' not in view.content()
    view.screenshot(path=str(OUT/'overview.png'))
    view.pdf(path=str(OUT/'overview-print-test.pdf'),format='A4',print_background=True)
    report.append('boss overview separate from personal notes and machine paths: PASS')
    browser.close()
(OUT/'verification.json').write_text(json.dumps({'checks':report,'status':'PASS'},ensure_ascii=False,indent=2))
print(json.dumps({'checks':report,'status':'PASS'},ensure_ascii=False,indent=2))
