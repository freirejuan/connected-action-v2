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
          :fill-opacity="dim && p.id !== selectedRegion ? 0.35 : 1"
          stroke="#d3ccc6"
          stroke-width="0.4"
          vector-effect="non-scaling-stroke"
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
        <!-- region highlighted from a synchronised map -->
        <path
          v-if="highlightPath"
          :d="highlightPath.d"
          fill="none"
          stroke="#1f1a1c"
          stroke-width="1.6"
          vector-effect="non-scaling-stroke"
          class="pointer-events-none"
        />
        <!-- selected region -->
        <path
          v-if="selectedPath"
          :d="selectedPath.d"
          fill="none"
          stroke="#fdbe0f"
          stroke-width="3"
          vector-effect="non-scaling-stroke"
          class="pointer-events-none"
        />
        <!-- flows from / to the selected region -->
        <g v-if="flowPaths.length" class="pointer-events-none">
          <path
            v-for="f in flowPaths"
            :key="f.key"
            :d="f.d"
            fill="none"
            :stroke="f.color"
            stroke-linecap="round"
            :stroke-opacity="0.55"
            :stroke-width="f.w"
            vector-effect="non-scaling-stroke"
          />
          <circle v-for="f in flowPaths" :key="'e-' + f.key" :cx="f.ex" :cy="f.ey" :r="(1.2 + f.w * 0.6) / zoomK" :fill="f.color" fill-opacity="0.85" />
        </g>
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
  /** flujos desde o hacia la región seleccionada: de una región a otra, con peso */
  flows?: { from: string; to: string; weight: number; color: string }[];
  /** transformación de zoom compartida entre mapas sincronizados */
  transform?: { k: number; x: number; y: number } | null;
  /** región resaltada desde otro mapa sincronizado */
  highlight?: string | null;
  /** sin tooltip propio (los mapas pequeños comparten el resaltado) */
  noTip?: boolean;
  /** atenuar los rellenos (cuando se dibujan flujos encima) */
  dim?: boolean;
}>();

const emit = defineEmits<{
  selectRegion: [id: string];
  zoomed: [t: { k: number; x: number; y: number }];
  hover: [id: string | null];
}>();

const el = ref<HTMLElement | null>(null);
const { width, height } = useElementSize(el);
const paths = ref<{ id: string; name: string; d: string; c: [number, number] }[]>([]);
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
  paths.value = props.features.map((f) => ({ id: f.properties.NUTS_ID, name: f.properties.NUTS_NAME, d: path(f) ?? "", c: path.centroid(f) }));
}

watch([width, height, () => props.features], rebuild, { immediate: true });

const pathById = computed(() => new Map(paths.value.map((p) => [p.id, p])));
const hatchedPaths = computed(() => (props.hatched?.size ? paths.value.filter((p) => props.hatched!.has(p.id)) : []));
const signatoryPaths = computed(() => paths.value.filter((p) => props.signatories.has(p.id)));
const selectedPath = computed(() => (props.selectedRegion ? pathById.value.get(props.selectedRegion) : null));
const highlightPath = computed(() => (props.highlight ? pathById.value.get(props.highlight) : null));
// arcos: curva cuadrática con el punto de control desplazado a un lado; grosor por peso (1–6 px)
const flowPaths = computed(() => {
  const fl = props.flows ?? [];
  if (!fl.length) return [];
  const max = Math.max(...fl.map((f) => f.weight));
  const out: { key: string; d: string; w: number; ex: number; ey: number; color: string }[] = [];
  for (const f of fl) {
    const a = pathById.value.get(f.from)?.c;
    const b = pathById.value.get(f.to)?.c;
    if (!a || !b || !isFinite(a[0]) || !isFinite(b[0])) continue;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const cx = mx - dy * 0.18, cy = my + dx * 0.18;
    // el punto marca el otro extremo (no la región seleccionada): destino de los flujos de salida, origen de los de entrada
    const far = f.to === props.selectedRegion ? a : b;
    out.push({ key: f.from + ">" + f.to + f.color, d: `M${a[0]},${a[1]} Q${cx},${cy} ${b[0]},${b[1]}`, w: 1 + 5 * Math.sqrt(f.weight / max), ex: far[0], ey: far[1], color: f.color });
  }
  return out.sort((x, y) => x.w - y.w);
});

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
      if (event.sourceEvent) emit("zoomed", { k: event.transform.k, x: event.transform.x, y: event.transform.y });
    });
  d3.select(svg).call(zoomBehavior);
});
// aplica la transformación de otro mapa sincronizado (sin reemitirla: no hay sourceEvent)
let pending: number | null = null;
watch(
  () => props.transform,
  (t) => {
    const svg = el.value?.querySelector("svg");
    if (!t || !svg || !zoomBehavior) return;
    const cur = d3.zoomTransform(svg);
    if (Math.abs(cur.k - t.k) < 1e-6 && Math.abs(cur.x - t.x) < 0.5 && Math.abs(cur.y - t.y) < 0.5) return; // el propio mapa
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      pending = null;
      d3.select(svg).call(zoomBehavior!.transform, d3.zoomIdentity.translate(t.x, t.y).scale(t.k));
    });
  }
);

const tip = ref({ visible: false, x: 0, y: 0, title: "", id: "", lines: [] as string[] });
function onEnter(e: MouseEvent, id: string) {
  emit("hover", id);
  if (props.noTip) return;
  const p = pathById.value.get(id);
  tip.value = { visible: true, x: e.clientX + 12, y: e.clientY + 12, title: p?.name ?? id, id, lines: props.describe(id) };
}
function onMove(e: MouseEvent) {
  tip.value.x = e.clientX + 12;
  tip.value.y = e.clientY + 12;
}
function onLeave() {
  tip.value.visible = false;
  emit("hover", null);
}
</script>
