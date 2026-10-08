<template>
  <div class="bg-neutral-lightest">
    <CaPageHeader
      n="05"
      kicker="TERRITORIES"
      title="Territories"
      intro="Start from a territory. For each NUTS-3 area (or NUTS-2 region): which Mission projects act there, which of its entities sign the Charter, and which of its entities take part in projects — there or elsewhere."
      help-title="Reading this page"
      help="Projects act where Appendix 5 of the Mission Barometer places their regions and local authorities (as demonstrator, replicator or with no role given). Entities are the authorities of Appendix 5, the Charter signatories of the EEA Adaptation Dashboard and the CORDIS partners of the 65 Mission projects, joined into one list. An authority coded at a higher level (a region, a country) is shown as 'from above', not as local."
    />

    <div class="mx-auto w-full max-w-[1920px] px-7 py-7 pb-24">
      <div v-if="!ready" class="h-[70vh]"><USkeleton class="h-full w-full" /></div>

      <template v-else>
        <!-- stats -->
        <div class="stats mb-6 grid w-full grid-cols-2 border-l border-t border-neutral-darkest bg-neutral-lightest md:grid-cols-3 2xl:grid-cols-6">
          <div v-for="s in statCells" :key="s.label" class="border-b border-r border-neutral-darkest px-5 py-4">
            <span class="block font-display text-4xl font-bold text-neutral-darkest">{{ s.value.toLocaleString("en-US") }}</span>
            <span class="inline-flex items-center gap-2 font-mono text-2xs font-semibold tracking-[0.16em] text-neutral-dark">
              <span v-if="s.swatch" class="h-3 w-4 shrink-0" :style="s.swatch" />{{ s.label }}
            </span>
          </div>
        </div>

        <p class="-mt-3 mb-6 max-w-[1100px] font-sans text-[12px] leading-snug text-neutral-dark">
          <strong class="font-semibold text-neutral-darkest">Data status.</strong>
          Entities from the three sources are joined automatically where country, territory and name agree
          ({{ actorsCount.toLocaleString("en-US") }} entities). Doubtful matches and the nature of some public bodies are under manual
          review by Inviable; figures may change slightly when it is applied. Appendix 5 lists regions for 63 of the 65 Mission projects
          (not for National Adaptation Hubs and REGILIENCE-plus, coordination actions at national or European scale).
        </p>

        <!-- controls -->
        <div class="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3 border border-neutral-darkest bg-neutral-lightest p-4">
          <div>
            <span class="mb-1.5 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">LEVEL</span>
            <div class="flex border border-neutral-darkest">
              <button
                v-for="(l, i) in levels"
                :key="l.id"
                type="button"
                class="px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.08em] transition-colors"
                :class="[i ? 'border-l border-neutral-darkest' : '', level === l.id ? 'bg-neutral-darkest text-neutral-lightest' : 'text-neutral-dark hover:bg-neutral-lighter']"
                @click="setLevel(l.id)"
              >
                {{ l.label }}
              </button>
            </div>
          </div>
          <div class="relative w-[280px]">
            <span class="mb-1.5 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">FIND A TERRITORY OR ENTITY</span>
            <UInput v-model="query" variant="editorial" placeholder="e.g. Galicia, Aarhus, Deltares…" class="w-full" />
            <ul v-if="searchResults.length" class="absolute left-0 right-0 top-full z-30 max-h-72 overflow-y-auto border border-neutral-darkest bg-neutral-lightest shadow-lg">
              <li v-for="r in searchResults" :key="r.kind + r.id">
                <button type="button" class="flex w-full items-baseline gap-2 px-2 py-1.5 text-left hover:bg-warm-neutral-100" @click="pickResult(r)">
                  <span class="text-[12px] text-neutral-darkest">{{ r.label }}</span>
                  <span class="ml-auto shrink-0 font-mono text-[10px] text-neutral-dark">{{ r.sub }}</span>
                </button>
              </li>
            </ul>
          </div>
          <div>
            <span class="mb-1.5 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">PROJECT TYPE</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="t in MISSION_TYPES"
                :key="t.code"
                type="button"
                class="inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[11px] transition-colors"
                :class="types.includes(t.code) ? 'border-neutral-darkest bg-neutral-darkest text-neutral-lightest' : 'border-neutral-light text-neutral-darkest hover:border-neutral-darkest'"
                @click="toggleType(t.code)"
              >
                <span class="h-2 w-2" :style="{ background: t.color }" />{{ t.code }}
              </button>
            </div>
          </div>
          <div>
            <span class="mb-1.5 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">ROLE OF THE TERRITORY</span>
            <div class="flex border border-neutral-darkest">
              <button
                v-for="(r, i) in roleOptions"
                :key="r.id"
                type="button"
                class="px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.08em] transition-colors"
                :class="[i ? 'border-l border-neutral-darkest' : '', role === r.id ? 'bg-neutral-darkest text-neutral-lightest' : 'text-neutral-dark hover:bg-neutral-lighter']"
                @click="role = r.id"
              >
                {{ r.label }}
              </button>
            </div>
          </div>
          <div>
            <span class="mb-1.5 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">ENTITIES</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="g in NATURE_GROUPS"
                :key="g.id"
                type="button"
                class="border px-2 py-1 font-mono text-[11px] transition-colors"
                :class="natures.includes(g.id) ? 'border-neutral-darkest bg-neutral-darkest text-neutral-lightest' : 'border-neutral-light text-neutral-darkest hover:border-neutral-darkest'"
                @click="toggleNature(g.id)"
              >
                {{ g.label }}
              </button>
            </div>
          </div>
          <label class="flex cursor-pointer items-center gap-2 pb-1.5 font-mono text-2xs text-neutral-dark">
            <input v-model="includeMip" type="checkbox" class="accent-neutral-darkest" />
            INCLUDE MIP4ADAPT ASSISTANCE
          </label>
        </div>

        <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
          <!-- map -->
          <div class="relative h-[78vh] min-h-[640px] overflow-hidden border border-neutral-darkest">
            <MissionTerritoryMap
              :features="features"
              :fills="fills"
              :signatories="signatoryRegions"
              :selected-region="selected"
              :describe="describeRegion"
              @select-region="selectRegion"
            />
            <div class="absolute bottom-3 left-3 z-10 max-w-[330px] border border-neutral-darkest bg-neutral-lightest p-3">
              <span class="mb-2 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">{{ level === 3 ? "NUTS-3 AREAS" : "NUTS-2 REGIONS" }} BY PROFILE</span>
              <div class="flex flex-col gap-1">
                <span v-for="c in legendItems" :key="c.id" class="flex items-start gap-2">
                  <span class="mt-0.5 h-3 w-5 shrink-0 border border-neutral-light" :style="c.style" />
                  <span class="font-mono text-[11px] leading-snug text-neutral-darkest">{{ c.label }}</span>
                  <span class="ml-auto pl-2 font-mono text-[11px] text-neutral-dark">{{ c.n }}</span>
                </span>
              </div>
              <p class="mt-2 border-t border-neutral-lighter pt-1.5 font-sans text-[11px] leading-snug text-neutral-dark">
                "Partners" are entities based here that are partners (CORDIS) of a Mission project. Map colours do not show project type.
              </p>
            </div>
            <span class="absolute bottom-3 right-3 z-10 font-mono text-2xs text-neutral-dark">Ctrl/⌘ + scroll to zoom · drag to pan</span>
          </div>

          <!-- territory profile -->
          <aside class="flex max-h-[78vh] min-h-[640px] flex-col overflow-y-auto border border-neutral-darkest bg-neutral-lightest">
            <div v-if="!profile" class="p-5">
              <span class="mb-2 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">TERRITORY PROFILE</span>
              <p class="font-sans text-[13px] leading-snug text-neutral-dark">
                Click an area on the map, or search above, to see which projects act there, which of its entities sign the Charter and
                which take part in projects there or elsewhere.
              </p>
            </div>
            <template v-else>
              <header class="sticky top-0 z-10 flex items-start gap-2 border-b border-neutral-darkest bg-neutral-lightest p-4">
                <div class="min-w-0 flex-1">
                  <div class="font-mono text-sm font-bold">{{ profile.name }}</div>
                  <div class="mt-0.5 flex items-center gap-2 font-mono text-2xs text-neutral-dark">
                    {{ profile.id }} · {{ level === 3 ? "NUTS-3" : "NUTS-2" }}
                    <span v-if="profile.profile" class="inline-flex items-center gap-1"><span class="h-2.5 w-3.5 border border-neutral-light" :style="CLS[profile.profile.cls].style" />{{ CLS[profile.profile.cls].short }}</span>
                  </div>
                </div>
                <button type="button" class="font-mono text-2xs font-bold tracking-[0.1em] text-community-pink-dark" @click="selected = null">CLEAR</button>
              </header>

              <!-- 1 projects -->
              <section class="border-b border-neutral-darkest p-4">
                <h3 class="mb-2 font-mono text-2xs font-bold tracking-[0.16em] text-neutral-darkest">1 · PROJECTS ACTING HERE · {{ profile.projectsHere.length }}</h3>
                <p v-if="!profile.projectsHere.length" class="text-[12px] text-neutral-dark">No Mission project lists a local authority of this area in Appendix 5.</p>
                <ul>
                  <li v-for="p in profile.projectsHere" :key="p.project" class="border-b border-neutral-lighter py-1.5">
                    <button type="button" class="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold hover:underline" @click="openMission(p.project)">
                      <span class="h-2 w-2 shrink-0" :style="{ background: missionTypeColor(missionById.get(p.project)?.project_type) }" />
                      {{ projectName(p.project) }}
                      <span class="font-normal text-neutral-dark">{{ missionById.get(p.project)?.project_type ?? "service" }}</span>
                    </button>
                    <span v-for="l in p.links" :key="l.territory_id" class="block pl-3.5 text-[12px] leading-snug text-neutral-darkest">
                      {{ territoryById.get(l.territory_id)?.name }}
                      <span class="font-mono text-[10px] text-neutral-dark">· {{ roleLabel(l.role) }}</span>
                    </span>
                  </li>
                </ul>
                <template v-if="profile.projectsAbove.length">
                  <h4 class="mb-1 mt-3 font-mono text-[10px] font-bold tracking-[0.14em] text-neutral-dark">FROM ABOVE · {{ profile.projectsAbove.length }}</h4>
                  <p class="mb-1 text-[11px] leading-snug text-neutral-dark">Projects that work with a regional or national authority covering this area.</p>
                  <ul>
                    <li v-for="p in profile.projectsAbove" :key="p.project" class="py-0.5 text-[12px] leading-snug">
                      <button type="button" class="font-mono text-[11px] font-bold hover:underline" @click="openMission(p.project)">{{ projectName(p.project) }}</button>
                      <span class="text-neutral-dark"> · {{ p.links.map((l) => `${territoryById.get(l.territory_id)?.name} (${roleLabel(l.role)})`).join("; ") }}</span>
                    </li>
                  </ul>
                </template>
              </section>

              <!-- 2 signatories -->
              <section class="border-b border-neutral-darkest p-4">
                <h3 class="mb-2 font-mono text-2xs font-bold tracking-[0.16em] text-neutral-darkest">2 · CHARTER SIGNATORIES FROM HERE · {{ profile.signatoriesHere.length }}</h3>
                <p v-if="!profile.signatoriesHere.length" class="text-[12px] text-neutral-dark">No entity of this area signs the Charter (EEA list and Appendix 5).</p>
                <ul>
                  <li v-for="a in profile.signatoriesHere" :key="a.id" class="flex items-start gap-2 border-b border-neutral-lighter py-1.5">
                    <span class="min-w-0 flex-1">
                      <button type="button" class="text-left text-[12px] text-neutral-darkest" :class="a.cordis_ids.length ? 'hover:underline' : 'cursor-default'" @click="openActor(a)">{{ a.name }}</button>
                      <span class="block font-mono text-[10px] text-neutral-dark">{{ NATURE_EN[a.nature] }}</span>
                    </span>
                    <span class="shrink-0 border px-1 font-mono text-[9px] font-bold" :class="takesPart(a) ? 'border-neutral-darkest' : 'border-neutral-light text-neutral-dark'">{{ signRole(a) }}</span>
                  </li>
                </ul>
                <template v-if="profile.signatoriesAbove.length">
                  <h4 class="mb-1 mt-3 font-mono text-[10px] font-bold tracking-[0.14em] text-neutral-dark">FROM ABOVE · {{ profile.signatoriesAbove.length }}</h4>
                  <ul>
                    <li v-for="a in profile.signatoriesAbove" :key="a.id" class="flex gap-2 py-0.5 text-[12px]">
                      <span class="flex-1">{{ a.name }} <span class="font-mono text-[10px] text-neutral-dark">· {{ NATURE_EN[a.nature] }}</span></span>
                      <span class="shrink-0 font-mono text-[9px] font-bold text-neutral-dark">{{ signRole(a) }}</span>
                    </li>
                  </ul>
                </template>
              </section>

              <!-- 3 entities taking part -->
              <section class="p-4">
                <h3 class="mb-2 font-mono text-2xs font-bold tracking-[0.16em] text-neutral-darkest">3 · ENTITIES FROM HERE TAKING PART</h3>
                <div class="mb-2 flex border border-neutral-darkest">
                  <button
                    v-for="(t, i) in partTabs"
                    :key="t.id"
                    type="button"
                    class="flex-1 px-2 py-1.5 font-mono text-[10px] font-bold tracking-[0.08em] transition-colors"
                    :class="[i ? 'border-l border-neutral-darkest' : '', partTab === t.id ? 'bg-neutral-darkest text-neutral-lightest' : 'text-neutral-dark hover:bg-neutral-lighter']"
                    @click="partTab = t.id"
                  >
                    {{ t.label }} · {{ t.id === "here" ? profile.partHere.length : profile.partElsewhere.length }}
                  </button>
                </div>
                <p class="mb-1 text-[11px] leading-snug text-neutral-dark">
                  {{ partTab === "here" ? "In projects that act in this area (directly or through its regional authority): as partner (CORDIS) or as demonstration / replication territory (Appendix 5)." : "As partners (CORDIS) in projects that act in other territories; country codes show where." }}
                </p>
                <ul v-if="partTab === 'here'">
                  <li v-for="x in profile.partHere" :key="x.actor.id" class="border-b border-neutral-lighter py-1.5">
                    <button type="button" class="text-left text-[12px] text-neutral-darkest" :class="x.actor.cordis_ids.length ? 'hover:underline' : 'cursor-default'" @click="openActor(x.actor)">{{ x.actor.name }}</button>
                    <span class="block font-mono text-[10px] text-neutral-dark">
                      {{ NATURE_EN[x.actor.nature] }}<template v-if="x.actor.signatory"> · signatory</template>
                    </span>
                    <span v-if="x.partner.length" class="block text-[11px] leading-snug"><span class="font-mono text-[10px] font-bold">PARTNER</span> {{ x.partner.map(projectName).join(", ") }}</span>
                    <span v-if="x.territory.length" class="block text-[11px] leading-snug"><span class="font-mono text-[10px] font-bold">TERRITORY</span> {{ territoryList(x.territory) }}</span>
                  </li>
                  <li v-if="!profile.partHere.length" class="text-[12px] text-neutral-dark">None.</li>
                </ul>
                <ul v-else>
                  <li v-for="x in profile.partElsewhere" :key="x.actor.id" class="border-b border-neutral-lighter py-1.5">
                    <button type="button" class="text-left text-[12px] text-neutral-darkest" :class="x.actor.cordis_ids.length ? 'hover:underline' : 'cursor-default'" @click="openActor(x.actor)">{{ x.actor.name }}</button>
                    <span class="block font-mono text-[10px] text-neutral-dark">{{ NATURE_EN[x.actor.nature] }}<template v-if="x.actor.signatory"> · signatory</template></span>
                    <span class="block text-[11px] leading-snug">
                      <template v-for="(p, i) in x.projects" :key="p.project">{{ i ? "; " : "" }}{{ projectName(p.project) }} <span class="font-mono text-[10px] text-neutral-dark">{{ p.countries.join(" ") || "no regions" }}</span></template>
                    </span>
                  </li>
                  <li v-if="!profile.partElsewhere.length" class="text-[12px] text-neutral-dark">None.</li>
                </ul>
              </section>
            </template>
          </aside>
        </div>

        <!-- entities table -->
        <CaCard class="mt-6" :title="profile ? `Entities of ${profile.name}` : 'All entities'" body-class="p-0">
          <template #help>
            <CaHelp title="Entities and their roles" :w="320">
              One row per entity, after joining Appendix 5 authorities, EEA Charter signatories and CORDIS partners. "Signs" =
              Charter signatory. "Partner" = Mission projects where it is a CORDIS partner, split by whether the project acts in the
              entity's own area, directly or through its regional authority (here), or elsewhere. "Demonstrator" / "Replicator" = projects where it is a territory in Appendix 5.
            </CaHelp>
          </template>
          <template #right>
            <label v-if="profile" class="flex cursor-pointer items-center gap-2 font-mono text-2xs text-neutral-dark">
              <input v-model="tableAbove" type="checkbox" class="accent-neutral-darkest" />
              INCLUDE AUTHORITIES FROM ABOVE
            </label>
          </template>
          <div class="flex flex-wrap items-center gap-3 border-b border-neutral-darkest px-5 py-3">
            <div class="flex border border-neutral-darkest">
              <button
                v-for="(r, i) in roleFilters"
                :key="r.id"
                type="button"
                class="px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.08em] transition-colors"
                :class="[i ? 'border-l border-neutral-darkest' : '', roleFilter === r.id ? 'bg-neutral-darkest text-neutral-lightest' : 'text-neutral-dark hover:bg-neutral-lighter']"
                @click="roleFilter = r.id"
              >
                {{ r.label }} · {{ roleCounts[r.id] }}
              </button>
            </div>
            <select v-if="!profile" v-model="country" class="border border-neutral-darkest bg-neutral-lightest px-2 py-1.5 font-mono text-[11px]">
              <option value="">ALL COUNTRIES</option>
              <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
            </select>
            <UInput v-model="tableQuery" variant="editorial" placeholder="Filter by name…" class="w-[220px]" />
            <span class="ml-auto font-mono text-[11px] text-neutral-dark">{{ tableRows.length.toLocaleString("en-US") }} entities</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-[12px]">
              <thead class="font-mono text-[10px] text-neutral-dark">
                <tr class="border-b border-neutral-darkest">
                  <th class="px-5 py-2 font-normal tracking-[0.12em]">ENTITY</th>
                  <th class="px-3 py-2 font-normal tracking-[0.12em]">NATURE</th>
                  <th class="px-3 py-2 font-normal tracking-[0.12em]">BASED IN</th>
                  <th class="px-3 py-2 text-center font-normal tracking-[0.12em]">SIGNS</th>
                  <th class="px-3 py-2 text-right font-normal tracking-[0.12em]" title="Partner in projects acting in its own area">PARTNER · HERE</th>
                  <th class="px-3 py-2 text-right font-normal tracking-[0.12em]" title="Partner in projects acting elsewhere">PARTNER · ELSEWHERE</th>
                  <th class="px-3 py-2 text-right font-normal tracking-[0.12em]">DEMONSTRATOR</th>
                  <th class="px-3 py-2 text-right font-normal tracking-[0.12em]">REPLICATOR</th>
                  <th class="px-5 py-2 text-right font-normal tracking-[0.12em]" title="Territory in Appendix 5 with no role given">TERRITORY, NO ROLE</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in tableRows.slice(0, tableLimit)" :key="r.actor.id" class="border-b border-neutral-lighter align-top">
                  <td class="px-5 py-1.5">
                    <button type="button" class="text-left" :class="r.actor.cordis_ids.length ? 'hover:underline' : 'cursor-default'" @click="openActor(r.actor)">{{ r.actor.name }}</button>
                    <span v-if="r.above" class="ml-1 font-mono text-[9px] text-neutral-dark">FROM ABOVE</span>
                  </td>
                  <td class="px-3 py-1.5 font-mono text-[11px]">{{ NATURE_EN[r.actor.nature] }}</td>
                  <td class="px-3 py-1.5 font-mono text-[11px]">
                    <button v-for="h in r.home" :key="h.code" type="button" class="mr-1 hover:underline" :title="h.name ?? ''" @click="selectCode(h.code)">{{ h.code }}</button>
                    <span v-if="!r.home.length" class="text-neutral-dark">{{ r.actor.country ?? "—" }}</span>
                  </td>
                  <td class="px-3 py-1.5 text-center font-mono text-[11px]">{{ r.actor.signatory ? "✓" : "" }}</td>
                  <td class="px-3 py-1.5 text-right font-mono text-[12px] tabular-nums">{{ r.partnerHere || "" }}</td>
                  <td class="px-3 py-1.5 text-right font-mono text-[12px] tabular-nums">{{ r.partnerElsewhere || "" }}</td>
                  <td class="px-3 py-1.5 text-right font-mono text-[12px] tabular-nums">{{ r.demonstrator || "" }}</td>
                  <td class="px-3 py-1.5 text-right font-mono text-[12px] tabular-nums">{{ r.replicator || "" }}</td>
                  <td class="px-5 py-1.5 text-right font-mono text-[12px] tabular-nums">{{ r.territoryOther || "" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="tableRows.length > tableLimit" class="border-t border-neutral-darkest px-5 py-3">
            <button type="button" class="font-mono text-2xs font-bold tracking-[0.1em] text-trust-blue-darkest" @click="tableLimit += 100">SHOW 100 MORE</button>
          </div>
        </CaCard>

        <MissionAnnexCards class="mt-6" />
      </template>

      <CaProjectDetailModal v-model:open="isOpen" :project-id="projectId" @select-entity="onSelectEntityFromProject" />
      <CaEntityDetailModal v-model:open="isEntityOpen" :entity-id="entityId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Actor, ProjectTerritory } from "~/types/mission";
import { MISSION_TYPES, missionTypeColor } from "~/utils/missionTypes";
import {
  MIP4ADAPT,
  NATURE_EN,
  NATURE_GROUPS,
  type NatureGroup,
  type ProfileClass,
  type Role,
  type RoleFilter,
  type TerritoryLevel,
} from "~/composables/useTerritoryProfiles";

definePageMeta({ layout: "connected" });
useHead({ title: "Territories · Connected Action Lab" });

const { isOpen, projectId, openProject, closeProject } = useProjectDetailModal();
const { isOpen: isEntityOpen, entityId, openEntity } = useEntityDetailModal();
function onSelectEntityFromProject(id: string) {
  closeProject();
  openEntity(id);
}

// --- filtros ---
const level = ref<TerritoryLevel>(3);
const types = ref<string[]>([]);
const role = ref<Role>("all");
const includeMip = ref(true);
const natures = ref<NatureGroup[]>([]);
const levels: { id: TerritoryLevel; label: string }[] = [
  { id: 3, label: "NUTS-3" },
  { id: 2, label: "NUTS-2" },
];
const roleOptions: { id: Role; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "Demonstrator", label: "DEMONSTRATOR" },
  { id: "Replicator", label: "REPLICATOR" },
];
const toggleType = (c: string) => (types.value = types.value.includes(c) ? types.value.filter((x) => x !== c) : [...types.value, c]);
const toggleNature = (g: NatureGroup) => (natures.value = natures.value.includes(g) ? natures.value.filter((x) => x !== g) : [...natures.value, g]);

const T = useTerritoryProfiles({ level, types, role, includeMip, natures });
const ready = T.ready;
const features = T.features;
const missionById = T.missionById;
const territoryById = T.territoryById;
const { projectName, takesPart, regionProfile, actorRow } = T;

// --- mapa ---
const CLS: Record<ProfileClass, { color: string; short: string; label: string; style: Record<string, string> }> = {
  both: { color: "#7945ab", short: "projects + local partners", label: "Projects act directly here and local entities are partners", style: { background: "#7945ab" } },
  projects: { color: "#cab1e8", short: "projects, no local partner", label: "Projects act directly here, no local partner", style: { background: "#cab1e8" } },
  partners: { color: "#9a908e", short: "local partners, no project here", label: "Local partners, but no project acts directly here", style: { background: "#9a908e" } },
  none: { color: "#f6f3ef", short: "no project or partner", label: "No project or partner", style: { background: "#f6f3ef" } },
};
const fills = computed(() => {
  const m = new Map<string, string>();
  for (const [id, p] of T.profiles.value) if (p.cls !== "none") m.set(id, CLS[p.cls].color);
  return m;
});
const signatoryRegions = computed(() => new Set([...T.profiles.value].filter(([, p]) => p.signatories.size).map(([id]) => id)));
const legendItems = computed(() => {
  const s = T.stats.value;
  return [
    { id: "both", label: CLS.both.label, style: CLS.both.style, n: s.both },
    { id: "projects", label: CLS.projects.label, style: CLS.projects.style, n: s.projects },
    { id: "partners", label: CLS.partners.label, style: CLS.partners.style, n: s.partners },
    { id: "sig", label: "Dashed outline: an entity from here signs the Charter", style: { border: "1.5px dashed #403339", background: "#f6f3ef" }, n: s.withSignatories },
  ];
});
const selected = ref<string | null>(null);
function selectRegion(id: string) {
  selected.value = selected.value === id ? null : id;
}
function setLevel(l: TerritoryLevel) {
  if (l === level.value) return;
  const s = selected.value;
  level.value = l;
  selected.value = s ? (l === 2 ? s.slice(0, 4) : null) : null;
}
function selectCode(code: string) {
  if (code.length < 4) return;
  if (code.length === 4 && level.value === 3) level.value = 2;
  selected.value = code.slice(0, level.value === 3 ? 5 : 4);
}
function describeRegion(id: string) {
  const p = T.profiles.value.get(id);
  if (!p) return ["No project, partner or signatory"];
  return [
    `${p.projects.size} project${p.projects.size === 1 ? "" : "s"} act here`,
    `${p.partners.size} local partner organisation${p.partners.size === 1 ? "" : "s"}`,
    `${p.signatories.size} Charter signator${p.signatories.size === 1 ? "y" : "ies"}`,
  ];
}

// --- ficha ---
const profile = computed(() => (selected.value ? regionProfile(selected.value) : null));
const partTabs = [
  { id: "here" as const, label: "HERE" },
  { id: "elsewhere" as const, label: "ELSEWHERE" },
];
const partTab = ref<"here" | "elsewhere">("here");
const roleLabel = (r: string | null) => (r === "Demonstrator" ? "demonstrator" : r === "Replicator" ? "replicator" : "role not given");
function territoryList(ls: ProjectTerritory[]) {
  const seen = new Map<string, Set<string>>();
  for (const l of ls) {
    const k = projectName(l.project_id);
    if (!seen.has(k)) seen.set(k, new Set());
    seen.get(k)!.add(roleLabel(l.role));
  }
  return [...seen.entries()].map(([p, rs]) => `${p} (${[...rs].join(", ")})`).join(", ");
}
function signRole(a: Actor) {
  const p = T.participation.value.get(a.id);
  const parts: string[] = [];
  if (p?.partner.length) parts.push("PARTNER");
  if (p?.territory.length) parts.push("TERRITORY");
  return parts.length ? `SIGNS + ${parts.join(" + ")}` : "SIGNS ONLY";
}
function openMission(id: string) {
  if (id !== MIP4ADAPT) openProject(id);
}
function openActor(a: Actor) {
  if (a.cordis_ids.length) openEntity(a.cordis_ids[0]!);
}

// --- búsqueda ---
const query = ref("");
const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const searchResults = computed(() => {
  const q = norm(query.value.trim());
  if (q.length < 2) return [];
  const out: { kind: "region" | "actor"; id: string; label: string; sub: string; code: string | null }[] = [];
  for (const [id, name] of T.regionName.value) {
    if (id.length !== (level.value === 3 ? 5 : 4)) continue;
    if (norm(name).includes(q) || id.toLowerCase() === q) out.push({ kind: "region", id, label: name, sub: id, code: id });
    if (out.length >= 6) break;
  }
  for (const a of T.payload.value?.actors ?? []) {
    if (!norm(a.name).includes(q)) continue;
    const code = T.areaOf(a)[0] ?? null;
    out.push({ kind: "actor", id: a.id, label: a.name, sub: `${NATURE_EN[a.nature]} · ${code ?? a.country ?? ""}`, code });
    if (out.length >= 14) break;
  }
  return out;
});
function pickResult(r: { code: string | null }) {
  if (r.code) selectCode(r.code);
  query.value = "";
}

// --- tabla ---
const roleFilters: { id: RoleFilter; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "both", label: "SIGN AND TAKE PART" },
  { id: "signs", label: "SIGN ONLY" },
  { id: "takes", label: "TAKE PART ONLY" },
];
const roleFilter = ref<RoleFilter>("all");
const country = ref("");
const tableQuery = ref("");
const tableAbove = ref(true);
const tableLimit = ref(100);
watch([selected, roleFilter, country, tableQuery, natures, types, role], () => (tableLimit.value = 100));

const actorsCount = computed(() => T.payload.value?.actors.length ?? 0);
const countries = computed(() => [...new Set((T.payload.value?.actors ?? []).map((a) => a.country).filter(Boolean) as string[])].sort());
const scopeActors = computed(() => {
  const p = profile.value;
  if (p) return [...p.actorsHere.map((a) => ({ a, above: false })), ...(tableAbove.value ? p.actorsAbove.map((a) => ({ a, above: true })) : [])];
  return (T.payload.value?.actors ?? []).filter((a) => T.actorAllowed(a) && (!country.value || a.country === country.value)).map((a) => ({ a, above: false }));
});
const scopeRows = computed(() =>
  scopeActors.value
    .map(({ a, above }) => ({ ...actorRow(a), above }))
    .filter((r) => r.role !== "all")
);
const roleCounts = computed(() => {
  const c: Record<RoleFilter, number> = { all: scopeRows.value.length, both: 0, signs: 0, takes: 0 };
  for (const r of scopeRows.value) c[r.role]++;
  return c;
});
const tableRows = computed(() => {
  const q = norm(tableQuery.value.trim());
  return scopeRows.value
    .filter((r) => roleFilter.value === "all" || r.role === roleFilter.value)
    .filter((r) => !q || norm(r.actor.name).includes(q))
    .sort(
      (a, b) =>
        Number(a.above) - Number(b.above) ||
        b.partnerHere + b.partnerElsewhere + b.demonstrator + b.replicator + b.territoryOther - (a.partnerHere + a.partnerElsewhere + a.demonstrator + a.replicator + a.territoryOther) ||
        a.actor.name.localeCompare(b.actor.name)
    );
});

// --- cifras ---
const statCells = computed(() => {
  const s = T.stats.value;
  const unit = level.value === 3 ? "NUTS-3" : "NUTS-2";
  const all = (T.payload.value?.actors ?? []).filter(T.actorAllowed).map((a) => T.roleOf(a));
  return [
    { label: `${unit} WHERE PROJECTS ACT`, value: s.both + s.projects, swatch: null },
    { label: "…WITH LOCAL PARTNERS TOO", value: s.both, swatch: CLS.both.style },
    { label: `${unit} WITH PARTNERS, NO PROJECT`, value: s.partners, swatch: CLS.partners.style },
    { label: "ENTITIES THAT SIGN AND TAKE PART", value: all.filter((r) => r === "both").length, swatch: null },
    { label: "SIGN ONLY", value: all.filter((r) => r === "signs").length, swatch: null },
    { label: "TAKE PART ONLY", value: all.filter((r) => r === "takes").length, swatch: null },
  ];
});
</script>
