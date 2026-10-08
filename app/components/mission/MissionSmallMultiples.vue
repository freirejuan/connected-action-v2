<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div v-for="m in maps" :key="m.id" class="flex flex-col border border-neutral-darkest">
      <header class="flex items-baseline gap-2 border-b border-neutral-darkest px-3 py-2">
        <span class="font-mono text-[11px] font-bold tracking-[0.08em]">{{ m.title }}</span>
        <span class="ml-auto font-mono text-[10px] text-neutral-dark">{{ m.count }} {{ unit }}</span>
      </header>
      <div class="relative h-[440px]">
        <MissionTerritoryMap
          :features="features"
          :fills="m.fills"
          :signatories="empty"
          :selected-region="selected"
          :describe="() => []"
          :transform="transform"
          :highlight="hovered"
          no-tip
          @select-region="(id) => emit('select', id)"
          @zoomed="(t) => (transform = t)"
          @hover="(id) => (hovered = id)"
        />
      </div>
      <footer class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-neutral-darkest px-3 py-2">
        <span v-for="(b, i) in m.buckets" :key="b" class="flex items-center gap-1 font-mono text-[10px] text-neutral-darkest">
          <span class="h-2.5 w-4 border border-neutral-light" :style="{ background: m.ramp[i] }" />{{ b }}
        </span>
        <span class="ml-auto font-mono text-[10px] text-neutral-dark">{{ m.measure }}</span>
      </footer>
    </div>
    <p class="font-sans text-[12px] leading-snug text-neutral-dark lg:col-span-3">
      <template v-if="hovered && hoverInfo">
        <strong class="font-semibold text-neutral-darkest">{{ hoverInfo.name }}</strong> ({{ hovered }}):
        {{ hoverInfo.projects }} project{{ hoverInfo.projects === 1 ? "" : "s" }} with a local authority ·
        {{ hoverInfo.partners }} local partner{{ hoverInfo.partners === 1 ? "" : "s" }} ·
        {{ hoverInfo.signatories }} signator{{ hoverInfo.signatories === 1 ? "y" : "ies" }}.
      </template>
      <template v-else>
        The three maps share zoom, pan and hover: move over one to see the same area in the others; click to open its profile above.
      </template>
    </p>
  </div>
</template>

<script setup lang="ts">
// Vista D: tres capas lado a lado (proyectos con autoridad local / socios locales / firmantes), sincronizadas.
type NutsFeature = GeoJSON.Feature<GeoJSON.Geometry, { NUTS_ID: string; NUTS_NAME: string }>;
type Profile = { projects: Set<string>; partners: Set<string>; signatories: Set<string> };

const props = defineProps<{
  features: NutsFeature[];
  profiles: Map<string, Profile>;
  selected: string | null;
  unit: string;
  names: Map<string, string>;
}>();
const emit = defineEmits<{ select: [id: string] }>();

const empty = new Set<string>();
const transform = ref<{ k: number; x: number; y: number } | null>(null);
const hovered = ref<string | null>(null);

// rampas: violeta = dónde actúan los proyectos; tinta = socios (como en el resto del Lab); rosa = firmantes
const RAMPS = {
  projects: ["#e6dcf5", "#cab1e8", "#a67ad6", "#7945ab"],
  partners: ["#d9cece", "#aca2a1", "#7e7574", "#534b4a"],
  signatories: ["#f3dbe2", "#e2aabb", "#c97790", "#a34a68"],
};
const b1 = (n: number) => (n >= 5 ? 3 : n >= 3 ? 2 : n === 2 ? 1 : 0);
const b2 = (n: number) => (n >= 10 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0);

const maps = computed(() => {
  const layer = (id: "projects" | "partners" | "signatories", title: string, measure: string, bucket: (n: number) => number, buckets: string[]) => {
    const fills = new Map<string, string>();
    let count = 0;
    for (const [rid, p] of props.profiles) {
      const n = p[id].size;
      if (!n) continue;
      count++;
      fills.set(rid, RAMPS[id][bucket(n)]!);
    }
    return { id, title, measure, fills, count, ramp: RAMPS[id], buckets };
  };
  return [
    layer("projects", "PROJECTS WITH A LOCAL AUTHORITY", "projects", b1, ["1", "2", "3–4", "5+"]),
    layer("partners", "LOCAL PARTNERS (CORDIS)", "partner entities", b2, ["1", "2–3", "4–9", "10+"]),
    layer("signatories", "CHARTER SIGNATORIES", "signatory entities", b1, ["1", "2", "3–4", "5+"]),
  ];
});

const hoverInfo = computed(() => {
  if (!hovered.value) return null;
  const p = props.profiles.get(hovered.value);
  return {
    name: props.names.get(hovered.value) ?? hovered.value,
    projects: p?.projects.size ?? 0,
    partners: p?.partners.size ?? 0,
    signatories: p?.signatories.size ?? 0,
  };
});
</script>
