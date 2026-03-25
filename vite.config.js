import Vue from '@vitejs/plugin-vue'
import ReactivityTransform from '@vue-macros/reactivity-transform/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TDesignResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import VueMacros from 'unplugin-vue-macros/vite'
import { defineConfig } from 'vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

import pkg from './package.json'
import copyright from './src/utils/copyright'

const normalizeModuleId = (id = '') => id.replaceAll('\\', '/')
const dependencyNames = Object.keys(pkg.dependencies || {})
const lazyFeaturePatterns = [
  '/src/components/container/ai-chat',
  '/src/components/container/use-ai-chat-panel.js',
  '/src/components/container/ai-chat.utils.js',
  '/src/components/container/search-replace.vue',
  '/src/components/container/print.vue',
  '/src/components/container/toc.vue',
  '/src/components/menus/toolbar/tools/barcode.vue',
  '/src/components/menus/toolbar/tools/diagrams.vue',
  '/src/components/menus/toolbar/tools/echarts.vue',
  '/src/components/menus/toolbar/tools/math.vue',
  '/src/components/menus/toolbar/tools/mermaid.vue',
  '/src/components/menus/toolbar/tools/qrcode.vue',
  '/src/components/menus/toolbar/tools/signature.vue',
  '/src/components/menus/toolbar/export/docx.vue',
  '/src/components/menus/toolbar/export/embed.vue',
  '/src/components/menus/toolbar/export/image.vue',
  '/src/components/menus/toolbar/export/pdf.vue',
  '/src/components/menus/toolbar/export/share.vue',
  '/src/components/menus/toolbar/export/text.vue',
  '/src/extensions/docx-export/',
  '/src/extensions/echarts/',
]

const escapeRegExp = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const dependencyExternalPatterns = dependencyNames.map(
  (packageName) => new RegExp(`^${escapeRegExp(packageName)}(?:/.*)?$`),
)

const styleRequestPattern = /\.(css|less|sass|scss|styl|stylus)(?:$|\?)/

const getPackageName = (request = '') => {
  if (!request) {
    return ''
  }
  const segments = request.split('/')
  if (request.startsWith('@')) {
    return segments.slice(0, 2).join('/')
  }
  return segments[0]
}

const getNodeModulesRequest = (id = '') => {
  const normalizedId = normalizeModuleId(id)
  if (!normalizedId.includes('/node_modules/')) {
    return null
  }
  return normalizedId.split('/node_modules/').at(-1) || null
}

const getExternalRequest = (id = '') => {
  const normalizedId = normalizeModuleId(id)
  if (
    !normalizedId ||
    normalizedId.startsWith('\0') ||
    normalizedId.startsWith('virtual:') ||
    normalizedId.includes('/src/') ||
    normalizedId.includes('/style/') ||
    styleRequestPattern.test(normalizedId)
  ) {
    return null
  }
  if (
    dependencyExternalPatterns.some((pattern) => pattern.test(normalizedId))
  ) {
    return normalizedId
  }
  const packageRequest = getNodeModulesRequest(normalizedId)
  if (!packageRequest) {
    return null
  }
  const packageName = getPackageName(packageRequest)
  if (!dependencyNames.includes(packageName)) {
    return null
  }
  return packageRequest
}

// Plugin configurations
const vuePlugins = {
  VueMacros: VueMacros({
    plugins: {
      vue: Vue(),
    },
  }),
  AutoImport: AutoImport({
    dirs: ['./src/composables'],
    imports: ['vue', '@vueuse/core'],
    resolvers: [TDesignResolver({ library: 'vue-next', esm: true })],
    dts: './types/imports.d.ts',
    dtsMode: 'overwrite',
  }),
  Components: Components({
    directoryAsNamespace: true,
    dirs: ['./src/components'],
    resolvers: [TDesignResolver({ library: 'vue-next', esm: true })],
    dts: './types/components.d.ts',
  }),
  SvgIcons: createSvgIconsPlugin({
    iconDirs: [`${process.cwd()}/src/assets/icons`],
    symbolId: 'umo-icon-[name]',
    customDomId: 'umo-icons',
  }),
}

// Build configuration
const buildConfig = {
  target: 'es2018',
  lib: {
    entry: `${process.cwd()}/src/components/index.js`,
    name: pkg.name,
    fileName: 'editor',
  },
  outDir: 'dist',
  copyPublicDir: false,
  minify: 'esbuild',
  cssMinify: true,
  rollupOptions: {
    output: [
      {
        banner: copyright,
        intro: `import './editor.css'`,
        entryFileNames: 'editor.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: ({ name = '' }) => {
          if (name.endsWith('.css')) {
            return 'editor.css'
          }
          return 'assets/[name]-[hash][extname]'
        },
        format: 'es',
        paths(id) {
          return getExternalRequest(id) || id
        },
        manualChunks(id) {
          const normalizedId = normalizeModuleId(id)
          if (
            lazyFeaturePatterns.some((pattern) =>
              normalizedId.includes(pattern),
            )
          ) {
            return null
          }
          if (
            normalizedId.includes('virtual:svg-icons-register') ||
            normalizedId.includes('virtual_svg-icons-register')
          ) {
            return 'svg-icons'
          }
          if (normalizedId.includes('/src/locales/')) {
            return 'locales'
          }
          return null
        },
      },
    ],
    external(id) {
      return Boolean(getExternalRequest(id))
    },
    onwarn(warning, warn) {
      if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return
      warn(warning)
    },
  },
}

const cssConfig = {
  preprocessorOptions: {
    less: {
      modifyVars: { '@prefix': 'umo' },
      javascriptEnabled: true,
      // 添加 Less 插件来排除特定类名
      plugins: [
        {
          install(less, pluginManager) {
            pluginManager.addPostProcessor({
              process(css) {
                return css.replace(/\.flex-center(\s|\{|,)[^}]*\}/g, '')
              },
            })
          },
        },
      ],
    },
  },
}

export default defineConfig({
  base: '/editor',
  plugins: [ReactivityTransform(), ...Object.values(vuePlugins)],
  css: cssConfig,
  server: {
    proxy: {
      '/api/ai': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: buildConfig,
  esbuild: {
    drop: ['debugger'],
  },
  resolve: {
    alias: {
      '@': `${process.cwd()}/src`,
    },
  },
})
