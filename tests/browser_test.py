from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]

class BrowserTests(unittest.TestCase):
    def test_checkbox_and_note_survive_reload(self):
        self.assertTrue((ROOT/'plan.html').exists(), 'HTML plan not implemented')
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            candidates=list((Path.home()/'.cache/ms-playwright').glob('chromium-*/chrome-linux*/chrome'))
            browser=p.chromium.launch(headless=True,executable_path=str(candidates[-1]) if candidates else None)
            page=browser.new_page()
            page.goto((ROOT/'plan.html').as_uri())
            page.locator('#check-M01').check()
            page.locator('#note-M01').fill('Готово. Проверка на телефоне.')
            page.reload()
            self.assertTrue(page.locator('#check-M01').is_checked())
            self.assertEqual(page.locator('#note-M01').input_value(),'Готово. Проверка на телефоне.')
            browser.close()

    def test_export_reset_import_preserve_personal_progress(self):
        from playwright.sync_api import sync_playwright
        import json
        with sync_playwright() as p:
            exe=list((Path.home()/'.cache/ms-playwright').glob('chromium-*/chrome-linux*/chrome'))[-1]
            browser=p.chromium.launch(headless=True,executable_path=str(exe))
            page=browser.new_page(accept_downloads=True)
            page.set_default_timeout(4000)
            page.goto((ROOT/'plan.html').as_uri())
            page.locator('#check-M01').check()
            note='<img src=x onerror="window.injected=true"> Моя заметка'
            page.locator('#note-M01').fill(note)
            with page.expect_download() as info:page.locator('#export').click()
            path=info.value.path()
            exported=json.loads(Path(path).read_text())
            self.assertEqual(exported['tasks']['M01']['note'],note)
            page.once('dialog',lambda d:d.dismiss())
            page.locator('#reset').click()
            self.assertTrue(page.locator('#check-M01').is_checked())
            page.once('dialog',lambda d:d.accept())
            page.locator('#reset').click()
            self.assertFalse(page.locator('#check-M01').is_checked())
            payload={'name':'progress.json','mimeType':'application/json','buffer':json.dumps(exported).encode()}
            page.once('dialog',lambda d:d.accept())
            page.locator('#import-file').set_input_files(payload)
            page.wait_for_function("document.getElementById('check-M01').checked")
            self.assertEqual(page.locator('#note-M01').input_value(),note)
            self.assertIsNone(page.evaluate('window.injected'))
            page.reload()
            self.assertTrue(page.locator('#check-M01').is_checked())
            browser.close()

if __name__=='__main__':unittest.main(verbosity=2)
