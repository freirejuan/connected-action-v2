// Connected Action Lab — capa de datos estática.
// Sustituye a las consultas a Supabase de farclimate_hub (apps/web/app/utils/cordisRepository.ts):
// las funciones exportadas conservan nombre y forma de salida, pero leen /data/*.json,
// generados por scripts/build_data.py a partir del pipeline CORDIS y de la capa de la Misión.
import type { CordisEntityDetail, CordisProjectDetail } from "~/types/cordis";
import type {
  DataMeta,
  EeaSignatory,
  MissionProject,
  MissionTerritory,
  ProjectTerritory,
} from "~/types/mission";

const cache = new Map<string, Promise<any>>();

function load<T = any>(name: string): Promise<T> {
  if (!cache.has(name)) {
    const base = useRuntimeConfig().app.baseURL || "/";
    const p = $fetch<T>(`${base.replace(/\/$/, "")}/data/${name}.json`).catch((err) => {
      cache.delete(name);
      throw err;
    });
    cache.set(name, p);
  }
  return cache.get(name)!;
}

// --- Tablas (misma forma que las filas de Supabase) ---------------------------------------------

export async function fetchProjectsTable() {
  return load<any[]>("projects");
}

export async function fetchEntitiesTable() {
  return load<any[]>("entities");
}

export async function fetchProductsTable() {
  return load<any[]>("products");
}

export async function fetchProjectEntitiesTable() {
  const rows = await load<any[]>("project_entities");
  return rows.map((row) => ({
    projectId: row.project_id as string,
    entityId: row.entity_id as string,
    type: row.type as string | null,
    entityOrder: row.entity_order as number | null,
    totalCost: row.total_cost as number | null,
    ecContribution: row.ec_contribution as number | null,
    netEcContribution: row.net_ec_contribution as number | null,
    sme: row.sme as number | null,
    terminated: row.terminated as number | null,
  }));
}

export async function fetchProjectRisksTable() {
  const rows = await load<any[]>("project_risks");
  return rows.map((row) => ({ projectId: row.project_id as string, riskId: row.risk_id as number }));
}

export async function fetchProjectThemesTable() {
  const rows = await load<any[]>("project_themes");
  return rows.map((row) => ({ projectId: row.project_id as string, themeId: row.theme_id as number }));
}

export async function fetchAuxClimateRisks() {
  return load<{ id: number; name: string }[]>("risks");
}

export async function fetchAuxThemes() {
  return load<{ id: number; name: string }[]>("themes");
}

export async function fetchAuxEntityTypes() {
  return load<{ id: number; name: string }[]>("entity_types");
}

// --- Detalles (modales) --------------------------------------------------------------------------

export async function fetchProjectEntities(projectId: string) {
  const [links, entities, types] = await Promise.all([
    load<any[]>("project_entities"),
    load<any[]>("entities"),
    fetchAuxEntityTypes(),
  ]);
  const entityById = new Map(entities.map((e) => [e.id, e]));
  const typeName = new Map(types.map((t) => [t.id, t.name]));
  const rows = links
    .filter((l) => l.project_id === projectId)
    .map((link) => {
      const entity = entityById.get(link.entity_id) ?? {};
      return {
        id: link.entity_id as string,
        type: link.type as string | null,
        entityOrder: link.entity_order as number | null,
        totalCost: link.total_cost as number | null,
        ecContribution: link.ec_contribution as number | null,
        netEcContribution: link.net_ec_contribution as number | null,
        sme: link.sme as number | null,
        terminated: link.terminated as number | null,
        legalName: entity.legal_name ?? null,
        shortName: entity.short_name ?? null,
        addressCountry: entity.address_country ?? null,
        organizationActivityType: typeName.get(entity.organization_activity_type_id) ?? null,
      };
    });
  return { projectId, entities: rows };
}

export async function fetchProjectProducts(projectId: string) {
  const products = await load<any[]>("products");
  const rows = products
    .filter((p) => p.project_id === projectId)
    .map((row) => ({
      id: row.product_id as string,
      projectId,
      title: row.title as string | null,
      detailsAuthors: row.details_authors as string | null,
      detailsJournalNumber: row.details_journal_number as string | null,
      detailsJournalTitle: row.details_journal_title as string | null,
      detailsPublishedPages: row.details_published_pages as string | null,
      detailsPublishedYear: row.details_published_year as string | null,
      detailsPublisher: row.details_publisher as string | null,
      typeCode: row.type_code as string | null,
      typeTitle: row.type_title as string | null,
      productTypeId: row.product_type_id as number | null,
      productTypeName: row.product_type_name as string | null,
      subTypeCode: row.sub_type_code as string | null,
      subTypeTitle: row.sub_type_title as string | null,
      doi: row.doi as string | null,
      issn: row.issn as string | null,
    }));
  return { projectId, products: rows };
}

export async function fetchEntityDetail(id: string): Promise<CordisEntityDetail> {
  const [entities, links, projects, types] = await Promise.all([
    load<any[]>("entities"),
    load<any[]>("project_entities"),
    load<any[]>("projects"),
    fetchAuxEntityTypes(),
  ]);
  const row = entities.find((e) => e.id === id);
  if (!row) {
    const error = new Error(`Entity ${id} not found`);
    (error as any).statusCode = 404;
    throw error;
  }
  const typeName = new Map(types.map((t) => [t.id, t.name]));
  const entity = {
    id: row.id,
    vatNumber: row.vat_number,
    legalName: row.legal_name,
    shortName: row.short_name,
    addressStreet: row.address_street,
    addressCity: row.address_city,
    addressPostalCode: row.address_postal_code,
    addressCountry: row.address_country,
    addressUrl: row.address_url,
    addressGeolocation: row.address_geolocation,
    organizationActivityType: typeName.get(row.organization_activity_type_id) ?? null,
    relatedRegionName: row.related_region_name,
    relatedRegionNutsCode: row.related_region_nuts_code,
    relatedRegionIsoCode: row.related_region_iso_code,
    relatedNutsCodeNutsCode: row.related_nuts_code_nuts_code,
  };
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const detailed = links
    .filter((l) => l.entity_id === id)
    .sort((a, b) => String(b.project_id).localeCompare(String(a.project_id)))
    .map((link) => {
      const p = projectById.get(link.project_id) ?? {};
      return {
        projectId: link.project_id,
        type: link.type,
        entityOrder: link.entity_order,
        totalCost: link.total_cost,
        ecContribution: link.ec_contribution,
        netEcContribution: link.net_ec_contribution,
        sme: link.sme,
        terminated: link.terminated,
        title: p.title ?? null,
        acronym: p.acronym ?? null,
        startDate: p.start_date ?? null,
        endDate: p.end_date ?? null,
        projectTotalCost: p.total_cost ?? null,
        projectEcMaxContribution: p.ec_max_contribution ?? null,
      };
    });
  return { entity, projects: detailed, projectCount: detailed.length } as CordisEntityDetail;
}

export async function fetchProjectDetail(id: string): Promise<CordisProjectDetail> {
  const [projects, risks, themes, projectRisks, projectThemes] = await Promise.all([
    load<any[]>("projects"),
    fetchAuxClimateRisks(),
    fetchAuxThemes(),
    load<any[]>("project_risks"),
    load<any[]>("project_themes"),
  ]);
  const row = projects.find((p) => p.id === id);
  if (!row) {
    const error = new Error(`Project ${id} not found`);
    (error as any).statusCode = 404;
    throw error;
  }
  const project = {
    id: row.id,
    cordisId: row.cordis_id ?? null,
    acronym: row.acronym ?? "",
    title: row.title ?? "",
    teaser: row.teaser ?? "",
    keywords: row.keywords ?? "",
    totalCost: row.total_cost ?? null,
    ecMaxContribution: row.ec_max_contribution ?? null,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    duration: row.duration ?? null,
  };
  const riskById = new Map(risks.map((r) => [r.id, r]));
  const themeById = new Map(themes.map((t) => [t.id, t]));
  const [entitiesResult, productsResult] = await Promise.all([fetchProjectEntities(id), fetchProjectProducts(id)]);
  return {
    project,
    risks: projectRisks.filter((r) => r.project_id === id).map((r) => riskById.get(r.risk_id)).filter(Boolean),
    themes: projectThemes.filter((t) => t.project_id === id).map((t) => themeById.get(t.theme_id)).filter(Boolean),
    entities: entitiesResult.entities,
    products: productsResult.products,
  } as CordisProjectDetail;
}

// --- Capa de la Misión ---------------------------------------------------------------------------

export async function fetchMissionProjects() {
  return load<MissionProject[]>("mission_projects");
}

export async function fetchTerritories() {
  return load<MissionTerritory[]>("territories");
}

export async function fetchProjectTerritories() {
  return load<ProjectTerritory[]>("project_territories");
}

export async function fetchEeaSignatories() {
  return load<EeaSignatory[]>("eea_signatories");
}

export async function fetchDataMeta() {
  return load<DataMeta>("meta");
}
