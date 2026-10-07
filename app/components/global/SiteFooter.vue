<template>
  <footer class="border-t border-neutral-darkest bg-neutral-lightest px-6 py-6 mt-auto">
    <div class="flex flex-col md:flex-row md:items-start gap-4 md:gap-10 font-mono text-2xs text-neutral-dark">
      <div class="shrink-0 font-bold uppercase tracking-[0.14em] text-neutral-darkest">{{ $t('lab.sources') }}</div>
      <ul v-if="meta" class="flex-1 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
        <li v-for="s in meta.sources" :key="s.key">
          <span class="text-neutral-darkest">{{ s.label }}</span> · {{ $t('lab.cutoff') }} {{ s.date }}
        </li>
      </ul>
      <div class="shrink-0">FARCLIMATE · Inviable · {{ $t('lab.generated') }} {{ meta?.generated }}</div>
    </div>
  </footer>
</template>

<script lang="ts" setup>
import { fetchDataMeta } from "~/utils/cordisRepository";
const { data: meta } = await useAsyncData("lab-data-meta", fetchDataMeta);
</script>
