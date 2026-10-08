"""Catálogo único de entidades de la capa de la Misión (Territories v2).

Une las tres fuentes que no comparten identificador:
  A  autoridades del anexo 5 del Barómetro (limpio)          public/data/territories.json
  E  firmantes de la Charter en el dashboard de la EEA        public/data/eea_signatories.json
  C  socios CORDIS de los 65 proyectos de la Misión           public/data/entities.json + project_entities.json

Pasos
  1. Pares candidatos A–C, E–A y E–C: mismo país, territorio compatible (un código contiene al otro)
     y nombre parecido tras normalizar (sin tildes ni palabras genéricas: city, kommune, comune...).
     Confianza: alta (se acepta sola), media y baja (a revisar).
  2. Naturaleza de cada entidad: autoridad (local / regional / nacional), otro organismo público,
     universidad, centro de investigación, empresa, ONG / fundación / asociación, otra.
  3. Decisiones de la revisión manual (data-src/mission/entity_review.csv, si existe) por encima de lo automático.
  4. Salida: data-src/mission/entity_candidates.csv (todos los pares), data-src/mission/entity_nature_auto.csv
     y public/data/actors.json (una fila por entidad unificada).

Se ejecuta después de build_data.py (lee sus JSON).
"""
import csv, json, os, re, unicodedata
from collections import defaultdict
from rapidfuzz import fuzz

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public', 'data')
SRC = os.path.join(ROOT, 'data-src', 'mission')
load = lambda n: json.load(open(os.path.join(PUB, n + '.json')))

GENERIC = set('''
city town municipality municipal municipalities council county region regional regions province provincial district
metropolitan area government authority authorities local of the and for de del della dei degli di du des la le les el los las
das der die und et y e i em do da dos das kommune kommun kommunen gemeente stadt landkreis kreis comune citta ville commune
ayuntamiento concello ajuntament municipio municipiul primaria dimos dimou obcina opcina opstina miasto gmina grad mesto
mestna savivaldybe administracija pasvaldiba vald linn kaupunki kunta camara prefeitura junta diputacion provincia regione
departement conseil general generalitat gobierno gouvernement comunidad autonoma comunidade intermunicipal community
office department city's urban greater capital
'''.split())

def ascii_(s):
    return unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()

def norm(s):
    toks = re.sub(r'[^a-z0-9]+', ' ', ascii_(s)).split()
    keep = [t for t in toks if t not in GENERIC and len(t) > 1]
    return ' '.join(keep) or ' '.join(toks)

def score(a, b):
    """0-100. Igualdad tras normalizar = 100; contenido completo de un nombre en otro = 88 como mucho."""
    na, nb = norm(a), norm(b)
    if not na or not nb: return 0, 0
    if na == nb: return 100, 100
    return fuzz.token_sort_ratio(na, nb), fuzz.token_set_ratio(na, nb)

def geo_ok(codes_a, codes_b):
    return any(x.startswith(y) or y.startswith(x) for x in codes_a for y in codes_b if x and y)

def confidence(s_sort, s_set, geo):
    if geo and s_sort >= 92: return 'alta'
    if s_sort == 100: return 'media'   # mismo nombre, códigos distintos: a revisar (puede ser un error de código)
    if geo and (s_sort >= 80 or (s_set >= 85 and s_sort >= 60)): return 'media'
    if s_set >= 72 and (geo or s_sort >= 85): return 'baja'
    return None

# ---------- fuentes ----------
A = load('territories')
E = [dict(e, id=f'E{i + 1:03d}') for i, e in enumerate(load('eea_signatories'))]
types = {t['id']: t['name'] for t in load('entity_types')}
mission_ids = {m['cordis_id'] for m in load('mission_projects')}
pe = [p for p in load('project_entities') if p['project_id'] in mission_ids]
cordis_in_mission = {p['entity_id'] for p in pe}
C = [e for e in load('entities') if e['id'] in cordis_in_mission]
for c in C:
    c['type'] = types.get(c['organization_activity_type_id']) or 'Other'
    n3 = c.get('related_nuts_code_nuts_code') or ''
    c['codes'] = [n3] if n3 else []
    c['country'] = c.get('address_country')

# ---------- 1. pares candidatos ----------
def names_c(c):
    return [n for n in (c['legal_name'], c.get('short_name')) if n]

def pairs(left, right, lname, rname, lkey, rkey):
    out = []
    by_country = defaultdict(list)
    for r in right: by_country[r['country']].append(r)
    for l in left:
        cands = []
        for r in by_country.get(l['country'], []):
            best = (0, 0)
            for ln in lname(l):
                for rn in rname(r):
                    best = max(best, score(ln, rn))
            geo = geo_ok(l['codes'], r['codes'])
            conf = confidence(best[0], best[1], geo)
            if conf: cands.append((best, geo, conf, r))
        cands.sort(key=lambda x: (-x[0][0], -x[0][1]))
        for rank, (best, geo, conf, r) in enumerate(cands[:3], 1):
            out.append({'pair': f'{lkey}-{rkey}', 'left_id': l['id'], 'right_id': r['id'], 'rank': rank,
                        'score_sort': best[0], 'score_set': best[1], 'geo': geo, 'confidence': conf})
    return out

# una autoridad o un firmante no es una universidad, un centro de investigación ni una empresa
C_AUTH = [c for c in C if c['type'] in ('Public bodies', 'Other')]
cand = []
cand += pairs(A, C_AUTH, lambda a: [a['name']] + ([a['catalogue_name']] if a.get('catalogue_name') else []), names_c, 'A', 'C')
cand += pairs(E, A, lambda e: [e['name']], lambda a: [a['name']] + ([a['catalogue_name']] if a.get('catalogue_name') else []), 'E', 'A')
cand += pairs(E, C_AUTH, lambda e: [e['name']], names_c, 'E', 'C')

# una entidad de la derecha no puede quedar unida a dos de la izquierda con confianza alta: la peor pasa a media
for pr in ('A-C', 'E-A', 'E-C'):
    seen = defaultdict(list)
    for c in cand:
        if c['pair'] == pr and c['rank'] == 1 and c['confidence'] == 'alta': seen[c['right_id']].append(c)
    for lst in seen.values():
        lst.sort(key=lambda c: -c['score_sort'])
        for c in lst[1:]: c['confidence'] = 'media'

# ---------- 3. revisión manual ----------
review = {}
rev_path = os.path.join(SRC, 'entity_review.csv')
if os.path.exists(rev_path):
    for r in csv.DictReader(open(rev_path, encoding='utf-8')):
        review[(r['pair'], r['left_id'], r['right_id'])] = r['decision']  # confirmar | rechazar
nature_review = {}
nat_path = os.path.join(SRC, 'entity_nature_review.csv')
if os.path.exists(nat_path):
    for r in csv.DictReader(open(nat_path, encoding='utf-8')):
        if r.get('nature'): nature_review[r['id']] = (r['nature'], r.get('level') or None)

def accepted(c):
    d = review.get((c['pair'], c['left_id'], c['right_id']))
    if d: return d == 'confirmar'
    return c['rank'] == 1 and c['confidence'] == 'alta'

# ---------- unión ----------
parent = {}
def find(x):
    parent.setdefault(x, x)
    while parent[x] != x:
        parent[x] = parent[parent[x]]; x = parent[x]
    return x
def union(a, b): parent[find(a)] = find(b)

key = {'A': 'A:', 'E': 'E:', 'C': 'C:'}
for a in A: find('A:' + a['id'])
for e in E: find('E:' + e['id'])
for c in C: find('C:' + c['id'])
for c in cand:
    if accepted(c):
        l, r = c['pair'].split('-')
        union(key[l] + c['left_id'], key[r] + c['right_id'])

# ---------- 2. naturaleza ----------
P = lambda *w: re.compile(r'\b(' + '|'.join(w) + r')\b')
LOCAL = P('municipality', 'municipal', 'kommune', 'kommun', 'gemeente', 'stadt', 'comune', 'ville', 'commune', 'ayuntamiento',
          'concello', 'ajuntament', 'municipio', 'municipiul', 'primaria', 'dimos', 'obcina', 'opcina', 'opstina', 'miasto',
          'gmina', 'mesto', 'savivaldybe', 'pasvaldiba', 'vald', 'kaupunki', 'kunta', 'camara municipal', 'city of', 'city council',
          'town council', 'borough', 'mairie', 'citta', 'grad', 'urbanisme', 'intermunicipal', 'mancomunidad', r'metropol\w*')
REGIONAL = P('region', 'regione', 'regional', 'province', 'provincia', 'provincial', 'county', 'diputacion', 'landkreis',
             'generalitat', 'junta de', 'gobierno de', 'comunidad autonoma', 'departement', 'conseil departemental',
             'perifereia', 'periphery', 'voivodeship', 'wojewodztwo', 'kraj', 'zupanija', 'maakond', 'fylkeskommune',
             'landsting', 'regionsrad', 'land', 'bundesland', 'cabildo', 'consell insular', 'deputacion', 'regiao')
NATIONAL = P('ministry', 'ministerio', 'ministero', 'ministere', 'ministerie', 'ministerstvo', 'ministerium', r'minister\w*',
             'federal', 'national government', 'government of', 'state secretariat', 'bundesamt', 'presidency')
NGO = P('foundation', 'fundacion', 'fondazione', 'fondation', 'fundacao', 'stiftung', 'stichting', 'fundacja', 'association',
        'asociacion', 'associazione', 'associacao', 'verein', 'ev', 'e v', 'ngo', 'non governmental', 'nonprofit', 'non profit',
        'onlus', 'ets', 'aps', 'asbl', 'vzw', 'charity', 'trust', 'network', 'netzwerk', 'red', 'rete', 'federation', 'federacion',
        'cooperativa', 'cooperative', 'iclei', 'wwf', 'climate kic', 'eurocities', 'friends of', 'society', 'sociedad civil')
AGENCY = P('agency', 'agencia', 'agenzia', 'agence', 'agentur', 'authority', 'autoridad', 'autorita', 'office', 'institute',
           'instituto', 'istituto', 'institut', 'service', 'servicio', 'board', 'water', 'consorcio', 'consorzio', 'consortium')

NATURES = ['Autoridad local', 'Autoridad regional', 'Autoridad nacional', 'Otro organismo público', 'Universidad',
           'Centro de investigación', 'Empresa', 'ONG / fundación / asociación', 'Otra']

def a_level(a):
    lv = max((len(c) - 2 for c in a['codes']), default=-1)
    n = ascii_(a['name'])
    if lv == 0: return 'Autoridad nacional'
    if lv in (1, 2): return 'Autoridad regional'
    if REGIONAL.search(n) and not LOCAL.search(n): return 'Autoridad regional'
    return 'Autoridad local'

def e_level(e):
    if e['level'] in ('LAU', 'CITY CORE', 'FUA'): return 'Autoridad local'
    return 'Autoridad regional'

def c_nature(c):
    """(naturaleza, confianza, regla)"""
    n = ascii_(' '.join(names_c(c)))
    t = c['type']
    if t == 'Higher or Secondary Education Establishments': return 'Universidad', 'alta', 'tipo CORDIS'
    if t == 'Research Organisations': return 'Centro de investigación', 'alta', 'tipo CORDIS'  # muchas son fundaciones de investigación (AZTI, Deltares...)
    if t == 'Private for-profit entities': return 'Empresa', 'alta', 'tipo CORDIS'
    if t == 'Public bodies':
        if NATIONAL.search(n): return 'Autoridad nacional', 'media', 'organismo público + nombre'
        if LOCAL.search(n): return 'Autoridad local', 'media', 'organismo público + nombre'
        if REGIONAL.search(n): return 'Autoridad regional', 'media', 'organismo público + nombre'
        if AGENCY.search(n): return 'Otro organismo público', 'media', 'organismo público + nombre'
        return 'Otro organismo público', 'baja', 'organismo público, nombre sin pista'
    # Other
    if NGO.search(n): return 'ONG / fundación / asociación', 'media', 'otros + nombre'
    if LOCAL.search(n): return 'Autoridad local', 'baja', 'otros + nombre'
    if REGIONAL.search(n): return 'Autoridad regional', 'baja', 'otros + nombre'
    return 'Otra', 'baja', 'otros, nombre sin pista'

nature_auto = []
c_nat = {}
for c in C:
    nat, conf, rule = c_nature(c)
    if c['id'] in nature_review: nat, conf, rule = nature_review[c['id']][0], 'revisada', 'revisión manual'
    c_nat[c['id']] = nat
    nature_auto.append({'id': c['id'], 'name': c['legal_name'], 'short_name': c.get('short_name') or '', 'country': c['country'],
                        'cordis_type': c['type'], 'nature': nat, 'confidence': conf, 'rule': rule})

# ---------- 4. entidades unificadas ----------
groups = defaultdict(list)
for k in list(parent): groups[find(k)].append(k)
A_by = {a['id']: a for a in A}; E_by = {e['id']: e for e in E}; C_by = {c['id']: c for c in C}
RANK = {n: i for i, n in enumerate(NATURES)}

def title(s):
    return s if not s or not s.isupper() else ' '.join(w if len(w) <= 3 and w.isupper() and w not in ('DE', 'DI', 'DEL', 'LA', 'OF', 'THE', 'AND') else w.capitalize() for w in s.split())

actors = []
for i, (root, members) in enumerate(sorted(groups.items(), key=lambda kv: sorted(kv[1])[0])):
    a_ids = sorted(m[2:] for m in members if m.startswith('A:'))
    e_ids = sorted(m[2:] for m in members if m.startswith('E:'))
    c_ids = sorted(m[2:] for m in members if m.startswith('C:'))
    if a_ids: name = A_by[a_ids[0]]['name']
    elif e_ids: name = E_by[e_ids[0]]['name']
    else:
        c = C_by[c_ids[0]]; name = title(c.get('short_name') if c.get('short_name') and len(c['legal_name']) > 60 else c['legal_name'])
    # naturaleza: las autoridades del anexo 5 y de la EEA mandan sobre el tipo CORDIS
    if a_ids: nature = min((a_level(A_by[x]) for x in a_ids), key=lambda n: RANK[n])
    elif e_ids: nature = e_level(E_by[e_ids[0]])
    else: nature = c_nat[c_ids[0]]
    for x in c_ids:
        if x in nature_review: nature = nature_review[x][0]
    country = (A_by[a_ids[0]]['country'] if a_ids else E_by[e_ids[0]]['country'] if e_ids else C_by[c_ids[0]]['country'])
    codes = sorted({cd for x in a_ids for cd in A_by[x]['codes']} | {cd for x in e_ids for cd in E_by[x]['codes']})
    seats = sorted({C_by[x]['codes'][0] for x in c_ids if C_by[x]['codes']})
    home = next((cd for cd in seats if len(cd) == 5), None) or next((cd for cd in codes if len(cd) == 5), None)
    levels = [len(cd) - 2 for cd in codes] + [3 for _ in seats]
    actors.append({
        'id': f'X{i + 1:04d}', 'name': name, 'nature': nature, 'country': country,
        'home_nuts3': home, 'codes': codes, 'seats': seats, 'level': max(levels) if levels else None,
        'signatory': bool(e_ids) or any(A_by[x]['is_signatory'] for x in a_ids),
        'signatory_source': 'EEA' if e_ids else ('anexo 5' if any(A_by[x]['is_signatory'] for x in a_ids) else None),
        'annex_ids': a_ids, 'eea_ids': e_ids, 'cordis_ids': c_ids,
    })

json.dump(actors, open(os.path.join(PUB, 'actors.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump([{'id': e['id'], 'name': e['name'], 'country': e['country'], 'codes': e['codes'], 'level': e['level']} for e in E],
          open(os.path.join(PUB, 'eea_signatories_ids.json'), 'w'), ensure_ascii=False, separators=(',', ':'))

with open(os.path.join(SRC, 'entity_candidates.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(cand[0].keys()) + ['accepted']); w.writeheader()
    for c in cand: w.writerow(dict(c, accepted=accepted(c)))
with open(os.path.join(SRC, 'entity_nature_auto.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(nature_auto[0].keys())); w.writeheader(); w.writerows(nature_auto)

# resumen
from collections import Counter
cc = Counter((c['pair'], c['confidence']) for c in cand if c['rank'] == 1)
print('pares (mejor candidato):', dict(sorted(cc.items())))
print('pares aceptados:', Counter(c['pair'] for c in cand if accepted(c)))
print('entidades unificadas:', len(actors), Counter(a['nature'] for a in actors).most_common())
both = [a for a in actors if a['signatory'] and (a['annex_ids'] or a['cordis_ids'])]
print('firman y participan', len(both), '| solo firman', sum(1 for a in actors if a['signatory'] and not a['annex_ids'] and not a['cordis_ids']),
      '| sin nuts3', sum(1 for a in actors if not a['home_nuts3']))
print('naturaleza CORDIS por confianza', Counter((n['cordis_type'], n['confidence']) for n in nature_auto))
