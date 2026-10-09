<template>
  <div class="bg-neutral-lightest">
    <CaPageHeader
      n="05"
      kicker="TERRITORIES"
      title="Territories"
      intro="Pick a place and see what the Mission is doing there: which regions and local authorities have signed the Charter, which work with Mission projects as demonstrators, replicators or research partners, which receive technical assistance, and which local organisations are partners in Mission projects."
      help-title="Reading this page"
      help="Places are mapped on NUTS 3 areas (NUTS 2 for regional authorities). An engaged RLA is a region or local authority working with a Mission project or MIP4Adapt: listed in the Mission Barometer (Appendix 5) or a partner in a Mission project (CORDIS). The map places each authority on its own area; a project that works with a regional or national authority appears in the profile of every area it covers as working there through that authority, and does not colour the map, because Appendix 5 does not say in which areas the work is done. Example, Østjylland (DK042): Aarhus City works with BLOSSOM and URBREATH; NBRACER, Precilience, RESIST and TRANSFORM work with Central Denmark Region (DK04), which covers five NUTS 3 areas."
    />

    <div class="mx-auto w-full max-w-[1920px] px-7 py-7 pb-24">
      <div v-if="!ready" class="h-[70vh]"><USkeleton class="h-full w-full" /></div>

      <template v-else>
        <!-- headline figures (Mission vocabulary); follow the project-type filter and the selected area -->
        <div v-if="profile" class="mb-2 flex items-center gap-3 font-mono text-[11px] text-neutral-dark">
          <span>INDICATORS FOR <strong class="text-neutral-darkest">{{ profile.name.toUpperCase() }}</strong> ({{ profile.id }}) — a different set from the whole map</span>
          <button type="button" class="font-bold tracking-[0.1em] text-community-pink-dark" @click="selected = null">SHOW ALL</button>
        </div>
        <div class="stats mb-6 grid w-full grid-cols-2 border-l border-t border-neutral-darkest bg-neutral-lightest md:grid-cols-3 2xl:grid-cols-6">
          <div v-for="s in statCells" :key="s.label" class="border-b border-r border-neutral-darkest px-5 py-4">
            <span class="block font-display text-4xl font-bold text-neutral-darkest">{{ s.value.toLocaleString("en-US") }}</span>
            <span class="block font-mono text-2xs font-semibold tracking-[0.16em] text-neutral-darkest">{{ s.label }}</span>
            <span class="mt-0.5 block font-sans text-[11px] leading-snug text-neutral-dark">{{ s.sub }}</span>
          </div>
        </div>

        <p class="-mt-3 mb-6 max-w-[1100px] font-sans text-[12px] leading-snug text-neutral-dark">
          <strong class="font-semibold text-neutral-darkest">About the data.</strong>
          This prototype has been developed by inViable using three public sources: the list of Charter signatories, the Mission
          Barometer's database of regions and local authorities supported by Mission projects and MIP4Adapt (Appendix 5, data as of
          March 2026), and project partners from CORDIS. Organisations are matched by country, place and name; doubtful matches were
          reviewed one by one. The Barometer database covers 63 of the 65 Mission projects, since National Adaptation Hubs and
          REGILIENCE-plus work at national or European scale. MIP4Adapt appears as its own type (MIP). While cross-checking the sources
          we found some inconsistencies, mainly in territorial codes, so a few figures may shift slightly once these are corrected.
          The figures above follow the project-type filter and do not add up. With an area selected they switch to a set of indicators for that area.
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
              :flows="mapFlows"
              :dim="mapFlows.length > 0"
              :inset-right="legendOpen ? 240 : 0"
              @select-region="selectRegion"
            />
            <!-- C · flows from the selected territory -->
            <div v-if="selected && flowData" class="absolute left-3 top-3 z-10 max-w-[360px] border border-neutral-darkest bg-neutral-lightest p-3">
              <div class="mb-2 flex items-center gap-2">
                <span class="font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">FLOWS</span>
                <div class="ml-auto flex border border-neutral-darkest">
                  <button
                    v-for="(f, i) in flowModes"
                    :key="f.id"
                    type="button"
                    class="px-2 py-1 font-mono text-[10px] font-bold tracking-[0.06em] transition-colors"
                    :class="[i ? 'border-l border-neutral-darkest' : '', flowMode === f.id ? 'bg-neutral-darkest text-neutral-lightest' : 'text-neutral-dark hover:bg-neutral-lighter']"
                    @click="flowMode = f.id"
                  >
                    {{ f.label }}
                  </button>
                </div>
              </div>
              <p v-if="flowMode !== 'none'" class="flex items-start gap-2 text-[11px] leading-snug text-neutral-darkest" :class="flowMode === 'in' ? 'opacity-40' : ''">
                <span class="mt-1 h-0.5 w-5 shrink-0" :style="{ background: FLOW_OUT }" />
                <span><strong>Out.</strong> Partners from here take part in {{ flowData.summary.outProjects }} project{{ flowData.summary.outProjects === 1 ? "" : "s" }} with a local authority in {{ flowData.summary.outAreas }} other area{{ flowData.summary.outAreas === 1 ? "" : "s" }} ({{ flowData.summary.outCountries }} countr{{ flowData.summary.outCountries === 1 ? "y" : "ies" }}).</span>
              </p>
              <p v-if="flowMode !== 'none'" class="mt-1 flex items-start gap-2 text-[11px] leading-snug text-neutral-darkest" :class="flowMode === 'out' ? 'opacity-40' : ''">
                <span class="mt-1 h-0.5 w-5 shrink-0" :style="{ background: FLOW_IN }" />
                <span><strong>In.</strong> The {{ flowData.summary.inProjects }} project{{ flowData.summary.inProjects === 1 ? "" : "s" }} with a local authority here have partners based in {{ flowData.summary.inAreas }} other area{{ flowData.summary.inAreas === 1 ? "" : "s" }} ({{ flowData.summary.inCountries }} countr{{ flowData.summary.inCountries === 1 ? "y" : "ies" }}).</span>
              </p>
              <p v-if="flowMode !== 'none'" class="mt-1.5 border-t border-neutral-lighter pt-1 text-[10px] leading-snug text-neutral-dark">Line width: number of entity–project links. Only areas where projects have a local authority.</p>
            </div>
            <div v-if="legendOpen" class="absolute right-3 top-3 z-10 w-[270px] border border-neutral-darkest bg-neutral-lightest/95 p-3">
              <div class="mb-2 flex items-start gap-2">
                <span class="font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">WHERE THE MISSION IS ACTIVE</span>
                <button type="button" class="ml-auto font-mono text-[10px] font-bold tracking-[0.08em] text-neutral-dark hover:text-neutral-darkest" aria-label="Hide legend" @click="legendOpen = false">HIDE</button>
              </div>
              <div class="flex flex-col gap-1">
                <span v-for="c in legendItems" :key="c.id" class="flex items-start gap-2">
                  <span class="mt-0.5 h-3 w-5 shrink-0 border border-neutral-light" :style="c.style" />
                  <span class="font-mono text-[11px] leading-snug text-neutral-darkest">{{ c.label }}</span>
                  <span class="ml-auto pl-2 font-mono text-[11px] text-neutral-dark">{{ c.n }}</span>
                </span>
              </div>
              <p class="mt-2 border-t border-neutral-lighter pt-1.5 font-sans text-[11px] leading-snug text-neutral-dark">
                <em>Engaged RLA</em>: a region or local authority working with a Mission project or MIP4Adapt. <em>Project partners</em>:
                organisations based in the area that take part in Mission projects (CORDIS). Areas are {{ level === 3 ? "NUTS 3" : "NUTS 2" }}
                regions. Colours do not show project type.
              </p>
            </div>
            <button
              v-else
              type="button"
              class="absolute right-3 top-3 z-10 border border-neutral-darkest bg-neutral-lightest px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.12em] text-neutral-darkest hover:bg-neutral-lighter"
              @click="legendOpen = true"
            >
              SHOW LEGEND
            </button>
            <span class="absolute bottom-3 left-3 z-10 max-w-[60%] bg-neutral-lightest/90 px-1.5 py-0.5 font-sans text-[12px] text-neutral-darkest">
              Mission activity in {{ (T.stats.value.both + T.stats.value.projects + T.stats.value.partners).toLocaleString("en-US") }} areas:
              {{ (T.stats.value.both + T.stats.value.projects).toLocaleString("en-US") }} with an engaged RLA,
              {{ T.stats.value.partners.toLocaleString("en-US") }} with project partners only.
            </span>
            <span class="absolute bottom-3 right-3 z-10 font-mono text-2xs text-neutral-dark">Ctrl/⌘ + scroll to zoom · drag to pan</span>
          </div>

          <!-- territory profile -->
          <aside class="flex max-h-[78vh] min-h-[640px] flex-col overflow-y-auto border border-neutral-darkest bg-neutral-lightest">
            <div v-if="!profile" class="p-5">
              <span class="mb-2 block font-mono text-2xs font-bold tracking-[0.16em] text-neutral-dark">TERRITORY PROFILE</span>
              <p class="font-sans text-[13px] leading-snug text-neutral-dark">
                Click an area on the map, or search for a place, to see what the Mission is doing there: which Mission projects work
                with its regions and local authorities, which of them are Charter Signatories, and which local organisations take part
                in Mission projects, here or elsewhere.
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
                <h3 class="mb-2 font-mono text-2xs font-bold tracking-[0.16em] text-neutral-darkest">1 · MISSION PROJECTS WORKING WITH RLAs HERE · {{ profile.projectsHere.length }}</h3>
                <p v-if="!profile.projectsHere.length" class="text-[12px] text-neutral-dark">No Mission project lists a local authority of this area in Appendix 5.</p>
                <ul>
                  <li v-for="p in profile.projectsHere" :key="p.project" class="border-b border-neutral-lighter py-1.5">
                    <button type="button" class="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold hover:underline" @click="openMission(p.project)">
                      <span class="h-2 w-2 shrink-0" :style="{ background: missionTypeColor(T.projectType(p.project)) }" />
                      {{ projectName(p.project) }}
                      <span class="font-normal text-neutral-dark">{{ T.projectType(p.project) }}</span>
                    </button>
                    <span v-for="l in p.links" :key="l.territory_id" class="block pl-3.5 text-[12px] leading-snug text-neutral-darkest">
                      {{ territoryLabel(l.territory_id) }}
                      <span class="font-mono text-[10px] text-neutral-dark">· {{ roleLabel(l.role) }}</span>
                    </span>
                  </li>
                </ul>
                <template v-if="profile.projectsAbove.length">
                  <h4 class="mb-1 mt-3 font-mono text-[10px] font-bold tracking-[0.14em] text-neutral-dark">THROUGH A REGIONAL OR NATIONAL AUTHORITY · {{ profile.projectsAbove.length }}</h4>
                  <p class="mb-1 text-[11px] leading-snug text-neutral-dark">Projects that list a regional or national authority covering this area; Appendix 5 does not say in which of its areas they work.</p>
                  <ul>
                    <li v-for="p in profile.projectsAbove" :key="p.project" class="py-0.5 text-[12px] leading-snug">
                      <button type="button" class="font-mono text-[11px] font-bold hover:underline" @click="openMission(p.project)">{{ projectName(p.project) }}</button>
                      <span class="text-neutral-dark"> · {{ p.links.map((l) => `${territoryLabel(l.territory_id)} · ${roleLabel(l.role)}`).join("; ") }}</span>
                    </li>
                  </ul>
                </template>
              </section>

              <!-- 2 signatories -->
              <section class="border-b border-neutral-darkest p-4">
                <h3 class="mb-2 font-mono text-2xs font-bold tracking-[0.16em] text-neutral-darkest">2 · CHARTER SIGNATORIES BASED HERE · {{ profile.signatoriesHere.length }}</h3>
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
                  <h4 class="mb-1 mt-3 font-mono text-[10px] font-bold tracking-[0.14em] text-neutral-dark">REGIONAL OR NATIONAL SIGNATORIES COVERING THIS AREA · {{ profile.signatoriesAbove.length }}</h4>
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
                <h3 class="mb-2 font-mono text-2xs font-bold tracking-[0.16em] text-neutral-darkest">3 · LOCAL ORGANISATIONS IN MISSION PROJECTS</h3>
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
                  {{ partTab === "here" ? "In projects with a local authority in this area or working here through its regional authority: as partner (CORDIS) or as demonstration / replication territory (Appendix 5)." : "As partners (CORDIS) in projects that act in other territories; country codes show where." }}
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

        <!-- D · small multiples -->
        <CaCard class="mt-6" title="The three layers side by side" body-class="p-4">
          <template #help>
            <CaHelp title="Small multiples" :w="320">
              The same {{ level === 3 ? "NUTS-3 areas" : "NUTS-2 regions" }} and filters as the map above, one layer per map: engaged RLAs (regions and local
              authorities working with Mission projects or MIP4Adapt), project partners (CORDIS) and Charter Signatories. Zoom, pan and hover are shared.
            </CaHelp>
          </template>
          <MissionSmallMultiples
            :features="features"
            :profiles="T.profiles.value"
            :selected="selected"
            :unit="level === 3 ? 'NUTS-3' : 'NUTS-2'"
            :names="T.regionName.value"
            @select="selectRegion"
          />
        </CaCard>

        <!-- entities table -->
        <CaCard class="mt-6" :title="profile ? `Entities of ${profile.name}` : 'All entities'" body-class="p-0">
          <template #help>
            <CaHelp title="Entities and their roles" :w="320">
              One row per entity, after joining Appendix 5 authorities, EEA Charter signatories and CORDIS partners. "Signs" =
              Charter signatory. "Partner" = Mission projects where it is a CORDIS partner, split by whether the project acts in the
              entity's own area, through a local or regional authority (here), or elsewhere. "Demonstrator" / "Replicator" = projects where it is a territory in Appendix 5.
            </CaHelp>
          </template>
          <template #right>
            <label v-if="profile" class="flex cursor-pointer items-center gap-2 font-mono text-2xs text-neutral-dark">
              <input v-model="tableAbove" type="checkbox" class="accent-neutral-darkest" />
              INCLUDE REGIONAL AND NATIONAL AUTHORITIES COVERING THIS AREA
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
                    <span v-if="r.above" class="ml-1 font-mono text-[9px] text-neutral-dark">REGIONAL / NATIONAL</span>
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
  natureGroupOf,
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

const T = useTerritoryProfiles({ level, types, role, natures });
const ready = T.ready;
const features = T.features;
const missionById = T.missionById;
const territoryById = T.territoryById;
const { projectName, takesPart, regionProfile, actorRow, territoryLabel } = T;

// --- mapa ---
const CLS: Record<ProfileClass, { color: string; short: string; label: string; style: Record<string, string> }> = {
  both: { color: "#7945ab", short: "engaged RLA + project partners", label: "Engaged RLA + project partners", style: { background: "#7945ab" } },
  projects: { color: "#cab1e8", short: "engaged RLA only", label: "Engaged RLA only", style: { background: "#cab1e8" } },
  partners: { color: "#9a908e", short: "project partners only", label: "Project partners only", style: { background: "#9a908e" } },
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
    { id: "sig", label: "Charter Signatory based here", style: { border: "1.5px dashed #403339", background: "#f6f3ef" }, n: s.withSignatories },
  ];
});
const selected = ref<string | null>(null);
const legendOpen = ref(true);
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
    `${p.rlas.size} engaged RLA${p.rlas.size === 1 ? "" : "s"} · ${p.projects.size} Mission project${p.projects.size === 1 ? "" : "s"}`,
    `${p.partners.size} project partner${p.partners.size === 1 ? "" : "s"} based here`,
    `${p.signatories.size} Charter Signator${p.signatories.size === 1 ? "y" : "ies"}`,
  ];
}

// --- C · flujos ---
const FLOW_OUT = "#3d3436";
const FLOW_IN = "#7945ab";
const flowModes = [
  { id: "both" as const, label: "BOTH" },
  { id: "out" as const, label: "OUT" },
  { id: "in" as const, label: "IN" },
  { id: "none" as const, label: "OFF" },
];
const flowMode = ref<"both" | "out" | "in" | "none">("both");
const flowData = computed(() => (selected.value ? T.flowsFor(selected.value) : null));
const mapFlows = computed(() => {
  const f = flowData.value;
  if (!f || flowMode.value === "none") return [];
  return [
    ...(flowMode.value !== "in" ? f.out.map((x) => ({ ...x, color: FLOW_OUT })) : []),
    ...(flowMode.value !== "out" ? f.in.map((x) => ({ ...x, color: FLOW_IN })) : []),
  ];
});

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
// Dos juegos de indicadores: el de todo el mapa (vocabulario de la Misión) y el de un territorio elegido
// (qué pasa aquí, quién es de aquí y con quién conecta).
const NATURE_SHORT: Record<string, [string, string]> = {
  authority: ["authority", "authorities"], academia: ["university or research centre", "universities & research"], company: ["company", "companies"],
  ngo: ["NGO", "NGOs"], public: ["other public body", "other public bodies"], other: ["other", "other"],
};
const statCells = computed(() => {
  const p = profile.value;
  if (!p) {
    const h = T.headline(null);
    return [
      { label: "ENGAGED RLAs", value: h.engaged, sub: `Regions and local authorities in Mission projects or MIP4Adapt · ${h.engagedResearch.toLocaleString("en-US")} with research projects` },
      { label: "CHARTER SIGNATORIES", value: h.signatories, sub: `${h.signatoriesEngaged.toLocaleString("en-US")} engaged, ${(h.signatories - h.signatoriesEngaged).toLocaleString("en-US")} not yet engaged` },
      { label: "RLAs RECEIVING TECHNICAL ASSISTANCE", value: h.technicalAssistance, sub: "MIP4Adapt, Pathways2Resilience, CLIMAAX" },
      { label: "DEMONSTRATOR RLAs", value: h.demonstrators, sub: "In Innovation Actions" },
      { label: "REPLICATOR RLAs", value: h.replicators, sub: "In Innovation Actions" },
      { label: "PROJECT PARTNERS", value: h.partners, sub: "All organisations in Mission projects (CORDIS), including RLAs" },
    ];
  }
  const h = T.headline(p.id);
  const rlas = p.profile?.rlas.size ?? 0;
  const byNature = new Map<string, number>();
  for (const a of p.actorsHere) {
    if (!T.participation.value.get(a.id)?.partner.length) continue;
    const g = natureGroupOf(a.nature);
    byNature.set(g, (byNature.get(g) ?? 0) + 1);
  }
  const natureLine = [...byNature.entries()].sort((a, b) => b[1] - a[1]).map(([g, n]) => `${n} ${NATURE_SHORT[g]![n === 1 ? 0 : 1]}`).join(" · ");
  const f = flowData.value;
  return [
    { label: "MISSION PROJECTS HERE", value: p.projectsHere.length, sub: `Working with RLAs of this area · ${p.projectsAbove.length} more through a regional or national authority` },
    { label: "ENGAGED RLAs", value: rlas, sub: `${h.demonstrators} demonstrator${h.demonstrators === 1 ? "" : "s"} · ${h.replicators} replicator${h.replicators === 1 ? "" : "s"} · ${h.technicalAssistance} with technical assistance` },
    { label: "CHARTER SIGNATORIES", value: h.signatories, sub: `Based here: ${h.signatoriesEngaged} engaged, ${h.signatories - h.signatoriesEngaged} not yet · ${p.signatoriesAbove.length} regional or national covering it` },
    { label: "PROJECT PARTNERS BASED HERE", value: h.partners, sub: natureLine || "None" },
    { label: "LOCAL ORGANISATIONS WORKING ELSEWHERE", value: p.partElsewhere.length, sub: `${p.partHere.length} take part in projects working here` },
    { label: "AREAS LINKED THROUGH PROJECTS", value: f?.summary.outAreas ?? 0, sub: f ? `Where projects of local partners work (${f.summary.outCountries} countries) · projects here have partners in ${f.summary.inAreas} areas` : "" },
  ];
});
</script>
