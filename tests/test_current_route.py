"""Guard the approved stack and the existing project's continuity."""
import json
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

class CurrentRouteTests(unittest.TestCase):
    def test_guide_uses_existing_woocommerce_build(self):
        data = json.loads((ROOT / 'src/plan.json').read_text(encoding='utf-8'))
        tasks = {t['id']: t for t in data['tasks']}
        self.assertEqual(len(tasks), 34)
        self.assertEqual(set(tasks), {f'M{i:02}' for i in range(1, 31)} | {f'X{i:02}' for i in range(1, 5)})
        self.assertIn('8108', str(tasks['M01']))
        self.assertIn('WooCommerce', str(tasks['M12']))
        self.assertIn('WooCommerce', str(tasks['M22']))
        html = (ROOT / 'plan.html').read_text(encoding='utf-8')
        self.assertNotIn('Новая WordPress-среда ещё не создана', html)
        self.assertNotIn('Не ставим WooCommerce только ради', html)
        self.assertIn('карточкой или наличными', html)
        self.assertIn('Защита от спама', html)
        self.assertIn('http://localhost:8108/', html)
        self.assertIn('mosenc-wordpress-plan.progress.v1', html)

if __name__ == '__main__':
    unittest.main(verbosity=2)
