// Tipología de proyectos de la Misión de Adaptación (Barómetro de MIP4Adapt, apéndice 4)
import type { MissionProjectType } from "~/types/mission";

export const MISSION_TYPES: { code: MissionProjectType; short: string; long: string; color: string; cordis: boolean }[] = [
  { code: "RIA", short: "Research", long: "Research and Innovation Action: new knowledge and methods", color: "#249489", cordis: true },
  { code: "IA", short: "Demonstration", long: "Innovation Action: solutions tested and demonstrated in regions", color: "#0f4fc4", cordis: true },
  { code: "Cascade", short: "Technical support", long: "Technical and financial support to regions through cascade funding", color: "#fc4b08", cordis: true },
  { code: "CSA", short: "Coordination", long: "Coordination and Support Action", color: "#86592b", cordis: true },
  // MIP4Adapt: categoría propia con un solo proyecto; contrato de servicios, no proyecto Horizon (no está en CORDIS)
  {
    code: "MIP",
    short: "Mission support",
    long: "Mission Implementation Platform (MIP4Adapt): the official support mechanism of the EU Mission on Adaptation to Climate Change. A service contract, not a Horizon project, so it is not in CORDIS",
    color: "#5f7f1a",
    cordis: false,
  },
];

/** tipos con datos en CORDIS (vistas de socios, temas y riesgos) */
export const CORDIS_TYPES = MISSION_TYPES.filter((t) => t.cordis);
/** el proyecto único de la categoría MIP */
export const MIP4ADAPT_ID = "MIP4Adapt";

const byCode = new Map(MISSION_TYPES.map((t) => [t.code, t]));

export function missionTypeLabel(code: string | null | undefined) {
  const t = code ? byCode.get(code as MissionProjectType) : undefined;
  return t ? `${t.code} · ${t.short}` : "—";
}

export function missionTypeColor(code: string | null | undefined) {
  const t = code ? byCode.get(code as MissionProjectType) : undefined;
  return t?.color ?? "#9f999c";
}

export function missionTypeInfo(code: string | null | undefined) {
  return code ? byCode.get(code as MissionProjectType) ?? null : null;
}
