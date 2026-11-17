<script setup lang="ts">
// Lab version of the Hub top bar (isInviable/farclimate_hub, feat/diseniosindicato).
// Same bar and tokens. The session button and the menu are left out (the Lab is static and
// has no other sections); the "Experimental" badge and the link to the stable version take
// their place. Below 640 px the link moves to the footer; below 375 px the badge is hidden
// too, so the bar never overflows (the footer still says the site is experimental).
// `mode` is kept so the layouts match the Hub's.
withDefaults(defineProps<{
  mode?: 'home' | 'bar'
}>(), {
  mode: 'bar',
})

const stableUrl = 'https://farclimate-hub.netlify.app/connected'
</script>

<template>
  <div>
    <div
      class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-adapt-ink bg-white px-4"
    >
      <NuxtLinkLocale to="/connected" class="font-adapt-heavy text-lg leading-none tracking-tight text-adapt-orange">
        ADAPTARIUM
      </NuxtLinkLocale>
      <div class="flex-1" />
      <span class="inline-flex h-7 items-center bg-adapt-yellow px-2 font-adapt-keyword text-sm tracking-wide text-adapt-ink uppercase max-[374px]:hidden">
        {{ $t('lab.badge') }}
      </span>
      <a
        :href="stableUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="hidden h-9 items-center gap-1 px-1 font-adapt-keyword text-sm tracking-wide text-adapt-ink uppercase hover:underline sm:inline-flex"
      >
        {{ $t('lab.stableVersion') }}
        <UIcon name="i-lucide-arrow-up-right" class="size-4" />
      </a>
      <SiteLocaleSwitcher />
    </div>
  </div>
</template>
