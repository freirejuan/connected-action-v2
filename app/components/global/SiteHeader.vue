<template>
  <header class="relative z-20 w-full">
    <div class="bg-neutral-lightest border-b border-neutral-darkest">
      <div class="flex items-center h-16 md:h-20 px-6 gap-3">
        <NuxtLinkLocale to="/connected" class="shrink-0 flex items-center gap-2">
          <img src="/img/icono-farclimate.png" alt="FARCLIMATE" class="h-7" />
          <div class="font-display font-bold text-xs leading-tight">
            Connected Action <br />
            <span class="font-mono font-normal text-2xs tracking-[0.12em] uppercase text-neutral-dark">{{ $t('lab.subtitle') }}</span>
          </div>
        </NuxtLinkLocale>

        <span class="hidden md:inline-flex items-center h-7 px-2 border border-neutral-darkest bg-[#fdbe0f] font-mono uppercase text-2xs font-bold tracking-[0.14em]">
          {{ $t('lab.badge') }}
        </span>

        <div class="flex-1" />

        <a
          href="https://farclimate-hub.netlify.app/connected"
          target="_blank"
          rel="noopener"
          class="hidden lg:inline-flex items-center gap-1.5 h-9 px-2 font-mono uppercase text-2xs font-bold tracking-[0.12em] text-neutral-dark hover:text-neutral-darkest"
        >
          {{ $t('lab.stableVersion') }}
          <UIcon name="mdi:arrow-top-right" class="w-3.5 h-3.5" />
        </a>

        <div class="hidden sm:inline-flex items-stretch h-9 border border-neutral-darkest">
          <button
            v-for="loc in availableLocales"
            :key="loc.code"
            type="button"
            @click="switchLanguage(loc.code)"
            :class="[
              'px-2.5 flex items-center font-mono uppercase text-2xs font-bold tracking-widest transition-colors',
              currentLocale === loc.code
                ? 'bg-neutral-darkest text-neutral-lightest'
                : 'bg-transparent text-neutral-dark hover:text-neutral-darkest',
            ]"
          >
            {{ loc.code.toUpperCase() }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
const route = useRoute();
const { locale, locales, setLocale } = useI18n();
const switchLocalePath = useSwitchLocalePath();
const currentLocale = computed(() => locale.value);
const availableLocales = computed(() => locales.value as { code: "en" | "es" | "it" }[]);

async function switchLanguage(localeCode: "en" | "es" | "it") {
  const path = switchLocalePath(localeCode);
  if (!path) return;
  if (locale.value !== localeCode) await setLocale(localeCode);
  if (route.path !== path) await navigateTo(path);
}
</script>
