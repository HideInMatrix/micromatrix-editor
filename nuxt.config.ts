// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["@/assets/css/tailwind.css"],
  modules: [
    "@nuxt/image",
    "@nuxt/fonts",
    "@nuxt/scripts",
    "@unocss/nuxt",
    "shadcn-nuxt",
    "@vueuse/nuxt",
    "nuxt-auth-utils",
    "@nuxtjs/sitemap",
    "@nuxtjs/i18n",
  ],
  runtimeConfig: {
    public: {
      auth: {
        loadStrategy: "client-only",
      },
      account: process.env.NUXT_PUBLIC_ACCOUNT,
      password: process.env.NUXT_PUBLIC_PASSWORD,
      imgflCesdkLicense: process.env.NUXT_PUBLIC_IMGFL_CESDK_LICENSE,
      writingStudioImageUploadEndpoint: process.env.NUXT_PUBLIC_WRITING_STUDIO_IMAGE_UPLOAD_ENDPOINT,
    },
  },
  shadcn: {
    prefix: "",
    componentDir: "./app/components/ui",
  },
  site: {
    url: 'https://article.micromatrix.org',
    name: '论文编写网站',
  },

  i18n: {
    // 策略：'prefix_except_default' (除了默认语言外都加路径前缀) 或 'no_prefix' (不改变URL)
    strategy: 'prefix_except_default',
    defaultLocale: 'en',
    langDir: 'locales',
    baseUrl: 'https://article.micromatrix.org',
    locales: [
      { code: 'zh-CN',language: 'zh-CN', iso: 'zh-CN', name: '简体中文', file: 'zh-CN.json' },
      { code: 'zh-TW',language: 'zh-TW', iso: 'zh-TW', name: '繁體中文' , file: 'zh-TW.json'},
      { code: 'en',language: 'en-US', iso: 'en-US', name: 'English', file: 'en.json' }
    ],
    // 建议开启浏览器语言自动检测
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: false, // 关键：防止服务端和客户端强制跳转逻辑不一致
      fallbackLocale: 'en'
    }
  }

});
