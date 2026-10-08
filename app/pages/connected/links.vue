<template>
  <div class="bg-neutral-lightest">
    <CaPageHeader
      n="06"
      kicker="RESEARCH ↔ DEMONSTRATION"
      title="Links between research and demonstration"
      intro="Where Mission research projects (RIA) and demonstration projects (IA) meet: organisations that take part in both, and territories where both work. The 2026 assessment of the Missions finds little evidence of these links; this view looks for them in the data."
      help-title="Reading this page"
      help="Each cell crosses one research project (row) with one demonstration project (column). Its shade counts what they share: partner organisations (CORDIS) or NUTS-3 regions where both act (Appendix 5, regional and local authorities only). Cascade and CSA projects are left out. Click a cell to see what is shared."
    />

    <div class="mx-auto w-full max-w-[1920px] px-7 py-7 pb-24">
      <div v-if="!ready" class="h-[70vh]"><USkeleton class="h-full w-full" /></div>

      <template v-else>
        <!-- stats -->
        <div class="mb-6 flex w-full flex-wrap border border-neutral-darkest bg-neutral-lightest">
          <div v-for="(s, i) in stats" :key="s.label" class="min-w-[170px] flex-1 px-5 py-4" :class="i ? 'border-l border-neutral-darkest' : ''">
            <span class="block font-display text-4xl font-bold text-neutral-darkest">{{ s.value }}</span>
            <span class="font-mono text-2xs font-semibold tracking-[0.16em] text-neutral-dark">{{ s.label }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <!-- matrix -->
          <div class="overflow-hidden border border-neutral-darkest bg-neutral-lightest">
            <div class="flex flex-wrap items-center gap-4 border-b border-neutral-darkest p-4">
              <div class="flex border border-neutral-darkest">
                <button
                  v-for="(m, i) in modes"
                  :key="m.id"
                  type="button"
                  class="px-3 py-2 font-mono text-2xs font-bold tracking-[0.08em] transition-colors"
                  :class="[i ? 'border-l border-neutral-darkest' : '', mode === m.id ? 'bg-neutral-darkest text-neutral-lightest' : 'text-neutral-dark hover:bg-neutral-lighter']"
                  @click="mode = m.id"
                >
                  {{ m.label }}
                </button>
              </div>
              <div class="flex items-center gap-2 font-mono text-[11px] text-neutral-darkest">
                <span class="text-neutral-dark">{{ mode === "orgs" ? "SHARED ORGANISATIONS" : "SHARED NUTS-3 REGIONS" }}</span>
                <span v-for="b in legend" :key="b.label" class="flex items-center gap-1">
                  <span class="h-3 w-4 border border-neutral-light" :style="{ background: b.color }" />{{ b.label }}
                </span>
              </div>
              <label class="ml-auto flex cursor-pointer items-center gap-2 font-mono text-2xs text-neutral-dark">
                <input v-model="hideEmpty" type="checkbox" class="accent-neutral-darkest" />
                HIDE PROJECTS WITHOUT LINKS
              </label>
            </div>
            <div class="overflow-x-auto p-4">
              <table class="border-separate" style="border-spacing: 2px; table-layout: fixed">
                <thead>
                  <tr>
                    <th class="sticky left-0 z-10 bg-neutral-lightest" />
                    <th v-for="c in cols" :key="c.id" class="relative h-[150px] w-[18px] min-w-[18px] max-w-[18px] p-0">
                      <button
                        type="button"
                        class="absolute bottom-1 left-[10px] origin-bottom-left -rotate-[60deg] whitespace-nowrap font-mono text-[10px] font-normal text-neutral-darkest hover:underline"
                        :class="selected?.ia === c.id ? 'font-bold' : ''"
                        @click="openProject(c.id)"
                      >
                        {{ c.name }}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in rows" :key="r.id">
                    <th class="sticky left-0 z-10 bg-neutral-lightest pr-2 text-right">
                      <button type="button" class="whitespace-nowrap font-mono text-[11px] font-normal text-neutral-darkest hover:underline" :class="selected?.ria === r.id ? 'font-bold' : ''" @click="openProject(r.id)">
                        {{ r.name }}
                      </button>
                    </th>
                    <td v-for="c in cols" :key="c.id" class="p-0">
                      <button
                        type="button"
                        class="block h-[18px] w-[18px]"
                        :class="selected?.ria === r.id && selected?.ia === c.id ? 'outline outline-2 outline-[#fdbe0f]' : ''"
                        :style="{ background: cellColor(r.id, c.id) }"
                        :title="cellTitle(r.id, c.id)"
                        @click="selectPair(r.id, c.id)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <p class="mt-3 font-mono text-[10px] text-neutral-dark">
                Rows: <span class="inline-flex items-center gap-1"><span class="h-2 w-2" :style="{ background: missionTypeColor('RIA') }" />RIA</span> research projects ({{ rows.length }}).
                Columns: <span class="inline-flex items-center gap-1"><span class="h-2 w-2" :style="{ background: missionTypeColor('IA') }" />IA</span> demonstration projects ({{ cols.length }}).
                Sorted by number of links.
              </p>
            </div>
          </div>

          <!-- panel -->
          <aside class="flex flex-col border border-neutral-darkest bg-neutral-lightest">
            <section class="flex-1 p-4">
              <span class="mb-2 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">PAIR</span>
              <p v-if="!selected" class="font-sans text-[12px] text-neutral-dark">Click a cell to see the organisations and regions a research and a demonstration project share.</p>
              <template v-else>
                <div class="flex items-start gap-2">
                  <div class="min-w-0 flex-1 font-mono text-sm font-bold">
                    <button type="button" class="hover:underline" @click="openProject(selected.ria)">{{ name(selected.ria) }}</button>
                    <span class="font-normal text-neutral-dark"> RIA ↔ </span>
                    <button type="button" class="hover:underline" @click="openProject(selected.ia)">{{ name(selected.ia) }}</button>
                    <span class="font-normal text-neutral-dark"> IA</span>
                  </div>
                  <button type="button" class="font-mono text-2xs font-bold tracking-[0.1em] text-community-pink-dark" @click="selected = null">CLEAR</button>
                </div>
                <h4 class="mb-1 mt-3 font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">SHARED ORGANISATIONS · {{ pairInfo.orgs.length }}</h4>
                <ul class="max-h-56 overflow-y-auto">
                  <li v-for="o in pairInfo.orgs" :key="o.id" class="border-b border-neutral-lighter py-1">
                    <button type="button" class="text-left text-[12px] hover:underline" @click="openEntity(o.id)">{{ o.name }}</button>
                    <span class="ml-1 font-mono text-[10px] text-neutral-dark">{{ o.country }}</span>
                  </li>
                  <li v-if="!pairInfo.orgs.length" class="text-[12px] text-neutral-dark">None</li>
                </ul>
                <h4 class="mb-1 mt-3 font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">SHARED NUTS-3 REGIONS · {{ pairInfo.regions.length }}</h4>
                <ul class="max-h-56 overflow-y-auto">
                  <li v-for="g in pairInfo.regions" :key="g.id" class="border-b border-neutral-lighter py-1 text-[12px]">
                    {{ g.name }} <span class="font-mono text-[10px] text-neutral-dark">{{ g.id }}</span>
                  </li>
                  <li v-if="!pairInfo.regions.length" class="text-[12px] text-neutral-dark">None</li>
                </ul>
              </template>
            </section>
          </aside>
        </div>

        <!-- below -->
        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CaCard title="Bridge organisations">
            <template #help>
              <CaHelp title="Bridge organisations">
                Organisations that take part in at least one research (RIA) and one demonstration (IA) Mission project, by number of projects. They are where knowledge can move from research to demonstration.
              </CaHelp>
            </template>
            <p class="mb-2 font-mono text-[11px] text-neutral-dark">{{ bridges.length }} organisations</p>
            <table class="w-full text-left text-[12px]">
              <thead class="font-mono text-[10px] text-neutral-dark">
                <tr class="border-b border-neutral-darkest"><th class="py-1.5 pr-3 text-left font-normal tracking-[0.12em]">ORGANISATION</th><th class="w-20 px-3 py-1.5 text-left font-normal tracking-[0.12em]">COUNTRY</th><th class="w-14 px-3 py-1.5 text-right font-normal tracking-[0.12em]" title="Research projects (RIA) it takes part in">RIA</th><th class="w-14 py-1.5 pl-3 text-right font-normal tracking-[0.12em]" title="Demonstration projects (IA) it takes part in">IA</th></tr>
              </thead>
              <tbody>
                <tr v-for="b in bridges.slice(0, 25)" :key="b.id" class="border-t border-neutral-lighter align-top">
                  <td class="py-1 pr-2">
                    <button type="button" class="text-left hover:underline" @click="openEntity(b.id)">{{ b.name }}</button>
                    <span class="block font-mono text-[10px] text-neutral-dark">{{ b.ria.map(name).join(", ") }} ↔ {{ b.ia.map(name).join(", ") }}</span>
                  </td>
                  <td class="px-3 py-1 font-mono text-[11px]">{{ b.country }}</td>
                  <td class="px-3 py-1 text-right font-mono text-[12px] tabular-nums">{{ b.ria.length }}</td>
                  <td class="py-1 pl-3 text-right font-mono text-[12px] tabular-nums">{{ b.ia.length }}</td>
                </tr>
              </tbody>
            </table>
          </CaCard>
          <CaCard title="Research projects without a link to demonstration">
            <template #help>
              <CaHelp title="Unlinked research">
                Research projects (RIA) that share no partner organisation and no NUTS-3 region with any demonstration project (IA). Their results need another route to the regions.
              </CaHelp>
            </template>
            <ul>
              <li v-for="p in unlinked" :key="p" class="flex gap-2 border-t border-neutral-lighter py-1.5 text-[12px]">
                <button type="button" class="font-mono text-[11px] font-bold hover:underline" @click="openProject(p)">{{ name(p) }}</button>
                <span class="text-neutral-dark">{{ missionById.get(p)?.topic_title }}</span>
              </li>
              <li v-if="!unlinked.length" class="text-[12px] text-neutral-dark">Every research project has at least one link.</li>
            </ul>
            <p class="mt-3 border-t border-neutral-lighter pt-2 font-sans text-[11px] text-neutral-dark">
              Links by territory use only regional and local authorities (NUTS levels 2 and 3), so national programmes do not create links on their own.
            </p>
          </CaCard>
        </div>
      </template>

      <CaProjectDetailModal v-model:open="isOpen" :project-id="projectId" @select-entity="onSelectEntityFromProject" />
      <CaEntityDetailModal v-model:open="isEntityOpen" :entity-id="entityId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { missionTypeColor } from "~/utils/missionTypes";

definePageMeta({ layout: "connected" });
useHead({ title: "Research ↔ demonstration · Connected Action Lab" });

const { ready, payload, features, missionById, projectTerritoryNuts, indexes } = useMissionTerritories();
const { isOpen, projectId, openProject, closeProject } = useProjectDetailModal();
const { isOpen: isEntityOpen, entityId, openEntity } = useEntityDetailModal();
function onSelectEntityFromProject(id: string) {
  closeProject();
  openEntity(id);
}

type Mode = "orgs" | "terr";
const modes: { id: Mode; label: string }[] = [
  { id: "orgs", label: "SHARED ORGANISATIONS" },
  { id: "terr", label: "SHARED TERRITORIES" },
];
const mode = ref<Mode>("orgs");
const hideEmpty = ref(true);
const selected = ref<{ ria: string; ia: string } | null>(null);

// rampas: tinta para organizaciones (como las sedes en Territories), violeta para territorios (como "dónde actúan")
const INK = ["#d9cece", "#aca2a1", "#7e7574", "#534b4a"];
const VIOLET = ["#e6dcf5", "#cab1e8", "#a67ad6", "#7945ab"];
const EMPTY = "#f1ede8";
const bucket = (n: number) => (n >= 5 ? 3 : n >= 3 ? 2 : n === 2 ? 1 : 0);

const name = (id: string) => missionById.value.get(id)?.mission_name ?? id;
const regionName = computed(() => new Map(features.value.map((f) => [f.properties.NUTS_ID, f.properties.NUTS_NAME])));

const ria = computed(() => (payload.value?.mission ?? []).filter((m) => m.project_type === "RIA").map((m) => m.cordis_id));
const ia = computed(() => (payload.value?.mission ?? []).filter((m) => m.project_type === "IA").map((m) => m.cordis_id));

const orgSets = computed(() => {
  const idx = indexes.value;
  const out = new Map<string, Set<string>>();
  for (const id of [...ria.value, ...ia.value]) out.set(id, new Set(idx?.entitiesByProject.get(id) ?? []));
  return out;
});
const terrSets = computed(() => {
  const out = new Map<string, Set<string>>();
  for (const id of [...ria.value, ...ia.value]) out.set(id, projectTerritoryNuts(id, false));
  return out;
});
const intersect = (a?: Set<string>, b?: Set<string>) => (a && b ? [...a].filter((x) => b.has(x)) : []);

const pairs = computed(() => {
  const m = new Map<string, { orgs: string[]; regions: string[] }>();
  for (const r of ria.value)
    for (const c of ia.value) {
      const orgs = intersect(orgSets.value.get(r), orgSets.value.get(c));
      const regions = intersect(terrSets.value.get(r), terrSets.value.get(c));
      if (orgs.length || regions.length) m.set(`${r}|${c}`, { orgs, regions });
    }
  return m;
});
const pairCount = (r: string, c: string) => {
  const p = pairs.value.get(`${r}|${c}`);
  return p ? (mode.value === "orgs" ? p.orgs.length : p.regions.length) : 0;
};
const linksOf = (id: string, side: "r" | "c") =>
  [...pairs.value.entries()].filter(([k, v]) => (side === "r" ? k.startsWith(id + "|") : k.endsWith("|" + id)) && (mode.value === "orgs" ? v.orgs.length : v.regions.length)).length;

const rows = computed(() =>
  ria.value
    .map((id) => ({ id, name: name(id), n: linksOf(id, "r") }))
    .filter((r) => !hideEmpty.value || r.n > 0)
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
);
const cols = computed(() =>
  ia.value
    .map((id) => ({ id, name: name(id), n: linksOf(id, "c") }))
    .filter((c) => !hideEmpty.value || c.n > 0)
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
);

function cellColor(r: string, c: string) {
  const n = pairCount(r, c);
  if (!n) return EMPTY;
  return (mode.value === "orgs" ? INK : VIOLET)[bucket(n)]!;
}
function cellTitle(r: string, c: string) {
  const p = pairs.value.get(`${r}|${c}`);
  return `${name(r)} ↔ ${name(c)}: ${p?.orgs.length ?? 0} shared organisations, ${p?.regions.length ?? 0} shared NUTS-3 regions`;
}
const legend = computed(() => {
  const ramp = mode.value === "orgs" ? INK : VIOLET;
  return [
    { label: "0", color: EMPTY },
    { label: "1", color: ramp[0]! },
    { label: "2", color: ramp[1]! },
    { label: "3–4", color: ramp[2]! },
    { label: "5+", color: ramp[3]! },
  ];
});

function selectPair(r: string, c: string) {
  selected.value = { ria: r, ia: c };
}
const pairInfo = computed(() => {
  if (!selected.value) return { orgs: [], regions: [] };
  const p = pairs.value.get(`${selected.value.ria}|${selected.value.ia}`) ?? { orgs: [], regions: [] };
  const idx = indexes.value;
  return {
    orgs: p.orgs
      .map((id) => {
        const e: any = idx?.entityById.get(id);
        return { id, name: e?.short_name || e?.legal_name || id, country: e?.address_country ?? "" };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    regions: p.regions.map((id) => ({ id, name: regionName.value.get(id) ?? id })).sort((a, b) => a.name.localeCompare(b.name)),
  };
});

const bridges = computed(() => {
  const idx = indexes.value;
  if (!idx) return [];
  const riaSet = new Set(ria.value);
  const iaSet = new Set(ia.value);
  const out: { id: string; name: string; country: string; ria: string[]; ia: string[] }[] = [];
  for (const [entityId, projects] of idx.projectsByEntity) {
    const r = [...projects].filter((p) => riaSet.has(p));
    const c = [...projects].filter((p) => iaSet.has(p));
    if (!r.length || !c.length) continue;
    const e: any = idx.entityById.get(entityId);
    out.push({ id: entityId, name: e?.short_name || e?.legal_name || entityId, country: e?.address_country ?? "", ria: r, ia: c });
  }
  return out.sort((a, b) => b.ria.length + b.ia.length - (a.ria.length + a.ia.length) || a.name.localeCompare(b.name));
});

const unlinked = computed(() => ria.value.filter((r) => ![...pairs.value.keys()].some((k) => k.startsWith(r + "|"))).sort((a, b) => name(a).localeCompare(name(b))));

const stats = computed(() => {
  const all = [...pairs.value.values()];
  return [
    { label: "RESEARCH PROJECTS (RIA)", value: ria.value.length },
    { label: "DEMONSTRATION PROJECTS (IA)", value: ia.value.length },
    { label: "PAIRS SHARING ORGANISATIONS", value: `${all.filter((p) => p.orgs.length).length} / ${ria.value.length * ia.value.length}` },
    { label: "PAIRS SHARING REGIONS", value: `${all.filter((p) => p.regions.length).length} / ${ria.value.length * ia.value.length}` },
    { label: "BRIDGE ORGANISATIONS", value: bridges.value.length },
    { label: "RIA WITHOUT ANY LINK", value: unlinked.value.length },
  ];
});
</script>
