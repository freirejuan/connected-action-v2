<script setup lang="ts">
const { locale } = useI18n()
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [{ rel: 'icon', type: 'image/png', href: '/img/icono-farclimate.png' }],
  htmlAttrs: { lang: () => locale.value }
})
useSeoMeta({
  title: 'Connected Action · Lab',
  description: 'Experimental version of the FARCLIMATE Connected Action, with the EU Mission on Adaptation layer.'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
