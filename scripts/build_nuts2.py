"""Contornos NUTS-2 para Territories v2, por disolución de las NUTS-3 que ya usa el Lab (60M, 2024 + UK 2021).

Necesita shapely y las tablas de nombres de Eurostat (NUTS_AT_2021.csv y NUTS_AT_2024.csv) en la carpeta dada.
Uso: python3 scripts/build_nuts2.py <carpeta con NUTS_AT_*.csv>  → app/assets/geo/NUTS2_from_NUTS3.json
"""
import csv, json, os, sys
from collections import defaultdict
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEO = os.path.join(ROOT, 'app', 'assets', 'geo')
names = {}
for f in ('NUTS_AT_2021.csv', 'NUTS_AT_2024.csv'):
    for r in csv.DictReader(open(os.path.join(sys.argv[1], f), encoding='utf-8')): names[r['NUTS_ID']] = r['NAME_LATN']
feats = []
for f in ('NUTS_RG_60M_2024_4326_LEVL_3.json', 'NUTS_RG_60M_2021_4326_LEVL_3_UK.json'):
    feats += json.load(open(os.path.join(GEO, f)))['features']
groups = defaultdict(list)
for f in feats: groups[f['properties']['NUTS_ID'][:4]].append(shape(f['geometry']).buffer(0))

def clockwise(g):  # d3 espera el anillo exterior en sentido horario
    return orient(g, -1.0) if isinstance(g, Polygon) else MultiPolygon([orient(p, -1.0) for p in g.geoms])
def rnd(o):
    if isinstance(o, float): return round(o, 4)
    if isinstance(o, (list, tuple)): return [rnd(x) for x in o]
    if isinstance(o, dict): return {k: rnd(v) for k, v in o.items()}
    return o
out = []
for k, geoms in sorted(groups.items()):
    u = unary_union(geoms).simplify(0.005, preserve_topology=True)
    if not isinstance(u, (Polygon, MultiPolygon)): u = MultiPolygon([p for p in u.geoms if isinstance(p, Polygon)])
    out.append({'type': 'Feature', 'properties': {'NUTS_ID': k, 'NUTS_NAME': names.get(k, k)}, 'geometry': mapping(clockwise(u))})
json.dump(rnd({'type': 'FeatureCollection', 'features': out}), open(os.path.join(GEO, 'NUTS2_from_NUTS3.json'), 'w'), separators=(',', ':'))
print(len(out), 'NUTS-2')
