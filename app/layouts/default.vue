<template>
  <div class="min-h-screen flex flex-col bg-neutral-lightest">
    <SiteHeader />
    <main class="flex-1"><slot /></main>
    <SiteFooter />
  </div>
</template>
