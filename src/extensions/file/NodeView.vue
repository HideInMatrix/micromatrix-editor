<template>
  <NodeViewWrapper
    :id="attrs.id"
    ref="containerRef"
    class="mxm-node-view"
    :style="nodeStyle"
    @click.capture="editor?.commands.setNodeSelection(getPos())"
  >
    <div
      class="mxm-node-container hover-shadow mxm-select-outline mxm-node-file"
      :style="{
        width: attrs.fitWidth ? '100%' : supportPreview ? '260px' : '220px',
      }"
    >
      <div class="mxm-file-icon">
        <img :src="fileIcon" class="icon-file" />
      </div>
      <div class="mxm-file-info">
        <div class="mxm-file-name" :title="attrs.name || t('file.unknownName')">
          {{ attrs.name || t('file.unknownName') }}
        </div>
        <div class="mxm-file-meta">
          {{ attrs.size ? prettyBytes(attrs.size) : t('file.unknownSize') }}
        </div>
      </div>
      <div class="mxm-file-action">
        <div
          v-if="!attrs.uploaded"
          class="mxm-action-item"
          :title="t('file.uploading')"
        >
          <Icon class="loading" name="loading" />
        </div>
        <template v-else>
          <div
            v-if="supportPreview"
            class="mxm-action-item"
            :title="t('file.preview')"
            :data-preview-url="previewURL"
            :data-file-icon="fileIcon"
            :data-file-name="attrs.name"
            @click.stop="togglePreview"
          >
            <Icon name="view" />
          </div>
          <a
            :href="attrs.url"
            :download="attrs.name"
            target="_blank"
            class="mxm-action-item"
            :title="t('file.download')"
          >
            <Icon name="download" />
          </a>
        </template>
      </div>
    </div>
    <Modal
      dialog-class-name="mxm-file-preview-modal"
      :visible="previewModal"
      :header="false"
      :footer="false"
      width="90vw"
    >
      <div class="mxm-file-preview-modal-header">
        <img :src="fileIcon" class="file-icon" />
        <h3>{{ attrs.name || t('file.unknownName') }}</h3>
        <TButton
          class="close-btn"
          size="small"
          shape="square"
          variant="text"
          @click="previewModal = false"
        >
          <Icon name="close" size="18" />
        </TButton>
      </div>
      <div v-if="previewModal" class="mxm-file-preview-modal-body">
        <iframe :src="previewURL"></iframe>
      </div>
    </Modal>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { isAsyncFunction, isFunction } from '@tool-belt/type-predicates'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import prettyBytes from 'pretty-bytes'

import { getFileExtname, getFileIcon } from '@/utils/file'

import { updateAttributesWithoutHistory } from './'

const props = defineProps(nodeViewProps)
const attrs = $computed(() => props.node.attrs)
const { getPos } = props
const editor = inject('editor')
const options = inject('options')
const container = inject('container')
const uploadFileMap = inject('uploadFileMap')
const containerRef = ref(null)

const nodeStyle = $computed(() => {
  const { nodeAlign, margin } = attrs
  const marginTop =
    margin?.top && margin?.top !== '' ? `${margin.top}px` : undefined
  const marginBottom =
    margin?.bottom && margin?.bottom !== '' ? `${margin.bottom}px` : undefined
  return {
    'justify-content': nodeAlign,
    marginTop,
    marginBottom,
  }
})

const fileIcon = $computed(() => {
  return `${options.value.cdnUrl}/icons/file/${getFileIcon(attrs.name)}.svg`
})

let previewModal = $ref(false)
let previewURL = $ref(null)

const getPreviewInfo = () => {
  const { preview } = options.value.file
  const extname = getFileExtname(attrs.name)
  const match = preview.find(
    (item) => extname && item.extensions.includes(extname),
  )
  return match
}
const setPreviewURL = () => {
  const match = getPreviewInfo()
  if (match?.url.includes('{url}')) {
    previewURL = match.url
      .replace(/{{url}}/g, encodeURIComponent(attrs.url))
      .replace(/{url}/g, attrs.url)
  }
}

onMounted(async () => {
  if (!attrs.uploaded && uploadFileMap.value.has(attrs.id)) {
    try {
      const file = uploadFileMap.value.get(attrs.id)
      const result = await options.value?.onFileUpload?.(file)
      const { id, url } = result
      if (containerRef.value) {
        updateAttributesWithoutHistory(
          editor.value,
          { id, url, uploaded: true },
          getPos(),
        )
      }
      uploadFileMap.value.delete(attrs.id)
    } catch (e) {
      useMessage('error', { attach: container, content: e.message })
    }
  }
  setPreviewURL()
})

onBeforeUnmount(() => {
  setTimeout(() => {
    if (editor.value.isDestroyed) return
    options.value.onFileDelete(attrs.id, attrs.src, `image:${attrs.type}`)
  }, 500)
})

const supportPreview = $computed(() => {
  const supportNodes = ['image', 'video', 'audio']
  return supportNodes.includes(attrs.previewType) || previewURL !== null
})
const togglePreview = () => {
  const match = getPreviewInfo(attrs.name)
  const onPreview = match?.onPreview
  if (isFunction(onPreview) || isAsyncFunction(onPreview)) {
    try {
      onPreview(attrs)
      return
    } catch {}
  }
  if (previewURL !== null) {
    previewModal = true
    return
  }
  editor.value.commands.insertContent({
    type: attrs.previewType,
    attrs: {
      ...attrs,
      src: attrs.url,
    },
  })
}
</script>

<style lang="less">
.mxm-node-view {
  .mxm-node-file {
    display: inline-flex;
    align-items: center;
    padding: 12px;
    outline: solid 1px var(--mxm-content-node-border);
    overflow: hidden;
    background-color: var(--mxm-color-white);
    border-radius: var(--mxm-content-node-radius);

    .mxm-file-info {
      flex: 1;
      min-width: 0;
    }

    .mxm-file-icon {
      width: 32px;
      height: 32px;
      margin-right: 8px;
      .icon-file {
        width: 32px;
        display: block;
      }
    }

    .mxm-file-name {
      font-size: 12px;
      font-weight: 500;
      line-height: 1.2;
      text-overflow: ellipsis;
      overflow: hidden;
      word-break: break-all;
      white-space: nowrap;
      width: 100%;
      padding-right: 10px;
      box-sizing: border-box;
    }

    .mxm-file-meta {
      font-size: 12px;
      color: var(--mxm-text-color-light);
      line-height: 1;
      margin-top: 6px;
    }

    .mxm-file-action {
      display: flex;
      align-items: center;
      color: var(--mxm-text-color-light);
      gap: 5px;

      .mxm-action-item {
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 32px;
        width: 32px;
        background-color: var(--mxm-color-white);
        box-sizing: border-box;
        cursor: pointer;
        border-radius: 50%;
        color: var(--mxm-text-color-light);

        &:hover {
          border: solid 1px var(--mxm-primary-color);
          color: var(--mxm-primary-color);
        }

        .loading {
          animation: turn 1s linear infinite;
        }
      }
    }
  }
}

.mxm-file-preview-modal {
  padding: 0 !important;
  overflow: hidden;
  .mxm-dialog {
    &__header {
      display: none !important;
    }
    &__body {
      padding: 0 !important;
    }
  }
  &-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 15px;
    position: relative;
    .file-icon {
      height: 24px;
      display: block;
    }
    h3 {
      margin: 0;
      font-size: 18px;
      text-overflow: ellipsis;
      overflow: hidden;
      word-break: break-all;
      white-space: nowrap;
      width: calc(100% - 100px);
    }
    .close-btn {
      position: absolute;
      top: 20px;
      right: 20px;
    }
  }
  &-body {
    iframe {
      display: block;
      width: 100%;
      height: calc(90vh - 164px);
      border: solid 1px var(--mxm-border-color-light);
      box-sizing: border-box;
    }
  }
}

@keyframes turn {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
