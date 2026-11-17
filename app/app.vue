<script setup lang="ts">
const { locale } = useI18n()
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
    { rel: 'apple-touch-icon', href: '/favicon-180.png' }
  ],
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
