<template>
  <div class="bg-neutral-lightest">
    <CaPageHeader
      n="04"
      kicker="PROJECTS UMAP"
      title="Projects UMAP"
      intro="Projects placed in 2-D semantic space from the climate risks or themes they address — switch view below. Projects that sit close together share similar categories; hover a legend item to highlight its cluster and fade the rest."
      help-title="Reading the plot"
      help="Position comes from a UMAP projection of the active view (risks or themes) — axes have no units. Bubble size reflects funding relative to duration; the stacked shadow scales with the number of participating entities."
    />

    <div class="mx-auto w-full max-w-[1920px] px-7 py-7 pb-24">
      <div class="relative h-[82vh] min-h-[680px] overflow-hidden border border-neutral-darkest bg-neutral-lightest">
        <div v-if="!ready" class="absolute inset-0 flex items-center justify-center">
          <USkeleton class="h-full w-full" />
        </div>

        <div v-else class="absolute inset-0">
          <UmapProjectsNew
            :projects="projectItems"
            :years="yearsRange"
            :risk-circles="riskItems"
            :theme-circles="themeItems"
            :category-mode="categoryMode"
            :active-category="activeCategory"
            :color-by-type="colorByType"
            :selected-types="selectedTypes"
            @select-project="openProject"
          />
        </div>

        <CaProjectDetailModal
          v-model:open="isOpen"
          :project-id="projectId"
          @select-entity="onSelectEntityFromProject"
        />
        <CaEntityDetailModal v-model:open="isEntityOpen" :entity-id="entityId" />

        <!-- bubble-size legend -->
        <div class="absolute bottom-3 left-3 z-10 border border-neutral-darkest bg-neutral-lightest p-3">
          <span class="mb-2 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">BUBBLE SIZE = FUNDING</span>
          <div class="flex items-end gap-3">
            <span v-for="b in [6, 11, 16]" :key="b" class="flex flex-col items-center gap-1">
              <span class="block rounded-full border-2 border-neutral-darkest bg-neutral-lightest" :style="{ width: `${b * 2}px`, height: `${b * 2}px` }" />
            </span>
            <span class="font-mono text-2xs text-neutral-dark">low → high</span>
          </div>
        </div>

        <!-- category clusters (floating panel) -->
        <div class="absolute right-3 top-3 z-10 max-h-[calc(100%-24px)] w-[280px] overflow-y-auto border border-neutral-darkest bg-neutral-lightest">
          <!-- EU Mission project type -->
          <header class="flex items-center gap-2 border-b border-neutral-darkest px-4 py-3">
            <span class="font-mono text-xs font-bold tracking-[0.06em]">MISSION PROJECT TYPE</span>
            <CaHelp title="Project type" align="right" :w="280">
              Classification used by the EU Mission on Adaptation (Barometer, Appendix 4): research (RIA),
              demonstration (IA), technical support with cascade funding, and coordination (CSA).
              Click a type to highlight it; click again to clear.
            </CaHelp>
          </header>
          <div class="flex flex-col gap-1.5 border-b border-neutral-darkest p-4">
            <button
              v-for="t in typeItems"
              :key="t.code"
              type="button"
              class="flex items-center gap-2.5 text-left transition-opacity"
              :class="selectedTypes.length && !selectedTypes.includes(t.code) ? 'opacity-40' : ''"
              @click="toggleType(t.code)"
            >
              <span class="h-3 w-3 shrink-0" :style="{ background: colorByType ? t.color : '#1E63A2' }" />
              <span class="font-mono text-[11px] text-neutral-darkest">{{ t.code }} · {{ t.short }}</span>
              <span class="ml-auto font-mono text-[11px] text-neutral-dark">{{ t.count }}</span>
            </button>
            <label class="mt-2 flex cursor-pointer items-center gap-2 font-mono text-2xs text-neutral-dark">
              <input v-model="colorByType" type="checkbox" class="accent-neutral-darkest" />
              COLOUR BY TYPE
            </label>
          </div>
          <div class="flex border-b border-neutral-darkest">
            <button
              type="button"
              class="flex-1 border-r border-neutral-darkest px-3 py-2.5 font-mono text-2xs font-bold tracking-[0.12em] transition-colors"
              :class="categoryMode === 'risks' ? 'bg-neutral-darkest text-neutral-lightest' : 'text-neutral-dark hover:bg-neutral-lighter'"
              @click="setCategoryMode('risks')"
            >
              RISKS
            </button>
            <button
              type="button"
              class="flex-1 px-3 py-2.5 font-mono text-2xs font-bold tracking-[0.12em] transition-colors"
              :class="categoryMode === 'themes' ? 'bg-neutral-darkest text-neutral-lightest' : 'text-neutral-dark hover:bg-neutral-lighter'"
              @click="setCategoryMode('themes')"
            >
              THEMES
            </button>
          </div>
          <header class="flex items-center gap-2 border-b border-neutral-darkest px-4 py-3">
            <span class="font-mono text-xs font-bold tracking-[0.06em]">{{ legendTitle }}</span>
            <CaHelp title="Clusters" align="right" :w="260">
              {{ legendHelp }}
            </CaHelp>
          </header>
          <ul class="flex flex-col gap-2 p-4">
            <li
              v-for="item in legendItems"
              :key="item.value"
              class="flex cursor-pointer items-center gap-2.5 transition-opacity"
              :class="pinnedCategory && pinnedCategory !== item.label ? 'opacity-40' : ''"
              @mouseenter="activeCategory = item.label"
              @mouseleave="activeCategory = pinnedCategory"
              @click="togglePinnedCategory(item.label)"
            >
              <span
                class="h-3 w-3 shrink-0 rounded-full border-2 border-dashed transition-colors"
                :class="activeCategory === item.label ? 'border-trust-blue bg-trust-blue-light/40' : 'border-neutral-dark'"
              />
              <span class="font-mono text-[11px] text-neutral-darkest">{{ item.label }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "connected" });
import * as d3 from "d3";
import { fetchMissionProjects } from "~/utils/cordisRepository";
import { MISSION_TYPES } from "~/utils/missionTypes";

type CategoryMode = "risks" | "themes";

const { isOpen, projectId, openProject, closeProject } = useProjectDetailModal();
const { isOpen: isEntityOpen, entityId, openEntity } = useEntityDetailModal();

function onSelectEntityFromProject(id: string) {
  closeProject();
  openEntity(id);
}
const { indexes, ready } = useConnectedCordisIndexes();
const { data: missionProjects } = await useAsyncData("mission-projects", fetchMissionProjects);
const typeByProject = computed(() => new Map((missionProjects.value ?? []).map((m) => [m.cordis_id, m.project_type])));
const colorByType = ref(true);
const selectedTypes = ref<string[]>([]);
const toggleType = (code: string) => {
  selectedTypes.value = selectedTypes.value.includes(code)
    ? selectedTypes.value.filter((c) => c !== code)
    : [...selectedTypes.value, code];
};
const typeItems = computed(() =>
  MISSION_TYPES.map((t) => ({
    ...t,
    count: (missionProjects.value ?? []).filter((m) => m.project_type === t.code).length,
  }))
);

const categoryMode = ref<CategoryMode>("risks");
const activeCategory = ref<string | null>(null);
const pinnedCategory = ref<string | null>(null);

const setCategoryMode = (mode: CategoryMode) => {
  if (categoryMode.value === mode) return;
  categoryMode.value = mode;
  activeCategory.value = null;
  pinnedCategory.value = null;
};

const togglePinnedCategory = (label: string) => {
  pinnedCategory.value = pinnedCategory.value === label ? null : label;
  activeCategory.value = pinnedCategory.value;
};

const riskItems = computed(() =>
  (indexes.value?.riskOptions ?? []).map((risk) => ({
    label: risk.name,
    value: risk.id,
  }))
);

const themeItems = computed(() =>
  (indexes.value?.themeOptions ?? []).map((theme) => ({
    label: theme.name,
    value: theme.id,
  }))
);

const legendItems = computed(() =>
  categoryMode.value === "risks" ? riskItems.value : themeItems.value
);

const legendTitle = computed(() =>
  categoryMode.value === "risks" ? "CLIMATE-RISK CLUSTERS" : "THEME CLUSTERS"
);

const legendHelp = computed(() =>
  categoryMode.value === "risks"
    ? "Soft dashed rings show all risk clusters. Hover a risk below to emphasize its ring and fade non-matching projects; click to pin."
    : "Soft dashed rings show all theme clusters. Hover a theme below to emphasize its ring and fade non-matching projects; click to pin."
);

const fillUmapDimensions = (project: { risksList: string[]; themesList: string[] }, mode: CategoryMode) => {
  const items = mode === "risks" ? riskItems.value : themeItems.value;
  const values = mode === "risks" ? project.risksList : project.themesList;
  return items.map((item) => (values.includes(item.label) ? 1 : 0));
};

const projectItems = computed(() =>
  (indexes.value?.projectsWithSimpleEntities ?? []).map((project) => ({
    id: project.id,
    label: project.title ?? project.id,
    type: typeByProject.value.get(project.id) ?? null,
    value: project.id,
    description: project.acronym ?? undefined,
    startDate: project.start_date ?? undefined,
    endDate: project.end_date ?? undefined,
    totalCost: project.total_cost ?? undefined,
    duration: project.duration ?? undefined,
    risks: project.risksList.length > 0 ? project.risksList : undefined,
    themes: project.themesList.length > 0 ? project.themesList : undefined,
    entities: project.entities.map((e) => e.id),
    entitiesCount: project.entitiesCount,
    umapDimensions: fillUmapDimensions(project, categoryMode.value),
  }))
);

const minDate = computed(() =>
  d3.min(
    (indexes.value?.projectsWithSimpleEntities ?? []).map((project) =>
      project.start_date ? new Date(project.start_date) : new Date()
    )
  )
);

const maxDate = computed(() =>
  d3.max(
    (indexes.value?.projectsWithSimpleEntities ?? []).map((project) =>
      project.end_date ? new Date(project.end_date) : new Date()
    )
  )
);

const yearsRange = computed(() => {
  const years: number[] = [];
  if (minDate.value && maxDate.value) {
    for (let year = minDate.value.getFullYear(); year <= maxDate.value.getFullYear(); year++) {
      years.push(year);
    }
  }
  return years;
});
</script>
