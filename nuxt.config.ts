// Connected Action · Lab — versión experimental y autónoma de la Connected Action de FARCLIMATE.
// Extraída de isInviable/farclimate_hub (apps/web, commit e75dbae). Sitio 100 % estático:
// sin servidor ni Supabase; los datos se leen de /public/data/*.json (scripts/build_data.py).
export default defineNuxtConfig({
  ssr: false,
  app: {
    head: {
      meta: [{ name: 'robots', content: 'noindex, nofollow' }]
    }
  },
  modules: ['@nuxt/ui', '@nuxtjs/google-fonts', '@nuxtjs/i18n', '@vueuse/nuxt'],
  components: [
    { path: '~/components/connected', pathPrefix: false },
    { path: '~/components/global', pathPrefix: false },
    { path: '~/components/mission', pathPrefix: false }
  ],
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-15',
  sourcemap: { server: false, client: false },
  nitro: { preset: 'static' },
  ui: { colorMode: false },
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'it', name: 'Italiano', file: 'it.json' }
    ],
    langDir: 'locales/',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: { useCookie: true, cookieKey: 'i18n_redirected', redirectOn: 'root' }
  },
  googleFonts: {
    display: 'swap',
    subsets: ['latin', 'latin-ext'],
    families: { Inter: [400, 500, 600, 700], 'Martian Mono': [300, 400, 500, 600, 700], Outfit: [400, 500, 600, 700, 800, 900] }
  }
})
