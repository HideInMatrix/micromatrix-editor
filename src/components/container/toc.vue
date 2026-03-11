<template>
  <div class="mxm-toc-container">
    <div class="mxm-toc-title">
      <icon class="icon-toc" name="toc" /> {{ t('toc.title') }}
      <div class="mxm-dialog__close" @click="$emit('close')">
        <icon name="close" />
      </div>
    </div>
    <div class="mxm-toc-content mxm-scrollbar">
      <t-tree
        class="mxm-toc-tree"
        :data="tocData"
        :keys="{
          label: 'textContent',
          value: 'id',
        }"
        :empty="t('toc.empty')"
        :transition="false"
        activable
        hover
        expand-all
        @active="headingActive"
      />
    </div>
    <div class="mxm-toc-resize-handle" @mousedown="startResize"></div>
  </div>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
import { TextSelection } from '@tiptap/pm/state'

const container = inject('container')
const editor = inject('editor')
const page = inject('page')

defineEmits(['close'])

// 最终可视化数据
let tocData = $ref([])
const buildTocTree = (tocArray) => {
  const root = []
  const stack = []
  if (!tocArray || tocArray.length === 0) {
    return root
  }
  for (const item of tocArray) {
    const node = {
      textContent: item.textContent,
      level: item.originalLevel,
      id: item.id,
      actived: false, // item.isActive,
      children: [],
    }
    while (
      stack.length > 0 &&
      stack[stack.length - 1].level >= item.originalLevel
    ) {
      stack.pop()
    }
    if (stack.length === 0) {
      root.push(node)
    } else {
      if (!stack[stack.length - 1].children) {
        stack[stack.length - 1].children = []
      }
      stack[stack.length - 1].children.push(node)
    }
    stack.push(node)
  }
  return root
}

const tocDebounceFn = useDebounceFn((toc) => {
  tocData = buildTocTree(toc)
}, 1000)

watch(
  () => editor.value?.storage.tableOfContents.content,
  (toc) => {
    tocDebounceFn(toc)
  },
  { immediate: true },
)

const headingActive = (value) => {
  if (!editor.value) {
    return
  }
  const nodeElement = editor.value.view.dom.querySelector(
    `[data-toc-id="${value[0]}"]`,
  )
  const pageContainer = document.querySelector(
    `${container} .mxm-zoomable-container`,
  )
  const pageHeader = pageContainer?.querySelector(
    '.mxm-page-node-header',
  ) as HTMLElement | null
  if (!nodeElement || !pageContainer || !pageHeader) {
    return
  }
  const { zoomLevel } = page.value
  pageContainer.scrollTo({
    top: Math.round(
      ((nodeElement.offsetTop + pageHeader.offsetHeight) * zoomLevel) / 100,
    ),
  })
  const pos = editor.value.view.posAtDOM(nodeElement, 0)
  const { tr } = editor.value.view.state
  tr.setSelection(new TextSelection(tr.doc.resolve(pos)))
  editor.value.view.dispatch(tr)
  editor.value.view.focus()
}

const umoPageContainer = document.querySelector(
  `${container} .mxm-main-container`,
)
const baseTocWidth = 320
const isResizing = ref(false)
const startX = ref(0)
const initialWidth = ref(baseTocWidth)
const startResize = (e) => {
  if (!umoPageContainer) {
    return
  }
  isResizing.value = true
  startX.value = e.clientX
  initialWidth.value = parseInt(
    getComputedStyle(umoPageContainer?.querySelector('.mxm-toc-container'))
      .width,
    10,
  )
  umoPageContainer.addEventListener('mousemove', resize)
  umoPageContainer.addEventListener('mouseup', stopResize)
}

const resize = (e) => {
  if (isResizing.value) {
    const offsetX = e.clientX - startX.value
    const newWidth = initialWidth.value + offsetX
    const minWidth = baseTocWidth / 1.5
    const maxWidth = baseTocWidth * 2
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      const tocContainer = umoPageContainer.querySelector(
        '.mxm-toc-container',
      ) as HTMLElement | null
      if (!tocContainer) {
        return
      }
      tocContainer.style.width = `${newWidth}px`
    }
  }
}

const stopResize = () => {
  isResizing.value = false
  umoPageContainer.removeEventListener('mousemove', resize)
  umoPageContainer.removeEventListener('mouseup', stopResize)
}
</script>

<style lang="less">
.mxm-toc-container {
  width: 320px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  .mxm-toc-resize-handle {
    position: absolute;
    top: 0;
    right: -2px;
    width: 3px;
    height: 100%;
    opacity: 0.5;
    background-color: transparent;
    &:hover {
      background-color: var(--mxm-primary-color);
      cursor: col-resize;
    }
  }
  &:hover {
    .mxm-dialog__close {
      display: flex !important;
    }
  }
  .mxm-toc-title {
    display: flex;
    align-items: center;
    position: relative;
    padding: 20px 15px 10px;
    .icon-toc {
      margin-right: 5px;
      font-size: 20px;
    }
    .mxm-dialog__close {
      position: absolute;
      right: -4px;
      display: flex;
      align-items: center;
      justify-content: center;
      display: none;
    }
  }
  .mxm-toc-content {
    flex: 1;
    display: flex;
    padding: 10px 10px 10px 15px;
    flex-direction: column;
    .mxm-toc-tree {
      user-select: none;
      --td-brand-color-light: rgba(0, 0, 0, 0.03);
      .mxm-tree {
        &__item {
          height: 32px;
          &--open .t-icon {
            color: var(--mxm-text-color-light);
          }
        }
        &__label {
          --td-comp-paddingLR-xs: 5px;
          --td-bg-color-container-hover: rgba(0, 0, 0, 0.03);
        }
        &__empty {
          height: 60px;
          font-size: 12px;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--mxm-text-color-light);
        }
      }
      .mxm-is-active {
        font-weight: 400;
        color: var(--mxm-primary-color);
      }
    }
  }
}
.mxm-editor-container.mxm-skin-default {
  .mxm-toc-container {
    background-color: var(--mxm-color-white);
    border-right: solid 1px var(--mxm-border-color);
    .mxm-toc-title {
      border-bottom: solid 1px var(--mxm-border-color-light);
      padding: 10px 15px;
      .mxm-dialog__close {
        right: 15px;
      }
    }
    .mxm-toc-content {
      .mxm-toc-tree {
        --td-comp-size-m: 30px;
        --td-comp-paddingLR-xs: 8px;
        --td-comp-margin-xs: 0;
        --td-brand-color-light: var(--mxm-button-hover-background);
      }
    }
  }
}
</style>
