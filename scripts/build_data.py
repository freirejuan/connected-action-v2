"""Genera los JSON estáticos que lee la app (public/data/*.json).

Fuentes (data-src/):
  cordis/   CSV del pipeline CORDIS de farclimate_hub (packages/cordis: `pnpm cordis:download && pnpm cordis:parse`),
            las mismas tablas que se cargan en Supabase. Ids = identificadores CORDIS (texto).
  mission/  Capa de la Misión: projects_65_enrichment.csv (tipo RIA/IA/CSA/Cascade, topic, agregados),
            territories.csv, project_territories.csv y annex5_clean.csv (anexo 5 del Barómetro limpio),
            EEA_Dashboard_signatories_layer2.csv (firmantes de la Charter con NUTS, servicio REST de la EEA).

Uso: python3 scripts/build_data.py
"""
import csv, json, os, datetime
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data-src'); OUT = os.path.join(ROOT, 'public', 'data')
os.makedirs(OUT, exist_ok=True)

def rows(*p):
    with open(os.path.join(SRC, *p), encoding='utf-8') as f:
        return list(csv.DictReader(f))

def num(v, cast=float):
    if v is None or v == '': return None
    try: return cast(v)
    except ValueError: return None

def txt(v):
    return v if v not in (None, '') else None

def dump(name, data):
    with open(os.path.join(OUT, f'{name}.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    return len(data)

counts = {}
# --- CORDIS (forma idéntica a las filas de Supabase) ---------------------------------------------
entity_types = [{'id': i + 1, 'name': r['name']} for i, r in enumerate(rows('cordis', 'aux_entity_types.csv'))]
type_id = {t['name']: t['id'] for t in entity_types}
counts['entity_types'] = dump('entity_types', entity_types)
counts['risks'] = dump('risks', [{'id': int(r['id']), 'name': r['name']} for r in rows('cordis', 'aux_climate_risks.csv')])
counts['themes'] = dump('themes', [{'id': int(r['id']), 'name': r['name']} for r in rows('cordis', 'aux_themes.csv')])

projects = [{
    'id': r['id'], 'cordis_id': r['id'], 'acronym': txt(r['acronym']), 'teaser': txt(r['teaser']), 'title': txt(r['title']),
    'keywords': txt(r['keywords']), 'total_cost': num(r['totalCost']), 'ec_max_contribution': num(r['ecMaxContribution']),
    'start_date': txt(r['startDate']), 'end_date': txt(r['endDate']), 'duration': num(r['duration'], int),
} for r in rows('cordis', 'projects_cordis.csv')]
projects.sort(key=lambda p: p['start_date'] or '', reverse=True)
counts['projects'] = dump('projects', projects)

entities = [{
    'id': r['id'], 'cordis_id': r['id'], 'vat_number': txt(r['vatNumber']), 'legal_name': txt(r['legalName']),
    'short_name': txt(r['shortName']), 'address_street': txt(r['addressStreet']), 'address_city': txt(r['addressCity']),
    'address_postal_code': txt(r['addressPostalCode']), 'address_country': txt(r['addressCountry']),
    'address_url': txt(r['addressUrl']), 'address_geolocation': txt(r['addressGeolocation']),
    'organization_activity_type_id': type_id.get(r['organizationActivityType']),
    'related_region_name': txt(r['relatedRegionName']), 'related_region_nuts_code': txt(r['relatedRegionNutsCode']),
    'related_region_iso_code': txt(r['relatedRegionIsoCode']), 'related_nuts_code_nuts_code': txt(r['relatedNutsCodeNutsCode']),
} for r in rows('cordis', 'entities_cordis.csv')]
entities.sort(key=lambda e: e['legal_name'] or '')
counts['entities'] = dump('entities', entities)

pe = [{
    'project_id': r['projectId'], 'entity_id': r['entityId'], 'type': txt(r['type']), 'entity_order': num(r['order'], int),
    'total_cost': num(r['totalCost']), 'ec_contribution': num(r['ecContribution']), 'net_ec_contribution': num(r['netEcContribution']),
    'sme': num(r['sme'], int), 'terminated': num(r['terminated'], int),
} for r in rows('cordis', 'project_entities.csv')]
pe.sort(key=lambda x: (x['project_id'], x['entity_order'] if x['entity_order'] is not None else 10**6))
counts['project_entities'] = dump('project_entities', pe)
counts['project_risks'] = dump('project_risks', [{'project_id': r['projectId'], 'risk_id': int(r['riskId'])} for r in rows('cordis', 'project_risks.csv')])
counts['project_themes'] = dump('project_themes', [{'project_id': r['projectId'], 'theme_id': int(r['themeId'])} for r in rows('cordis', 'project_themes.csv')])

products = [{
    'id': r['id'], 'product_id': r['id'], 'cordis_id': r['id'], 'project_id': r['projectId'], 'title': txt(r['title']),
    'details_authors': txt(r['detailsAuthors']), 'details_journal_number': txt(r['detailsJournalNumber']),
    'details_journal_title': txt(r['detailsJournalTitle']), 'details_published_pages': txt(r['detailsPublishedPages']),
    'details_published_year': txt(r['detailsPublishedYear']), 'details_publisher': txt(r['detailsPublisher']),
    'type_code': txt(r['typeCode']), 'type_title': txt(r['typeTitle']), 'product_type_id': num(r['productTypeId'], int),
    'product_type_name': txt(r['productTypeName']), 'sub_type_code': txt(r['subTypeCode']), 'sub_type_title': txt(r['subTypeTitle']),
    'doi': txt(r['doi']), 'issn': txt(r['issn']),
} for r in rows('cordis', 'products_cordis.csv')]
products.sort(key=lambda p: (-(int(p['details_published_year'] or 0)), p['title'] or ''))
counts['products'] = dump('products', products)

# --- Capa de la Misión ---------------------------------------------------------------------------
B = lambda v: str(v).strip().lower() == 'true'
mission = {}
for r in rows('mission', 'projects_65_enrichment.csv'):
    mission[r['cordis_id']] = {
        'cordis_id': r['cordis_id'], 'mission_name': r['mission_name'], 'project_type': r['project_type'],
        'funding_scheme': r['funding_scheme'], 'framework': r['framework'], 'type_note': txt(r['type_note']),
        'call_year': num(r['call_year'], int), 'master_call': r['master_call'], 'topic_code': r['topic_code'],
        'topic_title': r['topic_title'], 'lifecycle': r['lifecycle'], 'in_annex5': B(r['in_annex5']),
        'n_authorities': int(r['n_authorities']), 'n_demonstrators': int(r['n_demonstrators']),
        'n_replicators': int(r['n_replicators']), 'n_signatory_authorities': int(r['n_signatory_authorities']),
        'n_countries_territories': int(r['n_countries_territories']), 'n_territory_codes': int(r['n_territory_codes']),
    }
missing = {p['id'] for p in projects} - set(mission)
assert not missing, f'proyectos CORDIS sin capa de la Misión: {missing}'
counts['mission_projects'] = dump('mission_projects', list(mission.values()))

terr = rows('mission', 'territories.csv')
territories = [{
    'id': r['territory_id'], 'name': r['authority_name'], 'country': txt(r['country_iso']),
    'codes': [c for c in (r['territory_codes'] or '').split('|') if c], 'is_signatory': B(r['is_signatory']),
    'n_projects': int(r['n_projects']), 'roles': [x for x in (r['roles'] or '').split('|') if x],
    'lat': num(r['geo_lat']), 'lon': num(r['geo_lon']),
} for r in terr]
counts['territories'] = dump('territories', territories)

pt = []
seen = set()
for r in rows('mission', 'project_territories.csv'):
    if r['project_name'] == 'MIP4Adapt': pid = 'MIP4Adapt'
    else: pid = r['project_id']
    key = (pid, r['territory_id'], r['territory_code'])
    if key in seen: continue
    seen.add(key)
    pt.append({'project_id': pid, 'territory_id': r['territory_id'], 'code': txt(r['territory_code']),
               'code_system': r['code_system'], 'level': num(r['nuts_level'], lambda v: int(float(v))),
               'role': txt(r['region_role']), 'is_signatory': B(r['is_signatory']), 'cleaning': r['cleaning_category']})
counts['project_territories'] = dump('project_territories', pt)

# Firmantes de la Charter según el Adaptation Dashboard de la EEA (geometrías por NUTS)
eea = [r for r in rows('mission', 'EEA_Dashboard_signatories_layer2.csv') if r['Status_Literal'] == 'Mission signatory' and r['NUTS_ID']]
counts['eea_signatories'] = dump('eea_signatories', [{'nuts': r['NUTS_ID'], 'name': r['NUTS_Name_Excel'] or r['LAU_NAME'] or r['URAU_NAME'],
                                                      'country': r['CNTR_CODE'], 'level': r['LEVEL_CODE']} for r in eea])

meta = {
    'generated': datetime.date.today().isoformat(),
    'sources': [
        {'key': 'cordis', 'label': 'CORDIS (project and participant records)', 'date': '2026-10-07', 'url': 'https://cordis.europa.eu'},
        {'key': 'catalogue', 'label': 'EU Mission Projects Catalogue (climate risks and themes)', 'date': '2026-05'},
        {'key': 'types', 'label': 'Mission Barometer, 6th update, Appendix 4 (project types)', 'date': '2025-09-30'},
        {'key': 'annex5', 'label': 'Mission Barometer, 6th update, Appendix 5 (regions, cleaned by Inviable)', 'date': '2026-03-31'},
        {'key': 'eea', 'label': 'EEA Adaptation Dashboard (Charter signatories)', 'date': '2026-10-07'},
    ],
    'counts': counts,
}
with open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf-8') as f:
    json.dump(meta, f, ensure_ascii=False, indent=1)
print(json.dumps(counts))
