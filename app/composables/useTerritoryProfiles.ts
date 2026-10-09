// Territories v2: la vista parte del territorio (NUTS-3 o NUTS-2) y responde, para cada uno,
// qué proyectos actúan allí, qué entidades de allí firman la Charter y qué entidades de allí participan
// (en proyectos que actúan allí o en otros territorios). Las entidades vienen del catálogo unificado
// (public/data/actors.json, scripts/entity_catalogue.py), que une anexo 5, firmantes EEA y socios CORDIS.
import type { FeatureCollection } from "geojson";
import type { Actor, ActorNature, MissionProject, MissionTerritory, ProjectTerritory } from "~/types/mission";
import {
  fetchActors,
  fetchMissionProjects,
  fetchProjectEntitiesTable,
  fetchProjectTerritories,
  fetchTerritories,
} from "~/utils/cordisRepository";

export type TerritoryLevel = 3 | 2;
export type Role = "all" | "Demonstrator" | "Replicator";
export type ProfileClass = "both" | "projects" | "partners" | "none";
export type NatureGroup = "authority" | "public" | "academia" | "company" | "ngo" | "other";
export type RoleFilter = "all" | "both" | "signs" | "takes";

type NutsFeature = GeoJSON.Feature<GeoJSON.Geometry, { NUTS_ID: string; NUTS_NAME: string }>;

export const MIP4ADAPT = "MIP4Adapt";

export const NATURE_EN: Record<ActorNature, string> = {
  "Autoridad local": "Local authority",
  "Autoridad regional": "Regional authority",
  "Autoridad nacional": "National authority",
  "Otro organismo público": "Other public body",
  Universidad: "University",
  "Centro de investigación": "Research centre",
  Empresa: "Company",
  "ONG / fundación / asociación": "NGO / foundation / association",
  Otra: "Other",
};

export const NATURE_GROUPS: { id: NatureGroup; label: string; natures: ActorNature[] }[] = [
  { id: "authority", label: "Authorities", natures: ["Autoridad local", "Autoridad regional", "Autoridad nacional"] },
  { id: "academia", label: "Universities & research", natures: ["Universidad", "Centro de investigación"] },
  { id: "company", label: "Companies", natures: ["Empresa"] },
  { id: "ngo", label: "NGOs & foundations", natures: ["ONG / fundación / asociación"] },
  { id: "public", label: "Other public bodies", natures: ["Otro organismo público"] },
  { id: "other", label: "Other", natures: ["Otra"] },
];
const GROUP_OF = new Map<ActorNature, NatureGroup>(NATURE_GROUPS.flatMap((g) => g.natures.map((n) => [n, g.id] as const)));
export const natureGroupOf = (n: ActorNature) => GROUP_OF.get(n) ?? "other";
export const isAuthority = (n: ActorNature) => natureGroupOf(n) === "authority";

/** un código está dentro de la región R (mismo nivel o más fino) */
const within = (code: string, r: string) => code.startsWith(r);
/** un código cubre la región R desde un nivel superior */
const above = (code: string, r: string) => code.length < r.length && r.startsWith(code);

export interface Filters {
  level: Ref<TerritoryLevel>;
  types: Ref<string[]>;
  role: Ref<Role>;
  natures: Ref<NatureGroup[]>;
}

export interface ActorParticipation {
  /** proyectos en los que es socio (CORDIS), tras los filtros de tipo */
  partner: string[];
  /** vínculos del anexo 5 en los que es territorio, tras los filtros de tipo (incluido MIP) y papel */
  territory: ProjectTerritory[];
}

export function useTerritoryProfiles(f: Filters) {
  const { data: payload, pending } = useAsyncData("territory-profiles", async () => {
    const [territories, links, mission, actors, pe, geo24, geoUk, geo2] = await Promise.all([
      fetchTerritories(),
      fetchProjectTerritories(),
      fetchMissionProjects(),
      fetchActors(),
      fetchProjectEntitiesTable(),
      import("~/assets/geo/NUTS_RG_60M_2024_4326_LEVL_3.json").then((m) => m.default as unknown as FeatureCollection),
      import("~/assets/geo/NUTS_RG_60M_2021_4326_LEVL_3_UK.json").then((m) => m.default as unknown as FeatureCollection),
      import("~/assets/geo/NUTS2_from_NUTS3.json").then((m) => m.default as unknown as FeatureCollection),
    ]);
    return {
      territories,
      links,
      mission,
      actors,
      pe,
      features3: [...geo24.features, ...geoUk.features] as NutsFeature[],
      features2: geo2.features as NutsFeature[],
    };
  });

  const ready = computed(() => !pending.value && !!payload.value);
  const missionById = computed(() => new Map<string, MissionProject>((payload.value?.mission ?? []).map((m) => [m.cordis_id, m])));
  const territoryById = computed(() => new Map<string, MissionTerritory>((payload.value?.territories ?? []).map((t) => [t.id, t])));
  const features = computed(() => (f.level.value === 3 ? payload.value?.features3 : payload.value?.features2) ?? []);
  const regionName = computed(() => {
    const m = new Map<string, string>();
    for (const x of payload.value?.features3 ?? []) m.set(x.properties.NUTS_ID, x.properties.NUTS_NAME);
    for (const x of payload.value?.features2 ?? []) m.set(x.properties.NUTS_ID, x.properties.NUTS_NAME);
    return m;
  });
  const regionIds = computed(() => new Set(features.value.map((x) => x.properties.NUTS_ID)));
  const idLen = computed(() => (f.level.value === 3 ? 5 : 4));

  // --- índices que no dependen de los filtros ---
  const linksByTerritory = computed(() => {
    const m = new Map<string, ProjectTerritory[]>();
    for (const l of payload.value?.links ?? []) {
      if (!m.has(l.territory_id)) m.set(l.territory_id, []);
      m.get(l.territory_id)!.push(l);
    }
    return m;
  });
  const linksByProject = computed(() => {
    const m = new Map<string, ProjectTerritory[]>();
    for (const l of payload.value?.links ?? []) {
      if (!m.has(l.project_id)) m.set(l.project_id, []);
      m.get(l.project_id)!.push(l);
    }
    return m;
  });
  const projectsByCordisEntity = computed(() => {
    const m = new Map<string, Set<string>>();
    const ids = missionById.value;
    for (const r of payload.value?.pe ?? []) {
      if (!ids.has(r.projectId)) continue;
      if (!m.has(r.entityId)) m.set(r.entityId, new Set());
      m.get(r.entityId)!.add(r.projectId);
    }
    return m;
  });
  const actorById = computed(() => new Map((payload.value?.actors ?? []).map((a) => [a.id, a])));
  /** entrada del anexo 5 -> entidad unificada (varias entradas pueden ser la misma autoridad con otro nombre) */
  const actorOfTerritory = computed(() => {
    const m = new Map<string, Actor>();
    for (const a of payload.value?.actors ?? []) for (const t of a.annex_ids) m.set(t, a);
    return m;
  });
  /** nombre de la autoridad unificada y, si el proyecto la escribe de otra forma, ese nombre */
  function territoryLabel(territoryId: string) {
    const original = territoryById.value.get(territoryId)?.name ?? territoryId;
    const unified = actorOfTerritory.value.get(territoryId)?.name;
    return unified && unified !== original ? `${unified} (as "${original}")` : original;
  }
  /** el área de una entidad: los códigos de la autoridad (anexo 5, EEA) o, si no es autoridad, la sede CORDIS */
  const areaOf = (a: Actor) => (a.codes.length ? a.codes : a.seats);

  // --- filtros ---
  /** tipo de proyecto de la Misión; MIP4Adapt es su propia categoría (MIP) */
  const projectType = (id: string) => (id === MIP4ADAPT ? "MIP" : missionById.value.get(id)?.project_type ?? null);
  function projectAllowed(id: string) {
    if (!f.types.value.length) return true;
    const t = projectType(id);
    return !!t && f.types.value.includes(t);
  }
  const linkAllowed = (l: ProjectTerritory) => projectAllowed(l.project_id) && (f.role.value === "all" || l.role === f.role.value);
  const actorAllowed = (a: Actor) => !f.natures.value.length || f.natures.value.includes(natureGroupOf(a.nature));

  const participation = computed(() => {
    const m = new Map<string, ActorParticipation>();
    for (const a of payload.value?.actors ?? []) {
      const partner = new Set<string>();
      for (const c of a.cordis_ids) for (const p of projectsByCordisEntity.value.get(c) ?? []) if (projectAllowed(p)) partner.add(p);
      const territory: ProjectTerritory[] = [];
      for (const t of a.annex_ids) for (const l of linksByTerritory.value.get(t) ?? []) if (linkAllowed(l)) territory.push(l);
      m.set(a.id, { partner: [...partner], territory });
    }
    return m;
  });
  const takesPart = (a: Actor) => {
    const p = participation.value.get(a.id);
    return !!p && (p.partner.length > 0 || p.territory.length > 0);
  };

  /** NUTS (al nivel elegido) donde actúa un proyecto, solo con códigos de ese nivel o más finos */
  const projectRegions = computed(() => {
    const m = new Map<string, Set<string>>();
    const n = idLen.value;
    for (const l of payload.value?.links ?? []) {
      if (!l.code || l.code.length < n || !linkAllowed(l)) continue;
      if (!m.has(l.project_id)) m.set(l.project_id, new Set());
      m.get(l.project_id)!.add(l.code.slice(0, n));
    }
    return m;
  });

  // --- perfil de cada región al nivel elegido ---
  /**
   * RLA (regional or local authority) comprometida con la Misión: autoridad del anexo 5 con un proyecto o MIP4Adapt
   * (tras los filtros de tipo y papel), o autoridad local o regional que es socia CORDIS de un proyecto de la Misión.
   */
  const isEngagedRla = (a: Actor) => {
    const p = participation.value.get(a.id);
    if (!p) return false;
    if (a.annex_ids.length && p.territory.length) return true;
    return (a.nature === "Autoridad local" || a.nature === "Autoridad regional") && p.partner.length > 0;
  };
  const isRla = (a: Actor) => a.annex_ids.length > 0 || a.nature === "Autoridad local" || a.nature === "Autoridad regional";

  // --- perfil de cada región al nivel elegido ---
  const profiles = computed(() => {
    const n = idLen.value;
    const out = new Map<string, { projects: Set<string>; rlas: Set<string>; partners: Set<string>; signatories: Set<string>; cls: ProfileClass }>();
    const get = (id: string) => {
      if (!regionIds.value.has(id)) return null;
      if (!out.has(id)) out.set(id, { projects: new Set(), rlas: new Set(), partners: new Set(), signatories: new Set(), cls: "none" });
      return out.get(id)!;
    };
    for (const [p, regs] of projectRegions.value) for (const r of regs) get(r)?.projects.add(p);
    for (const a of payload.value?.actors ?? []) {
      if (!actorAllowed(a)) continue;
      const part = participation.value.get(a.id)!;
      const engaged = isEngagedRla(a);
      for (const code of areaOf(a)) {
        if (code.length < n) continue;
        const r = get(code.slice(0, n));
        if (!r) continue;
        if (engaged) r.rlas.add(a.id);
        if (part.partner.length) r.partners.add(a.id);
        if (a.signatory) r.signatories.add(a.id);
      }
    }
    // clases del mapa: RLA comprometida y socios de proyectos / solo RLA / solo socios
    for (const r of out.values()) r.cls = r.rlas.size && r.partners.size ? "both" : r.rlas.size ? "projects" : r.partners.size ? "partners" : "none";
    return out;
  });

  const stats = computed(() => {
    const c = { both: 0, projects: 0, partners: 0, signOnly: 0, withSignatories: 0, any: 0 };
    for (const r of profiles.value.values()) {
      if (r.cls !== "none") c[r.cls]++;
      if (r.signatories.size) c.withSignatories++;
      if (r.cls === "none" && r.signatories.size) c.signOnly++;
      if (r.cls !== "none" || r.signatories.size) c.any++;
    }
    return c;
  });

  /**
   * Cifras de cabecera (vocabulario de la Misión). Siguen el filtro de tipo de proyecto y, si hay un territorio elegido,
   * cuentan solo las entidades con sede o territorio en él. No siguen el filtro de tipo de entidad.
   */
  function headline(region: string | null) {
    const inScope = (a: Actor) => !region || areaOf(a).some((c) => within(c, region));
    const actors = (payload.value?.actors ?? []).filter(inScope);
    const types = (a: Actor) => {
      const p = participation.value.get(a.id)!;
      return new Set([...p.partner.map(projectType), ...p.territory.map((l) => projectType(l.project_id))]);
    };
    const roles = (a: Actor, role: string) => participation.value.get(a.id)!.territory.some((l) => l.role === role);
    const engaged = actors.filter(isEngagedRla);
    const signatories = actors.filter((a) => a.signatory);
    const partnerIds = new Set<string>();
    for (const a of actors) if (participation.value.get(a.id)!.partner.length) for (const c of a.cordis_ids) partnerIds.add(c);
    return {
      engaged: engaged.length,
      engagedResearch: engaged.filter((a) => types(a).has("RIA")).length,
      signatories: signatories.length,
      signatoriesEngaged: signatories.filter((a) => takesPart(a)).length,
      technicalAssistance: actors.filter((a) => isRla(a) && participation.value.get(a.id)!.territory.some((l) => ["MIP", "Cascade"].includes(projectType(l.project_id) ?? ""))).length,
      demonstrators: actors.filter((a) => isRla(a) && roles(a, "Demonstrator")).length,
      replicators: actors.filter((a) => isRla(a) && roles(a, "Replicator")).length,
      partners: partnerIds.size,
    };
  }

  // --- flujos desde y hacia una región (vista C) ---
  const partnersByProject = computed(() => {
    const m = new Map<string, Set<string>>();
    for (const a of payload.value?.actors ?? [])
      for (const c of a.cordis_ids)
        for (const p of projectsByCordisEntity.value.get(c) ?? []) {
          if (!m.has(p)) m.set(p, new Set());
          m.get(p)!.add(a.id);
        }
    return m;
  });
  /**
   * out: de la región a las zonas donde actúan los proyectos en los que sus entidades son socias (peso = entidad × proyecto);
   * in: de las sedes de los socios de los proyectos que actúan en la región hacia ella (peso = socio × proyecto).
   */
  function flowsFor(r: string) {
    const n = idLen.value;
    const regionOf = (a: Actor) => {
      const c = areaOf(a).find((x) => x.length >= n);
      return c ? c.slice(0, n) : null;
    };
    const out = new Map<string, number>();
    const inn = new Map<string, number>();
    const outProjects = new Set<string>();
    const inProjects = new Set<string>();
    for (const a of payload.value?.actors ?? []) {
      if (!actorAllowed(a) || regionOf(a) !== r) continue;
      for (const p of participation.value.get(a.id)?.partner ?? []) {
        for (const dest of projectRegions.value.get(p) ?? []) {
          if (dest === r) continue;
          out.set(dest, (out.get(dest) ?? 0) + 1);
          outProjects.add(p);
        }
      }
    }
    for (const [p, regs] of projectRegions.value) {
      if (!regs.has(r) || !projectAllowed(p)) continue;
      for (const id of partnersByProject.value.get(p) ?? []) {
        const a = actorById.value.get(id)!;
        if (!actorAllowed(a)) continue;
        const o = regionOf(a);
        if (!o || o === r) continue;
        inn.set(o, (inn.get(o) ?? 0) + 1);
        inProjects.add(p);
      }
    }
    const countries = (m: Map<string, number>) => new Set([...m.keys()].map((k) => k.slice(0, 2))).size;
    return {
      out: [...out.entries()].map(([to, weight]) => ({ from: r, to, weight })),
      in: [...inn.entries()].map(([from, weight]) => ({ from, to: r, weight })),
      summary: {
        outAreas: out.size, outCountries: countries(out), outProjects: outProjects.size,
        inAreas: inn.size, inCountries: countries(inn), inProjects: inProjects.size,
      },
    };
  }

  // --- ficha de una región ---
  function regionProfile(r: string) {
    const actors = (payload.value?.actors ?? []).filter(actorAllowed);
    const here = actors.filter((a) => areaOf(a).some((c) => within(c, r)));
    const fromAbove = actors.filter((a) => a.codes.length && !a.codes.some((c) => within(c, r)) && a.codes.some((c) => above(c, r)));

    // 1. proyectos que actúan aquí, por autoridad y papel
    const linksHere = (payload.value?.links ?? []).filter((l) => l.code && within(l.code, r) && linkAllowed(l));
    const linksAbove = (payload.value?.links ?? []).filter((l) => l.code && above(l.code, r) && linkAllowed(l));
    const group = (ls: ProjectTerritory[]) => {
      const m = new Map<string, ProjectTerritory[]>();
      for (const l of ls) {
        if (!m.has(l.project_id)) m.set(l.project_id, []);
        if (!m.get(l.project_id)!.some((x) => x.territory_id === l.territory_id)) m.get(l.project_id)!.push(l);
      }
      return [...m.entries()]
        .map(([project, ls]) => ({ project, links: ls }))
        .sort((a, b) => b.links.length - a.links.length || projectName(a.project).localeCompare(projectName(b.project)));
    };

    // 3. entidades de aquí que participan: aquí o en otros territorios
    const regionOfProject = (p: string) => (linksByProject.value.get(p) ?? []).filter((l) => l.code && linkAllowed(l));
    // un proyecto actúa aquí si tiene un territorio dentro de esta zona o una autoridad regional (NUTS-2) que la cubre;
    // las autoridades nacionales o macrorregionales (NUTS-0/1) no cuentan: harían "local" a todo el país
    const actsHere = (p: string) => regionOfProject(p).some((l) => within(l.code!, r) || (l.code!.length >= 4 && above(l.code!, r)));
    const partHere: { actor: Actor; partner: string[]; territory: ProjectTerritory[] }[] = [];
    const partElsewhere: { actor: Actor; projects: { project: string; countries: string[] }[] }[] = [];
    for (const a of here) {
      const p = participation.value.get(a.id)!;
      const ph = p.partner.filter(actsHere);
      const pe = p.partner.filter((x) => !actsHere(x));
      if (ph.length || p.territory.length) partHere.push({ actor: a, partner: ph, territory: p.territory });
      if (pe.length)
        partElsewhere.push({
          actor: a,
          projects: pe.map((project) => ({
            project,
            countries: [...new Set(regionOfProject(project).map((l) => l.code!.slice(0, 2)))].sort(),
          })),
        });
    }
    const byWeight = <T extends { actor: Actor }>(xs: T[], w: (x: T) => number) =>
      xs.sort((a, b) => w(b) - w(a) || a.actor.name.localeCompare(b.actor.name));

    return {
      id: r,
      name: regionName.value.get(r) ?? r,
      profile: profiles.value.get(r) ?? null,
      projectsHere: group(linksHere),
      projectsAbove: group(linksAbove),
      signatoriesHere: here.filter((a) => a.signatory).sort((a, b) => a.name.localeCompare(b.name)),
      signatoriesAbove: fromAbove.filter((a) => a.signatory).sort((a, b) => a.name.localeCompare(b.name)),
      partHere: byWeight(partHere, (x) => x.partner.length + x.territory.length),
      partElsewhere: byWeight(partElsewhere, (x) => x.projects.length),
      actorsHere: here,
      actorsAbove: fromAbove,
    };
  }

  // --- tabla de entidades ---
  function roleOf(a: Actor): RoleFilter {
    const t = takesPart(a);
    return a.signatory && t ? "both" : a.signatory ? "signs" : t ? "takes" : "all";
  }
  function actorRow(a: Actor) {
    const p = participation.value.get(a.id)!;
    const home = areaOf(a);
    const homeLocal = home.filter((c) => c.length >= 5).map((c) => c.slice(0, 5));
    const homeRegions = homeLocal.length ? homeLocal : home;
    let here = 0;
    let elsewhere = 0;
    for (const proj of p.partner) {
      const ls = (linksByProject.value.get(proj) ?? []).filter((l) => l.code && linkAllowed(l));
      if (ls.some((l) => homeRegions.some((h) => within(l.code!, h) || (l.code!.length >= 4 && above(l.code!, h))))) here++;
      else elsewhere++;
    }
    const uniqTerr = new Map<string, ProjectTerritory>();
    for (const l of p.territory) uniqTerr.set(l.project_id + "|" + l.role, l);
    const terr = [...uniqTerr.values()];
    return {
      actor: a,
      role: roleOf(a),
      partner: p.partner.length,
      demonstrator: new Set(terr.filter((l) => l.role === "Demonstrator").map((l) => l.project_id)).size,
      replicator: new Set(terr.filter((l) => l.role === "Replicator").map((l) => l.project_id)).size,
      territoryOther: new Set(terr.filter((l) => !l.role).map((l) => l.project_id)).size,
      partnerHere: here,
      partnerElsewhere: elsewhere,
      home: homeRegions.map((c) => ({ code: c, name: regionName.value.get(c) ?? null })),
    };
  }

  const projectName = (id: string) => (id === MIP4ADAPT ? "MIP4Adapt" : missionById.value.get(id)?.mission_name ?? id);

  return {
    ready,
    payload,
    features,
    regionName,
    missionById,
    territoryById,
    actorById,
    territoryLabel,
    profiles,
    stats,
    participation,
    regionProfile,
    flowsFor,
    headline,
    isEngagedRla,
    roleOf,
    actorRow,
    takesPart,
    actorAllowed,
    projectAllowed,
    projectType,
    projectName,
    areaOf,
  };
}
