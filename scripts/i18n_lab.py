"""Añade/actualiza las claves propias del Lab (lab.*, mission.*) en i18n/locales/*.json."""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS = json.load(open(os.path.join(ROOT, 'scripts', 'i18n_lab_keys.json'), encoding='utf-8'))
for lang in ('en', 'es', 'it'):
    p = os.path.join(ROOT, 'i18n', 'locales', f'{lang}.json')
    d = json.load(open(p, encoding='utf-8'))
    for top, block in KEYS.items():
        d[top] = block[lang]
    json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('ok')
