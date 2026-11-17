<template>
  <footer class="mt-auto">
    <!-- 1 · Lab: data sources and their cut-off dates (unchanged content) -->
    <div class="border-t border-neutral-darkest bg-neutral-lightest px-6 py-6">
      <div class="flex flex-col md:flex-row md:items-start gap-4 md:gap-10 font-mono text-2xs text-neutral-dark">
        <div class="shrink-0 font-bold uppercase tracking-[0.14em] text-neutral-darkest">{{ $t('lab.sources') }}</div>
        <ul v-if="meta" class="flex-1 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
          <li v-for="s in meta.sources" :key="s.key">
            <span class="text-neutral-darkest">{{ s.label }}</span> · {{ $t('lab.cutoff') }} {{ s.date }}<span v-if="s.refresh"> · {{ $t('lab.refresh') }}: {{ s.refresh }}</span>
          </li>
        </ul>
        <div class="shrink-0">FARCLIMATE · inViable · {{ $t('lab.generated') }} {{ meta?.generated }}</div>
      </div>
    </div>

    <!-- 2 · Dark band, as in the Hub footer. The Lab has no content manager: texts live in the locale files. -->
    <div class="bg-neutral-900 px-6 py-12 text-neutral-50">
      <div class="mx-auto grid max-w-7xl grid-cols-1 gap-10 md:grid-cols-3 md:gap-16">
        <div>
          <NuxtLinkLocale to="/connected" class="inline-block" aria-label="Adaptarium Transformation HUB">
            <SiteWordmark size="sm" tone="light" />
          </NuxtLinkLocale>
        </div>
        <p class="font-mono text-sm leading-relaxed">{{ $t('lab.footerNotice') }}</p>
        <ul class="space-y-2 font-mono text-sm">
          <li>
            <a
              href="https://farclimate-hub.netlify.app/connected"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 hover:underline"
            >
              {{ $t('lab.stableVersion') }}
              <UIcon name="i-lucide-arrow-up-right" class="size-4" />
            </a>
          </li>
          <li>
            <a
              href="https://farclimate-project.eu"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 hover:underline"
            >
              FARCLIMATE Project
              <UIcon name="i-lucide-arrow-up-right" class="size-4" />
            </a>
          </li>
        </ul>
      </div>
    </div>

    <!-- 3 · Funders band: EU emblem and SERI logo on a light ground, statement in Arial.
         The SERI file is the official one, unmodified; it is the English version in every language. -->
    <div class="border-t border-adapt-ink bg-white px-6 py-6">
      <div class="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
        <div class="flex shrink-0 flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
          <div class="flex items-center gap-3">
            <img src="/img/eu-emblem.svg" alt="" class="h-10 w-auto shrink-0" width="60" height="40">
            <span class="font-eu text-sm font-bold text-black">{{ $t('lab.fundedBy') }}</span>
          </div>
          <img
            src="/img/WBF_SBFI_EU_Frameworkprogramme_E_RGB_pos_quer.svg"
            alt="Project funded by the Swiss Confederation: State Secretariat for Education, Research and Innovation (SERI)"
            lang="en"
            class="h-16 w-auto shrink-0 self-start sm:self-auto"
            width="253"
            height="64"
          >
        </div>
        <p class="font-eu text-xs leading-relaxed text-adapt-ink">{{ $t('lab.funding') }}</p>
      </div>
    </div>
  </footer>
</template>

<script lang="ts" setup>
import { fetchDataMeta } from "~/utils/cordisRepository";
const { data: meta } = await useAsyncData("lab-data-meta", fetchDataMeta);
</script>
