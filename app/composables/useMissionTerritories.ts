// Capa territorial de la Misión: dónde actúa cada proyecto (anexo 5 del Barómetro, limpio)
// frente a dónde tienen la sede sus socios (CORDIS), con los firmantes de la Charter (EEA).
import type { FeatureCollection } from "geojson";
import type { EeaSignatory, MissionProject, MissionTerritory, ProjectTerritory } from "~/types/mission";
import {
  fetchEeaSignatories,
  fetchMissionProjects,
  fetchProjectTerritories,
  fetchTerritories,
} from "~/utils/cordisRepository";

type NutsFeature = GeoJSON.Feature<GeoJSON.Geometry, { NUTS_ID: string; NUTS_NAME: string }>;

export type RegionStats = {
  id: string;
  name: string;
  /** proyectos de la Misión con algún territorio de intervención que cubre esta NUTS-3 */
  actingProjects: Set<string>;
  /** idem, pero solo a través de autoridades nacionales o macrorregionales (NUTS 0-1) */
  actingProjectsCoarse: Set<string>;
  /** cada relación proyecto–territorio que cubre esta NUTS-3, con su papel (demostrador / replicador) */
  acting: { project: string; role: string | null; coarse: boolean }[];
  /** autoridades del anexo 5 cuyo código cubre esta NUTS-3 */
  territories: Set<string>;
  /** proyectos con al menos un socio con sede en esta NUTS-3 */
  seatProjects: Set<string>;
  /** algún territorio de intervención aquí es firmante de la Charter (anexo 5) */
  annexSignatory: boolean;
  /** hay un firmante de la Charter con geometría en el dashboard de la EEA que cubre esta NUTS-3 */
  eeaSignatory: boolean;
};

const MIP4ADAPT = "MIP4Adapt";

export function useMissionTerritories() {
  const { indexes, ready: cordisReady } = useConnectedCordisIndexes();

  const { data: payload, pending } = useAsyncData("mission-territories", async () => {
    const [territories, links, mission, eea, geo24, geoUk] = await Promise.all([
      fetchTerritories(),
      fetchProjectTerritories(),
      fetchMissionProjects(),
      fetchEeaSignatories(),
      import("~/assets/geo/NUTS_RG_60M_2024_4326_LEVL_3.json").then((m) => m.default as unknown as FeatureCollection),
      import("~/assets/geo/NUTS_RG_60M_2021_4326_LEVL_3_UK.json").then((m) => m.default as unknown as FeatureCollection),
    ]);
    return {
      territories,
      links,
      mission,
      eea,
      features: [...geo24.features, ...geoUk.features] as NutsFeature[],
    };
  });

  const territoryById = computed(
    () => new Map<string, MissionTerritory>((payload.value?.territories ?? []).map((t) => [t.id, t]))
  );
  const missionById = computed(
    () => new Map<string, MissionProject>((payload.value?.mission ?? []).map((m) => [m.cordis_id, m]))
  );
  const features = computed(() => payload.value?.features ?? []);
  const nutsIds = computed(() => features.value.map((f) => f.properties.NUTS_ID));

  // Un código territorial (nivel 0-3) cubre todas las NUTS-3 que empiezan por él.
  const coverCache = new Map<string, string[]>();
  function nuts3Covered(code: string | null | undefined): string[] {
    if (!code) return [];
    if (!coverCache.has(code)) coverCache.set(code, nutsIds.value.filter((id) => id.startsWith(code)));
    return coverCache.get(code)!;
  }

  const regions = computed(() => {
    const map = new Map<string, RegionStats>();
    if (!payload.value) return map;
    for (const f of features.value) {
      map.set(f.properties.NUTS_ID, {
        id: f.properties.NUTS_ID,
        name: f.properties.NUTS_NAME,
        actingProjects: new Set(),
        actingProjectsCoarse: new Set(),
        acting: [],
        territories: new Set(),
        seatProjects: new Set(),
        annexSignatory: false,
        eeaSignatory: false,
      });
    }
    for (const link of payload.value.links) {
      for (const id of nuts3Covered(link.code)) {
        const r = map.get(id)!;
        const coarse = (link.level ?? 3) <= 1;
        if (coarse) r.actingProjectsCoarse.add(link.project_id);
        else r.actingProjects.add(link.project_id);
        r.acting.push({ project: link.project_id, role: link.role ?? null, coarse });
        r.territories.add(link.territory_id);
        if (link.is_signatory) r.annexSignatory = true;
      }
    }
    for (const s of payload.value.eea) {
      for (const code of s.codes) for (const id of nuts3Covered(code)) map.get(id)!.eeaSignatory = true;
    }
    const idx = indexes.value;
    if (idx) {
      for (const [entityId, nutsId] of idx.entityToRegion) {
        const r = map.get(nutsId);
        if (!r) continue;
        for (const projectId of idx.projectsByEntity.get(entityId) ?? []) r.seatProjects.add(projectId);
      }
    }
    return map;
  });

  /** NUTS-3 cubiertas por los territorios de un proyecto */
  function projectTerritoryNuts(projectId: string, includeCoarse = false, role: string | null = null): Set<string> {
    const out = new Set<string>();
    for (const link of payload.value?.links ?? []) {
      if (link.project_id !== projectId) continue;
      if (!includeCoarse && (link.level ?? 3) <= 1) continue;
      if (role && link.role !== role) continue;
      for (const id of nuts3Covered(link.code)) out.add(id);
    }
    return out;
  }

  /** NUTS-3 donde tiene sede algún socio del proyecto */
  function projectSeatNuts(projectId: string): Set<string> {
    const out = new Set<string>();
    const idx = indexes.value;
    if (!idx) return out;
    for (const entityId of idx.entitiesByProject.get(projectId) ?? []) {
      const nuts = idx.entityToRegion.get(entityId);
      if (nuts) out.add(nuts);
    }
    return out;
  }

  function linksForProject(projectId: string): (ProjectTerritory & { territory: MissionTerritory | undefined })[] {
    const seen = new Set<string>();
    return (payload.value?.links ?? [])
      .filter((l) => l.project_id === projectId)
      .filter((l) => (seen.has(l.territory_id) ? false : (seen.add(l.territory_id), true)))
      .map((l) => ({ ...l, territory: territoryById.value.get(l.territory_id) }));
  }

  function linksForRegion(nutsId: string) {
    const r = regions.value.get(nutsId);
    if (!r) return [];
    return (payload.value?.links ?? [])
      .filter((l) => r.territories.has(l.territory_id) && nuts3Covered(l.code).includes(nutsId))
      .map((l) => ({ ...l, territory: territoryById.value.get(l.territory_id), mission: missionById.value.get(l.project_id) }));
  }

  /** Territorios que no se pueden dibujar (fuera de NUTS y de las Statistical Regions con geometría) */
  const unmappedTerritories = computed(() => {
    const out = new Map<string, { territory: MissionTerritory; projects: Set<string> }>();
    for (const l of payload.value?.links ?? []) {
      if (nuts3Covered(l.code).length) continue;
      const t = territoryById.value.get(l.territory_id);
      if (!t) continue;
      if (!out.has(t.id)) out.set(t.id, { territory: t, projects: new Set() });
      out.get(t.id)!.projects.add(l.project_id);
    }
    return [...out.values()].sort((a, b) => (a.territory.country ?? "").localeCompare(b.territory.country ?? ""));
  });

  /** Firmantes de la Charter (EEA) sin ningún territorio de un proyecto de la Misión ni de MIP4Adapt */
  const signatoryGaps = computed(() => {
    if (!payload.value) return [] as EeaSignatory[];
    return payload.value.eea.filter((s) => {
      const covered = s.codes.flatMap((c) => nuts3Covered(c));
      return covered.length > 0 && covered.every((id) => (regions.value.get(id)?.actingProjects.size ?? 0) === 0);
    });
  });

  const ready = computed(() => !pending.value && !!payload.value && cordisReady.value);

  return {
    ready,
    payload,
    features,
    regions,
    territoryById,
    missionById,
    nuts3Covered,
    projectTerritoryNuts,
    projectSeatNuts,
    linksForProject,
    linksForRegion,
    unmappedTerritories,
    signatoryGaps,
    indexes,
    MIP4ADAPT,
  };
}
