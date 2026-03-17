<template>
  <menus-button
    :ico="content ? 'edit' : 'mermaid'"
    :text="content ? t('tools.mermaid.edit') : t('tools.mermaid.text')"
    huge
    @menu-click="dialogVisible = true"
  >
    <modal
      :visible="dialogVisible"
      icon="mermaid"
      width="960px"
      @confirm="setMermaid"
      @close="dialogVisible = false"
    >
      <template #header>
        <icon name="mermaid" />
        {{ content ? t('tools.mermaid.edit') : t('tools.mermaid.text') }}
      </template>
      <div class="umo-mermaid-container">
        <div class="umo-mermaid-editor">
          <div class="umo-mermaid-toolbar">
            <menus-button
              style="width: 100px"
              menu-type="select"
              :text="t('tools.mermaid.theme')"
              :select-options="themes"
              :select-value="localConfig.theme"
              @menu-click="(value) => (localConfig.theme = value)"
            />
            <menus-button
              ico="copy"
              :tooltip="t('tools.mermaid.copy')"
              hide-text
              @menu-click="copyCode"
            />
            <menus-button
              ico="node-delete"
              :tooltip="t('tools.mermaid.clear')"
              hide-text
              @menu-click="mermaidCode = ''"
            />
          </div>
          <t-textarea
            v-model="mermaidCode"
            class="umo-mermaid-code"
            autofocus
            :placeholder="t('tools.mermaid.placeholder')"
          />
        </div>
        <div class="umo-mermaid-render">
          <div
            class="umo-mermaid-title"
            v-text="t('tools.mermaid.preview')"
          ></div>
          <div
            ref="mermaidRef"
            class="umo-mermaid-svg umo-scrollbar"
            v-html="svgCode"
          ></div>
        </div>
      </div>
      <t-checkbox
        class="umo-mermaid-keep-size"
        v-if="content && content !== ''"
        v-model="keepSize"
      >
        {{ t('tools.mermaid.keepSize') }}
      </t-checkbox>
    </modal>
  </menus-button>
</template>

<script setup>
import { getSelectionNode } from '@/utils/selection'
import { shortId } from '@/utils/short-id'
import { svgToDataURL } from '@/utils/file'

const props = defineProps({
  config: {
    type: Object,
    default: () => ({
      theme: 'default',
    }),
  },
  content: {
    type: String,
    default: undefined,
  },
})

const editor = inject('editor')
const container = inject('container')

let dialogVisible = $ref(false)

// 工具栏
const themes = [
  { label: t('tools.mermaid.themes.default'), value: 'default' },
  { label: t('tools.mermaid.themes.base'), value: 'base' },
  { label: t('tools.mermaid.themes.dark'), value: 'dark' },
  { label: t('tools.mermaid.themes.forest'), value: 'forest' },
  { label: t('tools.mermaid.themes.neutral'), value: 'neutral' },
]
let localConfig = $ref({})

const copyCode = () => {
  const { copy } = useClipboard({
    source: mermaidCode,
  })
  copy()
  useMessage('success', {
    attach: container,
    content: t('tools.mermaid.copied'),
  })
}

//  初始化 Mermaid
const mermaidInit = () => {
  mermaid.initialize({
    darkMode: false,
    startOnLoad: false,
    fontSize: 12,
    securityLevel: 'loose',
    ...localConfig,
  })
}

// 渲染 Mermaid
let mermaidCode = $ref(props.content)
let svgCode = $ref('')
let renderError = $ref(false)
const mermaidRef = $ref(null)

const extractSvgMarkup = (result) => {
  if (typeof result === 'string') {
    return result
  }

  if (typeof result?.svg === 'string') {
    return result.svg
  }

  return ''
}

const getSvgSizeFromMarkup = (markup = '') => {
  if (!markup) {
    return { width: 0, height: 0 }
  }

  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const svg = doc.querySelector('svg')

  if (!svg) {
    return { width: 0, height: 0 }
  }

  const width = Number.parseFloat(svg.getAttribute('width') || '')
  const height = Number.parseFloat(svg.getAttribute('height') || '')

  if (Number.isFinite(width) && Number.isFinite(height)) {
    return { width, height }
  }

  const viewBox =
    svg
      .getAttribute('viewBox')
      ?.trim()
      .split(/[\s,]+/)
      .map((item) => Number.parseFloat(item)) || []

  if (viewBox.length === 4 && viewBox.every((item) => Number.isFinite(item))) {
    return {
      width: viewBox[2],
      height: viewBox[3],
    }
  }

  return { width: 0, height: 0 }
}

const renderMermaid = async () => {
  try {
    renderError = false
    const result = await mermaid.render(
      `mermaid-svg-${shortId(6)}`,
      mermaidCode,
    )
    svgCode = extractSvgMarkup(result)
    await nextTick()
    if (typeof result?.bindFunctions === 'function' && mermaidRef) {
      result.bindFunctions(mermaidRef)
    }
  } catch {
    svgCode = ''
    renderError = true
  }
}
watch(
  () => dialogVisible,
  async (visible) => {
    if (visible) {
      localConfig = { ...props.config }
      mermaidCode = props.content || 'graph TB\na-->b'
      renderError = false
    } else {
      svgCode = ''
      renderError = false
    }
  },
  { immediate: true },
)
watch(
  () => [localConfig, mermaidCode],
  async () => {
    if (!mermaidCode || mermaidCode === '') {
      svgCode = ''
      renderError = false
      return
    }
    await nextTick()
    mermaidInit()
    await renderMermaid()
  },
  { deep: true },
)

// 创建或更新 Mermaid
const keepSize = $ref(false)
const setMermaid = () => {
  if (mermaidCode === '') {
    useMessage('error', {
      attach: container,
      content: t('tools.mermaid.notEmpty'),
    })
    return
  }

  if (!svgCode || renderError) {
    useMessage('error', {
      attach: container,
      content: t('tools.mermaid.renderError'),
    })
    return
  }

  if (!props.content || (props.content && props.content !== mermaidCode)) {
    const svg = mermaidRef?.querySelector?.('svg')
    const rect = svg?.getBoundingClientRect?.()
    const fallbackSize = getSvgSizeFromMarkup(svgCode)
    const width = rect?.width || fallbackSize.width || 600
    const height = rect?.height || fallbackSize.height || 320
    const { attrs } = getSelectionNode(editor.value) || {}
    const imageOptions = {
      id: shortId(10),
      type: 'mermaid',
      src: svgToDataURL(svg || svgCode),
      config: JSON.stringify(localConfig),
      content: mermaidCode,
      width: keepSize ? attrs?.width || width : width,
      height: keepSize ? attrs?.height || height : height,
      equalProportion: false,
    }
    editor.value?.chain().focus().setImage(imageOptions, !!props.content).run()
  }
  dialogVisible = false
}
</script>

<style lang="less" scoped>
.umo-mermaid-container {
  display: flex;
  .umo-mermaid-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .umo-mermaid-toolbar {
    display: flex;
    align-items: center;
    padding: 2px;
  }
  .umo-mermaid-code {
    width: 320px;
    margin-left: 2px;
    flex: 1;
    :deep(.umo-textarea__inner) {
      height: 100%;
      resize: none;
    }
  }
  .umo-mermaid-render {
    flex: 1;
    margin-left: 20px;
    border: solid 1px var(--td-border-level-2-color);
    border-radius: var(--umo-radius);
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    .umo-mermaid-title {
      background-color: var(--umo-button-hover-background);
      padding: 0 10px;
      position: absolute;
      font-size: 12px;
      border-bottom-right-radius: var(--umo-radius);
    }
    .umo-mermaid-svg {
      box-sizing: border-box;
      height: 320px;
      padding: 40px 20px 20px;
      overflow: auto;
      display: flex;
      justify-content: center;
    }
  }
}
.umo-mermaid-keep-size {
  position: absolute;
  bottom: 30px;
}
</style>
