<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CaCard title="Indicators from Appendix 5">
            <template #help>
              <CaHelp title="Barometer-style indicators">
                Computed from the cleaned Appendix 5 for all Mission projects, with MIP4Adapt as its own type (MIP), in the way the Mission
                Barometer reports them. They do not follow the map filters.
              </CaHelp>
            </template>
            <div class="grid grid-cols-3 border border-neutral-darkest text-center">
              <div class="p-2"><span class="block font-display text-2xl font-bold">{{ indicators.median }}</span><span class="font-mono text-[10px] text-neutral-dark">MEDIAN AUTHORITIES PER PROJECT</span></div>
              <div class="border-l border-neutral-darkest p-2"><span class="block font-display text-2xl font-bold">{{ indicators.multi }}</span><span class="font-mono text-[10px] text-neutral-dark">AUTHORITIES IN 2+ PROJECTS</span></div>
              <div class="border-l border-neutral-darkest p-2"><span class="block font-display text-2xl font-bold">{{ indicators.signatoryShare }}%</span><span class="font-mono text-[10px] text-neutral-dark">AUTHORITIES THAT ARE SIGNATORIES</span></div>
            </div>
            <h4 class="mb-1 mt-4 font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">BY PROJECT TYPE</h4>
            <table class="w-full text-left text-[12px]">
              <thead class="font-mono text-[10px] text-neutral-dark">
                <tr><th class="py-1 font-normal">TYPE</th><th class="font-normal">PROJECTS</th><th class="font-normal">AUTHORITIES</th><th class="font-normal">SIGNATORIES</th><th class="font-normal">PER PROJECT</th></tr>
              </thead>
              <tbody>
                <tr v-for="t in indicators.byType" :key="t.code" class="border-t border-neutral-lighter">
                  <td class="py-1"><span class="inline-flex items-center gap-1.5 font-mono text-[11px]"><span class="h-2 w-2" :style="{ background: missionTypeColor(t.code) }" />{{ t.code }}</span></td>
                  <td>{{ t.projects }}</td><td>{{ t.authorities }}</td><td>{{ t.signatories }}</td><td>{{ t.perProject }}</td>
                </tr>
              </tbody>
            </table>
            <h4 class="mb-1 mt-4 font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">BY ROLE OF THE TERRITORY</h4>
            <table class="w-full text-left text-[12px]">
              <thead class="font-mono text-[10px] text-neutral-dark">
                <tr><th class="py-1 font-normal">ROLE</th><th class="font-normal">PROJECT–AUTHORITY LINKS</th><th class="font-normal">OF WHICH SIGNATORIES</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in indicators.byRole" :key="r.role" class="border-t border-neutral-lighter">
                  <td class="py-1 font-mono text-[11px]">{{ r.role }}</td><td>{{ r.links }}</td><td>{{ r.signatories }} ({{ r.share }}%)</td>
                </tr>
              </tbody>
            </table>
            <h4 class="mb-1 mt-4 font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">AUTHORITIES IN MOST PROJECTS</h4>
            <ul>
              <li v-for="a in indicators.topAuthorities" :key="a.id" class="flex gap-2 border-t border-neutral-lighter py-1 text-[12px]">
                <span class="w-8 shrink-0 font-mono text-[10px] text-neutral-dark">{{ a.country }}</span>
                <span class="flex-1">{{ a.name }}<span v-if="a.signatory" class="ml-1.5 border border-neutral-darkest px-1 font-mono text-[9px] font-bold">SIGNATORY</span></span>
                <span class="font-mono text-[11px]">{{ a.n }} projects</span>
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

<script setup lang="ts">
// Indicadores al estilo del Barómetro y territorios fuera del mapa (anexo 5). No siguen los filtros de la vista.
import { MISSION_TYPES, missionTypeColor } from "~/utils/missionTypes";

const { payload, missionById, unmappedTerritories, MIP4ADAPT } = useMissionTerritories();
const projectName = (id: string) => (id === MIP4ADAPT ? "MIP4Adapt" : missionById.value.get(id)?.mission_name ?? id);

const indicators = computed(() => {
  const links = payload.value?.links ?? [];
  const typeOf = (id: string) => (id === MIP4ADAPT ? "MIP" : missionById.value.get(id)?.project_type);
  const terrById = new Map((payload.value?.territories ?? []).map((t) => [t.id, t]));
  const byProject = new Map<string, Set<string>>();
  const projectsByTerr = new Map<string, Set<string>>();
  for (const l of links) {
    if (!byProject.has(l.project_id)) byProject.set(l.project_id, new Set());
    byProject.get(l.project_id)!.add(l.territory_id);
    if (!projectsByTerr.has(l.territory_id)) projectsByTerr.set(l.territory_id, new Set());
    projectsByTerr.get(l.territory_id)!.add(l.project_id);
  }
  const sizes = [...byProject.values()].map((s) => s.size).sort((a, b) => a - b);
  const median = sizes.length ? (sizes.length % 2 ? sizes[(sizes.length - 1) / 2]! : (sizes[sizes.length / 2 - 1]! + sizes[sizes.length / 2]!) / 2) : 0;
  const terrIds = [...projectsByTerr.keys()];
  const sig = terrIds.filter((id) => terrById.get(id)?.is_signatory).length;
  const byType = MISSION_TYPES.map((t) => {
    const ps = [...byProject.keys()].filter((id) => typeOf(id) === t.code);
    const auth = new Set(ps.flatMap((id) => [...byProject.get(id)!]));
    const sigs = [...auth].filter((id) => terrById.get(id)?.is_signatory).length;
    return { code: t.code, projects: ps.length, authorities: auth.size, signatories: sigs, perProject: ps.length ? Math.round(ps.reduce((n, id) => n + byProject.get(id)!.size, 0) / ps.length) : 0 };
  });
  const roleKey = (r: string | null) => r ?? "No role given";
  const pairs = new Map<string, { role: string; sig: boolean }>();
  for (const l of links) pairs.set(`${l.project_id}|${l.territory_id}`, { role: roleKey(l.role), sig: !!terrById.get(l.territory_id)?.is_signatory });
  const byRole = ["Demonstrator", "Replicator", "No role given"].map((role) => {
    const xs = [...pairs.values()].filter((x) => x.role === role);
    const s = xs.filter((x) => x.sig).length;
    return { role, links: xs.length, signatories: s, share: xs.length ? Math.round((100 * s) / xs.length) : 0 };
  });
  const topAuthorities = terrIds
    .map((id) => ({ id, n: projectsByTerr.get(id)!.size, name: terrById.get(id)?.name ?? id, country: terrById.get(id)?.country ?? "", signatory: !!terrById.get(id)?.is_signatory }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
    .slice(0, 8);
  return {
    median,
    multi: terrIds.filter((id) => projectsByTerr.get(id)!.size >= 2).length,
    signatoryShare: terrIds.length ? Math.round((100 * sig) / terrIds.length) : 0,
    byType,
    byRole,
    topAuthorities,
  };
});

</script>
