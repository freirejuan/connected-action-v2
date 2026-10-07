// Tipología de proyectos de la Misión de Adaptación (Barómetro de MIP4Adapt, apéndice 4)
import type { MissionProjectType } from "~/types/mission";

export const MISSION_TYPES: { code: MissionProjectType; short: string; long: string; color: string }[] = [
  { code: "RIA", short: "Research", long: "Research and Innovation Action: new knowledge and methods", color: "#249489" },
  { code: "IA", short: "Demonstration", long: "Innovation Action: solutions tested and demonstrated in regions", color: "#0f4fc4" },
  { code: "Cascade", short: "Technical support", long: "Technical and financial support to regions through cascade funding", color: "#fc4b08" },
  { code: "CSA", short: "Coordination", long: "Coordination and Support Action", color: "#86592b" },
];

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
