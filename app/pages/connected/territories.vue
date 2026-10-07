<template>
  <div class="bg-neutral-lightest">
    <CaPageHeader
      n="05"
      kicker="WHERE PROJECTS ACT"
      title="Territories"
      intro="Where Mission projects work on the ground, not only where their partners are based. Regions and local authorities come from the Mission Barometer (Appendix 5); partner seats from CORDIS; Charter signatories from the EEA Adaptation Dashboard."
      help-title="Reading this page"
      help="Every authority listed by the Mission is mapped to its NUTS region (NUTS 2024; UK in NUTS 2021; Western Balkans and Türkiye in Eurostat Statistical Regions). A regional authority colours all its NUTS-3 areas. Codes were cleaned by Inviable: see the corrections log."
    />

    <div class="mx-auto w-full max-w-[1920px] px-7 py-7 pb-24">
      <div v-if="!ready" class="h-[70vh]"><USkeleton class="h-full w-full" /></div>

      <template v-else>
        <!-- stats -->
        <div class="mb-6 flex w-full flex-wrap border border-neutral-darkest bg-neutral-lightest">
          <div v-for="(s, i) in stats" :key="s.label" class="px-7 py-4" :class="i ? 'border-l border-neutral-darkest' : ''">
            <span class="block font-display text-4xl font-bold" :style="{ color: s.color }">{{ s.value.toLocaleString("en-US") }}</span>
            <span class="font-mono text-2xs font-semibold tracking-[0.16em] text-neutral-dark">{{ s.label }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <!-- map -->
          <div class="relative h-[78vh] min-h-[640px] overflow-hidden border border-neutral-darkest">
            <MissionTerritoryMap
              :features="features"
              :fills="fills"
              :signatories="showSignatories ? eeaSignatoryNuts : emptySet"
              :selected-region="selectedRegion"
              :describe="describeRegion"
              @select-region="selectRegion"
            />
            <!-- legend -->
            <div class="absolute bottom-3 left-3 z-10 border border-neutral-darkest bg-neutral-lightest p-3">
              <span class="mb-2 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">{{ legend.title }}</span>
              <div class="flex flex-col gap-1">
                <span v-for="item in legend.items" :key="item.label" class="flex items-center gap-2">
                  <span class="h-3 w-5 shrink-0" :style="{ background: item.color }" />
                  <span class="font-mono text-[11px] text-neutral-darkest">{{ item.label }}</span>
                </span>
                <span v-if="showSignatories" class="mt-1 flex items-center gap-2">
                  <span class="h-3 w-5 shrink-0 border-[1.5px] border-neutral-darkest" />
                  <span class="font-mono text-[11px] text-neutral-darkest">Charter signatory (EEA)</span>
                </span>
              </div>
            </div>
            <span class="absolute bottom-3 right-3 z-10 font-mono text-2xs text-neutral-dark">Ctrl/⌘ + scroll to zoom · drag to pan</span>
          </div>

          <!-- panel -->
          <aside class="flex flex-col border border-neutral-darkest bg-neutral-lightest">
            <section class="border-b border-neutral-darkest p-4">
              <span class="mb-2 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">VIEW</span>
              <div class="flex border border-neutral-darkest">
                <button
                  v-for="(m, i) in modes"
                  :key="m.id"
                  type="button"
                  class="flex-1 px-2 py-2 font-mono text-2xs font-bold tracking-[0.08em] transition-colors"
                  :class="[i ? 'border-l border-neutral-darkest' : '', mode === m.id ? 'bg-neutral-darkest text-neutral-lightest' : 'text-neutral-dark hover:bg-neutral-lighter']"
                  @click="mode = m.id"
                >
                  {{ m.label }}
                </button>
              </div>
              <p class="mt-2 font-sans text-[12px] leading-snug text-neutral-dark">{{ modeHelp }}</p>
            </section>

            <section class="border-b border-neutral-darkest p-4">
              <span class="mb-2 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">MISSION PROJECT TYPE</span>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="t in MISSION_TYPES"
                  :key="t.code"
                  type="button"
                  class="inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[11px] transition-colors"
                  :class="selectedTypes.includes(t.code) ? 'border-neutral-darkest bg-neutral-darkest text-neutral-lightest' : 'border-neutral-light text-neutral-darkest hover:border-neutral-darkest'"
                  @click="toggleType(t.code)"
                >
                  <span class="h-2 w-2" :style="{ background: t.color }" />{{ t.code }}
                </button>
              </div>
              <label class="mt-3 flex cursor-pointer items-center gap-2 font-mono text-2xs text-neutral-dark">
                <input v-model="includeMip" type="checkbox" class="accent-neutral-darkest" />
                INCLUDE MIP4ADAPT TECHNICAL ASSISTANCE
              </label>
              <label class="mt-1.5 flex cursor-pointer items-center gap-2 font-mono text-2xs text-neutral-dark">
                <input v-model="includeCoarse" type="checkbox" class="accent-neutral-darkest" />
                INCLUDE NATIONAL AND MACRO-REGIONAL AUTHORITIES
              </label>
              <label class="mt-1.5 flex cursor-pointer items-center gap-2 font-mono text-2xs text-neutral-dark">
                <input v-model="showSignatories" type="checkbox" class="accent-neutral-darkest" />
                OUTLINE CHARTER SIGNATORIES (EEA)
              </label>
            </section>

            <section class="border-b border-neutral-darkest p-4">
              <span class="mb-2 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">PROJECT</span>
              <div v-if="selectedProject" class="flex items-start gap-2">
                <div class="min-w-0 flex-1">
                  <div class="font-mono text-sm font-bold">{{ selectedProjectInfo?.name }}</div>
                  <div class="font-mono text-2xs text-neutral-dark">{{ selectedProjectInfo?.sub }}</div>
                </div>
                <button type="button" class="font-mono text-2xs font-bold tracking-[0.1em] text-community-pink-dark" @click="selectedProject = null">CLEAR</button>
              </div>
              <template v-else>
                <UInput v-model="query" variant="editorial" placeholder="Search a project…" class="w-full" />
                <ul class="mt-2 max-h-48 overflow-y-auto">
                  <li v-for="p in projectOptions" :key="p.id">
                    <button type="button" class="flex w-full items-center gap-2 px-1 py-1 text-left hover:bg-warm-neutral-100" @click="selectProject(p.id)">
                      <span class="h-2 w-2 shrink-0" :style="{ background: missionTypeColor(p.type) }" />
                      <span class="font-mono text-[11px]">{{ p.name }}</span>
                      <span class="ml-auto font-mono text-[11px] text-neutral-dark">{{ p.n }}</span>
                    </button>
                  </li>
                </ul>
              </template>

              <div v-if="selectedProject && projectSummary" class="mt-3 grid grid-cols-3 border border-neutral-darkest text-center">
                <div class="p-2"><span class="block font-display text-2xl font-bold text-[#0f4fc4]">{{ projectSummary.territory }}</span><span class="font-mono text-[10px] text-neutral-dark">ACTS IN (NUTS-3)</span></div>
                <div class="border-l border-neutral-darkest p-2"><span class="block font-display text-2xl font-bold text-[#fc4b08]">{{ projectSummary.seats }}</span><span class="font-mono text-[10px] text-neutral-dark">PARTNER SEATS</span></div>
                <div class="border-l border-neutral-darkest p-2"><span class="block font-display text-2xl font-bold text-[#249489]">{{ projectSummary.both }}</span><span class="font-mono text-[10px] text-neutral-dark">BOTH</span></div>
              </div>
              <ul v-if="selectedProject" class="mt-3 max-h-56 overflow-y-auto">
                <li v-for="l in selectedProjectLinks" :key="l.territory_id" class="flex items-start gap-2 border-b border-neutral-lighter py-1.5">
                  <span class="min-w-0 flex-1">
                    <span class="block text-[12px] text-neutral-darkest">{{ l.territory?.name }}</span>
                    <span class="font-mono text-[10px] text-neutral-dark">{{ l.code || l.territory?.country || "no code" }}{{ l.role ? " · " + l.role : "" }}</span>
                  </span>
                  <span v-if="l.is_signatory" class="shrink-0 border border-neutral-darkest px-1 font-mono text-[9px] font-bold">SIGNATORY</span>
                </li>
              </ul>
              <button
                v-if="selectedProject && selectedProject !== MIP4ADAPT"
                type="button"
                class="mt-2 font-mono text-2xs font-bold tracking-[0.1em] text-trust-blue-darkest"
                @click="openProject(selectedProject)"
              >
                PROJECT PROFILE →
              </button>
            </section>

            <section class="flex-1 p-4">
              <span class="mb-2 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">REGION</span>
              <p v-if="!selectedRegion" class="font-sans text-[12px] text-neutral-dark">Click a region on the map to list the Mission projects and authorities that act there.</p>
              <template v-else>
                <div class="flex items-start gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="font-mono text-sm font-bold">{{ regions.get(selectedRegion)?.name }}</div>
                    <div class="font-mono text-2xs text-neutral-dark">{{ selectedRegion }}<span v-if="regions.get(selectedRegion)?.eeaSignatory"> · Charter signatory area</span></div>
                  </div>
                  <button type="button" class="font-mono text-2xs font-bold tracking-[0.1em] text-community-pink-dark" @click="selectedRegion = null">CLEAR</button>
                </div>
                <p class="mt-2 font-mono text-[11px] text-neutral-dark">
                  {{ regionLinks.length }} authority–project links · partners from {{ regions.get(selectedRegion)?.seatProjects.size ?? 0 }} projects based here
                </p>
                <ul class="mt-2 max-h-72 overflow-y-auto">
                  <li v-for="(l, i) in regionLinks" :key="i" class="flex items-start gap-2 border-b border-neutral-lighter py-1.5">
                    <span class="mt-1 h-2 w-2 shrink-0" :style="{ background: missionTypeColor(l.mission?.project_type) }" />
                    <span class="min-w-0 flex-1">
                      <button type="button" class="block text-left font-mono text-[11px] font-bold hover:underline" @click="selectProject(l.project_id)">{{ l.mission?.mission_name ?? l.project_id }}</button>
                      <span class="block text-[12px] text-neutral-darkest">{{ l.territory?.name }}</span>
                      <span class="font-mono text-[10px] text-neutral-dark">{{ l.code }}{{ l.role ? " · " + l.role : "" }}</span>
                    </span>
                    <span v-if="l.is_signatory" class="shrink-0 border border-neutral-darkest px-1 font-mono text-[9px] font-bold">SIGNATORY</span>
                  </li>
                </ul>
              </template>
            </section>
          </aside>
        </div>

        <!-- below the map -->
        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CaCard title="Charter signatories with no Mission project in their area">
            <template #help>
              <CaHelp title="Signatory gaps">
                Signatories with a geometry in the EEA Adaptation Dashboard (309) whose NUTS area has no territory of any
                Mission project{{ includeMip ? " or MIP4Adapt assistance" : "" }} in Appendix 5. A first list of where the Mission's
                research and demonstration results have not landed yet.
              </CaHelp>
            </template>
            <p class="mb-2 font-mono text-[11px] text-neutral-dark">{{ gaps.length }} of {{ payload?.eea.length }} signatories</p>
            <ul class="max-h-72 columns-1 overflow-y-auto sm:columns-2">
              <li v-for="g in gaps" :key="g.nuts + g.name" class="break-inside-avoid py-0.5 text-[12px]">
                <span class="font-mono text-[10px] text-neutral-dark">{{ g.country }} · {{ g.nuts }}</span> {{ g.name }}
              </li>
            </ul>
          </CaCard>
          <CaCard title="Territories outside the map">
            <template #help>
              <CaHelp title="Not mapped">
                Authorities outside the NUTS system and without a Eurostat Statistical Region geometry (Ukraine, Georgia,
                Armenia, Moldova, Bosnia and Herzegovina, overseas and non-European sites).
              </CaHelp>
            </template>
            <ul class="max-h-72 overflow-y-auto">
              <li v-for="u in unmappedTerritories" :key="u.territory.id" class="flex gap-2 py-0.5 text-[12px]">
                <span class="w-10 shrink-0 font-mono text-[10px] text-neutral-dark">{{ u.territory.country }}</span>
                <span class="flex-1">{{ u.territory.name }}</span>
                <span class="font-mono text-[10px] text-neutral-dark">{{ [...u.projects].map(projectName).join(", ") }}</span>
              </li>
            </ul>
          </CaCard>
        </div>
      </template>

      <CaProjectDetailModal v-model:open="isOpen" :project-id="projectId" @select-entity="onSelectEntityFromProject" />
      <CaEntityDetailModal v-model:open="isEntityOpen" :entity-id="entityId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { MISSION_TYPES, missionTypeColor, missionTypeLabel } from "~/utils/missionTypes";

definePageMeta({ layout: "connected" });
useHead({ title: "Territories · Connected Action Lab" });

const {
  ready,
  payload,
  features,
  regions,
  missionById,
  projectTerritoryNuts,
  projectSeatNuts,
  linksForProject,
  linksForRegion,
  unmappedTerritories,
  nuts3Covered,
  MIP4ADAPT,
} = useMissionTerritories();

const { isOpen, projectId, openProject, closeProject } = useProjectDetailModal();
const { isOpen: isEntityOpen, entityId, openEntity } = useEntityDetailModal();
function onSelectEntityFromProject(id: string) {
  closeProject();
  openEntity(id);
}

type Mode = "acting" | "seats" | "contrast";
const modes: { id: Mode; label: string }[] = [
  { id: "acting", label: "WHERE THEY ACT" },
  { id: "seats", label: "PARTNER SEATS" },
  { id: "contrast", label: "CONTRAST" },
];
const mode = ref<Mode>("acting");
const selectedTypes = ref<string[]>([]);
const includeMip = ref(true);
/** Autoridades con código de país o NUTS-1 (p. ej. "Ireland", "Central and north Germany") pintan regiones enteras: fuera por defecto */
const includeCoarse = ref(false);
const showSignatories = ref(true);
const selectedProject = ref<string | null>(null);
const selectedRegion = ref<string | null>(null);
const query = ref("");
const emptySet = new Set<string>();

const modeHelp = computed(() =>
  mode.value === "acting"
    ? "Number of Mission projects whose regions or local authorities (Barometer, Appendix 5) cover each NUTS-3 area."
    : mode.value === "seats"
      ? "Number of Mission projects with at least one partner organisation based in each NUTS-3 area (CORDIS). This is what the other views of the Connected Action show."
      : "Where projects act, where their partners sit, and where both coincide."
);

const toggleType = (code: string) => {
  selectedTypes.value = selectedTypes.value.includes(code) ? selectedTypes.value.filter((c) => c !== code) : [...selectedTypes.value, code];
};

function projectAllowed(id: string) {
  if (id === MIP4ADAPT) return includeMip.value && selectedTypes.value.length === 0;
  if (!selectedTypes.value.length) return true;
  const t = missionById.value.get(id)?.project_type;
  return !!t && selectedTypes.value.includes(t);
}

const projectName = (id: string) => (id === MIP4ADAPT ? "MIP4Adapt" : missionById.value.get(id)?.mission_name ?? id);

const BLUES = ["#d4e0f6", "#93b2ea", "#4f7fd6", "#0f4fc4"];
const ORANGES = ["#fde3d6", "#fbb08e", "#f97c45", "#fc4b08"];
const bucket = (n: number) => (n >= 5 ? 3 : n >= 3 ? 2 : n === 2 ? 1 : 0);
const C_TERR = "#0f4fc4";
const C_SEAT = "#fc4b08";
const C_BOTH = "#249489";

const counts = computed(() => {
  const acting = new Map<string, number>();
  const seats = new Map<string, number>();
  for (const [id, r] of regions.value) {
    const actingHere = includeCoarse.value ? new Set([...r.actingProjects, ...r.actingProjectsCoarse]) : r.actingProjects;
    const a = [...actingHere].filter(projectAllowed).length;
    const s = [...r.seatProjects].filter(projectAllowed).length;
    if (a) acting.set(id, a);
    if (s) seats.set(id, s);
  }
  return { acting, seats };
});

const projectSets = computed(() => {
  if (!selectedProject.value) return null;
  const terr = projectTerritoryNuts(selectedProject.value, includeCoarse.value);
  const seats = selectedProject.value === MIP4ADAPT ? new Set<string>() : projectSeatNuts(selectedProject.value);
  return { terr, seats };
});

const fills = computed(() => {
  const out = new Map<string, string>();
  const ps = projectSets.value;
  if (ps) {
    if (mode.value !== "seats") for (const id of ps.terr) out.set(id, C_TERR);
    if (mode.value !== "acting") {
      for (const id of ps.seats) out.set(id, mode.value === "contrast" && ps.terr.has(id) ? C_BOTH : C_SEAT);
    }
    return out;
  }
  const { acting, seats } = counts.value;
  if (mode.value === "acting") for (const [id, n] of acting) out.set(id, BLUES[bucket(n)]!);
  else if (mode.value === "seats") for (const [id, n] of seats) out.set(id, ORANGES[bucket(n)]!);
  else {
    for (const id of acting.keys()) out.set(id, C_TERR);
    for (const id of seats.keys()) out.set(id, acting.has(id) ? C_BOTH : C_SEAT);
  }
  return out;
});

const legend = computed(() => {
  if (mode.value === "contrast" || projectSets.value) {
    const items = [];
    if (mode.value !== "seats") items.push({ label: "Project acts here", color: C_TERR });
    if (mode.value !== "acting") items.push({ label: "Partner based here", color: C_SEAT });
    if (mode.value === "contrast") items.push({ label: "Both", color: C_BOTH });
    return { title: projectSets.value ? projectName(selectedProject.value!).toUpperCase() : "PROJECTS", items };
  }
  const colors = mode.value === "acting" ? BLUES : ORANGES;
  return {
    title: mode.value === "acting" ? "PROJECTS ACTING HERE" : "PROJECTS WITH PARTNERS HERE",
    items: [
      { label: "1", color: colors[0]! },
      { label: "2", color: colors[1]! },
      { label: "3–4", color: colors[2]! },
      { label: "5 or more", color: colors[3]! },
    ],
  };
});

const eeaSignatoryNuts = computed(() => {
  const out = new Set<string>();
  for (const [id, r] of regions.value) if (r.eeaSignatory) out.add(id);
  return out;
});

function describeRegion(id: string) {
  const r = regions.value.get(id);
  if (!r) return [];
  const acting = [...(includeCoarse.value ? new Set([...r.actingProjects, ...r.actingProjectsCoarse]) : r.actingProjects)].filter(projectAllowed);
  const lines = [
    `${acting.length} project${acting.length === 1 ? "" : "s"} act here${acting.length ? ": " + acting.slice(0, 6).map(projectName).join(", ") + (acting.length > 6 ? "…" : "") : ""}`,
    `${[...r.seatProjects].filter(projectAllowed).length} projects with partners based here`,
  ];
  if (r.eeaSignatory) lines.push("Charter signatory area (EEA)");
  return lines;
}

const projectOptions = computed(() => {
  const q = query.value.trim().toLowerCase();
  const nByProject = new Map<string, number>();
  for (const l of payload.value?.links ?? []) nByProject.set(l.project_id, (nByProject.get(l.project_id) ?? 0) + 1);
  const list = [...(payload.value?.mission ?? []).map((m) => ({ id: m.cordis_id, name: m.mission_name, type: m.project_type as string | null, n: nByProject.get(m.cordis_id) ?? 0 })),
    { id: MIP4ADAPT, name: "MIP4Adapt (technical assistance)", type: null, n: nByProject.get(MIP4ADAPT) ?? 0 }];
  return list
    .filter((p) => projectAllowed(p.id) || p.id === MIP4ADAPT)
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
});

function selectProject(id: string) {
  selectedProject.value = id;
  if (mode.value === "seats") mode.value = "contrast";
}
function selectRegion(id: string) {
  selectedRegion.value = selectedRegion.value === id ? null : id;
}

const selectedProjectInfo = computed(() => {
  const id = selectedProject.value;
  if (!id) return null;
  if (id === MIP4ADAPT) return { name: "MIP4Adapt", sub: "Mission Implementation Platform · technical assistance to regions" };
  const m = missionById.value.get(id);
  return { name: m?.mission_name ?? id, sub: [missionTypeLabel(m?.project_type), m?.topic_code].filter(Boolean).join(" · ") };
});
const selectedProjectLinks = computed(() => (selectedProject.value ? linksForProject(selectedProject.value) : []));
const projectSummary = computed(() => {
  const ps = projectSets.value;
  if (!ps) return null;
  return { territory: ps.terr.size, seats: ps.seats.size, both: [...ps.terr].filter((id) => ps.seats.has(id)).length };
});

const regionLinks = computed(() =>
  selectedRegion.value
    ? linksForRegion(selectedRegion.value).filter((l) => projectAllowed(l.project_id) && (includeCoarse.value || (l.level ?? 3) >= 2))
    : []
);

const gaps = computed(() =>
  (payload.value?.eea ?? []).filter((s) => {
    const covered = s.codes.flatMap((c) => nuts3Covered(c));
    return covered.length > 0 && covered.every((id) => (counts.value.acting.get(id) ?? 0) === 0);
  })
);

const stats = computed(() => {
  const terr = payload.value?.territories ?? [];
  const { acting, seats } = counts.value;
  const both = [...acting.keys()].filter((id) => seats.has(id)).length;
  return [
    { label: "AUTHORITIES (APPENDIX 5)", value: terr.length, color: "#100007" },
    { label: "NUTS-3 WHERE PROJECTS ACT", value: acting.size, color: C_TERR },
    { label: "NUTS-3 WITH PARTNER SEATS", value: seats.size, color: C_SEAT },
    { label: "BOTH", value: both, color: C_BOTH },
    { label: "SIGNATORIES WITHOUT A PROJECT", value: gaps.value.length, color: "#86592b" },
  ];
});
</script>
