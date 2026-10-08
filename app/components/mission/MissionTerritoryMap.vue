<template>
  <div ref="el" class="relative h-full w-full bg-neutral-lightest">
    <svg :width="width" :height="height" class="block">
      <defs>
        <!-- rayado = sedes de socios (se superpone al relleno, que indica dónde actúan) -->
        <pattern
          id="ca-seat-hatch"
          patternUnits="userSpaceOnUse"
          width="5"
          height="5"
          :patternTransform="`rotate(45) scale(${1 / zoomK})`"
        >
          <line x1="0" y1="0" x2="0" y2="5" :stroke="HATCH" stroke-width="1.6" />
        </pattern>
      </defs>
      <g :transform="zoomTransform">
        <!-- base + fill -->
        <path
          v-for="p in paths"
          :key="p.id"
          :d="p.d"
          :fill="fillFor(p.id)"
          stroke="#d3ccc6"
          :stroke-width="0.4 / zoomK"
          class="cursor-pointer"
          @mouseenter="(e) => onEnter(e, p.id)"
          @mousemove="onMove"
          @mouseleave="onLeave"
          @click="emit('selectRegion', p.id)"
        />
        <!-- partner seats as stripes -->
        <path
          v-for="p in hatchedPaths"
          :key="'h-' + p.id"
          :d="p.d"
          fill="url(#ca-seat-hatch)"
          class="pointer-events-none"
        />
        <!-- Charter signatories (EEA) -->
        <path
          v-for="p in signatoryPaths"
          :key="'sig-' + p.id"
          :d="p.d"
          fill="none"
          stroke="#403339"
          stroke-opacity="0.7"
          :stroke-width="0.7 / zoomK"
          :stroke-dasharray="`${2.2 / zoomK} ${1.6 / zoomK}`"
          class="pointer-events-none"
        />
        <!-- selected region -->
        <path
          v-if="selectedPath"
          :d="selectedPath.d"
          fill="none"
          stroke="#fdbe0f"
          :stroke-width="3 / zoomK"
          class="pointer-events-none"
        />
      </g>
    </svg>

    <div
      v-if="tip.visible"
      class="pointer-events-none fixed z-50 max-w-[300px] border border-neutral-darkest bg-neutral-lightest p-2 shadow-lg"
      :style="{ left: tip.x + 'px', top: tip.y + 'px' }"
    >
      <div class="font-mono text-xs font-bold uppercase tracking-[0.06em]">{{ tip.title }}</div>
      <div class="font-mono text-2xs text-neutral-dark">{{ tip.id }}</div>
      <div v-for="line in tip.lines" :key="line" class="mt-1 text-xs">{{ line }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as d3 from "d3";
import { useElementSize } from "@vueuse/core";
import europeMap from "~/assets/data/europe.json";

type NutsFeature = GeoJSON.Feature<GeoJSON.Geometry, { NUTS_ID: string; NUTS_NAME: string }>;

const props = defineProps<{
  features: NutsFeature[];
  /** color por NUTS-3; las que no estén se pintan de fondo */
  fills: Map<string, string>;
  /** NUTS-3 a contornear como firmantes */
  signatories: Set<string>;
  /** NUTS-3 rayadas (sedes de socios en los modos de contraste) */
  hatched?: Set<string>;
  selectedRegion?: string | null;
  /** líneas del tooltip por región */
  describe: (nutsId: string) => string[];
}>();

const emit = defineEmits<{ selectRegion: [id: string] }>();

const el = ref<HTMLElement | null>(null);
const { width, height } = useElementSize(el);
const paths = ref<{ id: string; name: string; d: string }[]>([]);
const zoomK = ref(1);
const zoomTransform = ref("");

const BASE = "#f6f3ef";
const HATCH = "#362a2f";
const fillFor = (id: string) => props.fills.get(id) ?? BASE;

function rebuild() {
  if (!width.value || !height.value || !props.features.length) return;
  const pad = 16;
  const projection = d3.geoConicEquidistant().fitExtent(
    [
      [pad, pad],
      [width.value - pad, height.value - pad],
    ],
    europeMap as GeoJSON.GeoJsonObject
  );
  const path = d3.geoPath().projection(projection);
  paths.value = props.features.map((f) => ({ id: f.properties.NUTS_ID, name: f.properties.NUTS_NAME, d: path(f) ?? "" }));
}

watch([width, height, () => props.features], rebuild, { immediate: true });

const pathById = computed(() => new Map(paths.value.map((p) => [p.id, p])));
const hatchedPaths = computed(() => (props.hatched?.size ? paths.value.filter((p) => props.hatched!.has(p.id)) : []));
const signatoryPaths = computed(() => paths.value.filter((p) => props.signatories.has(p.id)));
const selectedPath = computed(() => (props.selectedRegion ? pathById.value.get(props.selectedRegion) : null));

// zoom con rueda + Ctrl/Cmd, arrastre libre
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
onMounted(() => {
  const svg = el.value?.querySelector("svg");
  if (!svg) return;
  zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, 12])
    .filter((event: any) => (event.type === "wheel" ? event.ctrlKey || event.metaKey : !event.button))
    .on("zoom", (event) => {
      zoomK.value = event.transform.k;
      zoomTransform.value = event.transform.toString();
    });
  d3.select(svg).call(zoomBehavior);
});

const tip = ref({ visible: false, x: 0, y: 0, title: "", id: "", lines: [] as string[] });
function onEnter(e: MouseEvent, id: string) {
  const p = pathById.value.get(id);
  tip.value = { visible: true, x: e.clientX + 12, y: e.clientY + 12, title: p?.name ?? id, id, lines: props.describe(id) };
}
function onMove(e: MouseEvent) {
  tip.value.x = e.clientX + 12;
  tip.value.y = e.clientY + 12;
}
function onLeave() {
  tip.value.visible = false;
}
</script>
