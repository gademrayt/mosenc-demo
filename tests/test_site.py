import os
import re
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class LinkAndImgChecker(HTMLParser):
    def __init__(self, current_file):
        super().__init__()
        self.current_file = current_file
        self.current_dir = os.path.dirname(current_file)
        self.errors = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == 'a' and 'href' in attrs_dict:
            href = attrs_dict['href']
            self.check_link(href)
        elif tag == 'img' and 'src' in attrs_dict:
            src = attrs_dict['src']
            self.check_img(src)

    def check_link(self, href):
        if not href or href.startswith(('#', 'tel:', 'mailto:', 'javascript:', 'http://', 'https://')):
            return
        # clean anchor from local url e.g. coffee.html#beans
        clean_path = href.split('#')[0]
        if not clean_path:
            return
        target = os.path.normpath(os.path.join(self.current_dir, clean_path))
        if not os.path.exists(target):
            self.errors.append(f"Broken link in {os.path.relpath(self.current_file, ROOT)}: '{href}' -> {target}")

    def check_img(self, src):
        if not src or src.startswith(('data:', 'http://', 'https://')):
            return
        target = os.path.normpath(os.path.join(self.current_dir, src))
        if not os.path.exists(target):
            self.errors.append(f"Missing image in {os.path.relpath(self.current_file, ROOT)}: '{src}' -> {target}")

def run_tests():
    print("Running link and asset integrity test across all HTML pages...")
    all_errors = []
    html_files = []

    for root, dirs, files in os.walk(ROOT):
        # skip git and qa
        if '.git' in root or 'qa' in root or 'tests' in root:
            continue
        for f in files:
            if f.endswith('.html'):
                html_files.append(os.path.join(root, f))

    print(f"Found {len(html_files)} HTML files to validate.")
    for hf in html_files:
        parser = LinkAndImgChecker(hf)
        with open(hf, encoding='utf-8') as f:
            content = f.read()
        try:
            parser.feed(content)
        except Exception as e:
            all_errors.append(f"HTML Parse error in {os.path.relpath(hf, ROOT)}: {e}")
        all_errors.extend(parser.errors)

    if all_errors:
        print(f"\nFAILED with {len(all_errors)} errors:")
        for err in all_errors:
            print("  - " + err)
        return False
    else:
        print(f"PASS: All {len(html_files)} pages have 100% valid links and existing media assets!")
        return True

if __name__ == '__main__':
    success = run_tests()
    exit(0 if success else 1)
