<template>
  <div class="mxm-main-container">
    <ContainerToc v-if="pageOptions.showToc" @close="pageOptions.showToc = false" />
    <div :class="`mxm-zoomable-container mxm-${pageOptions.layout}-container mxm-scrollbar`">
      <div
        class="mxm-zoomable-content"
        :style="{
          width: pageZoomWidth,
          height: pageZoomHeight,
        }">
        <TWatermark
          class="mxm-page-content"
          :style="{
            '--mxm-page-orientation': pageOptions.orientation,
            '--mxm-page-background': pageOptions.background,
            '--mxm-page-margin-top': pageOptions.margin?.top + 'cm',
            '--mxm-page-margin-bottom': pageOptions.margin?.bottom + 'cm',
            '--mxm-page-margin-left': pageOptions.margin?.left + 'cm',
            '--mxm-page-margin-right': pageOptions.margin?.right + 'cm',
            '--mxm-page-width': pageOptions.layout === 'page' ? pageSize.width + 'cm' : 'auto',
            '--mxm-page-height': pageOptions.layout === 'page' ? pageSize.height + 'cm' : '100%',
            width: pageOptions.layout === 'page' ? pageSize.width + 'cm' : '100%',
            transform: `scale(${pageOptions.zoomLevel ? pageOptions.zoomLevel / 100 : 1})`,
          }"
          :alpha="pageOptions.watermark.alpha"
          v-bind="watermarkOptions"
          :watermark-content="pageOptions.watermark">
          <div class="mxm-page-node-header" contenteditable="false">
            <div class="mxm-page-corner corner-tl" style="width: var(--mxm-page-margin-left)"></div>

            <div class="mxm-page-node-header-content"></div>
            <div class="mxm-page-corner corner-tr" style="width: var(--mxm-page-margin-right)"></div>
          </div>
          <div class="mxm-page-node-content">
            <Editor>
              <template #bubble_menu="props">
                <slot name="bubble_menu" v-bind="props" />
              </template>
            </Editor>
          </div>
          <div class="mxm-page-node-footer" contenteditable="false">
            <div class="mxm-page-corner corner-bl" style="width: var(--mxm-page-margin-left)"></div>
            <div class="mxm-page-node-footer-content"></div>
            <div class="mxm-page-corner corner-br" style="width: var(--mxm-page-margin-right)"></div>
          </div>
        </TWatermark>
      </div>
    </div>
    <div class="mxm-main-floating-actions">
      <TBackTop style="position: relative" :container="`${container} .mxm-zoomable-container`" :visible-height="800" size="small" />
    </div>
    <TImageViewer :attach="container" v-model:visible="imageViewer.visible" v-model:index="currentImageIndex" :images="previewImages" :trigger="emptyImageTrigger" @close="imageViewer.visible = false" />
    <ContainerSearchReplace />
    <ContainerPrint />
  </div>
</template>

<script setup lang="ts">
const container = inject("container");
const imageViewer = inject("imageViewer");
const pageOptions = inject("page");
const emptyImageTrigger = () => null;

// 页面大小
const pageSize = $computed(() => {
  const { width, height } = pageOptions.value.size || { width: 0, height: 0 };
  return {
    width: pageOptions.value.orientation === "portrait" ? width : height,
    height: pageOptions.value.orientation === "portrait" ? height : width,
  };
});
// 页面缩放后的大小
const pageZoomWidth = $computed(() => {
  if (pageOptions.value.layout === "web") {
    return "100%";
  }
  return `calc(${pageSize.width}cm * ${pageOptions.value.zoomLevel ? pageOptions.value.zoomLevel / 100 : 1})`;
});

// 页面内容变化后更新页面高度
let pageZoomHeight = $ref("");
let pageContentEl = $ref(null);
let pageHeightRaf = 0;
let pageHeightObserver = $ref(null);
const updatePageZoomHeight = () => {
  if (pageOptions.value.layout === "web") {
    pageZoomHeight = "auto";
    return;
  }
  if (!pageContentEl) {
    console.warn("The element <.mxm-page-content> does not exist.");
    return;
  }
  const height = `${(pageContentEl.clientHeight * (pageOptions.value.zoomLevel || 1)) / 100}px`;
  if (pageZoomHeight !== height) {
    pageZoomHeight = height;
  }
};
const schedulePageZoomHeight = () => {
  if (pageHeightRaf) {
    cancelAnimationFrame(pageHeightRaf);
  }
  pageHeightRaf = requestAnimationFrame(() => {
    pageHeightRaf = 0;
    updatePageZoomHeight();
  });
};
onMounted(async () => {
  await nextTick();
  pageContentEl = document.querySelector(`${container} .mxm-page-content`);
  if (pageContentEl) {
    pageHeightObserver = new ResizeObserver(() => {
      schedulePageZoomHeight();
    });
    pageHeightObserver.observe(pageContentEl);
  } else {
    console.warn("The element <.mxm-page-content> does not exist.");
  }
  schedulePageZoomHeight();
});
onUnmounted(() => {
  if (pageHeightObserver) {
    pageHeightObserver.disconnect();
    pageHeightObserver = null;
  }
  if (pageHeightRaf) {
    cancelAnimationFrame(pageHeightRaf);
  }
});

// 页面变化后，更新页面高度
watch(
  () => [pageOptions.value.layout, pageOptions.value.zoomLevel, pageOptions.value.size, pageOptions.value.orientation],
  () => {
    schedulePageZoomHeight();
  },
  { deep: true },
);

// 水印
const watermarkOptions = $ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  type: undefined,
});
watch(
  () => pageOptions.value.watermark,
  (watermarkObj = { type: "" }) => {
    const { type } = watermarkObj;
    if (type === "compact") {
      watermarkOptions.width = 320;
      watermarkOptions.y = 240;
    } else {
      watermarkOptions.width = 480;
      watermarkOptions.y = 360;
    }
  },
  { deep: true, immediate: true },
);

// 图片预览
let previewImages = $ref([]);
let currentImageIndex = $ref(0);

watch(
  () => imageViewer.value.visible,
  async (visible) => {
    if (!visible) {
      previewImages = [];
      currentImageIndex = 0;
      return;
    }
    await nextTick();
    const images = document.querySelectorAll(`${container} .mxm-page-node-content img[src][data-preview]`);
    Array.from(images).forEach((image, index) => {
      const src = image.getAttribute("src");
      const nodeId = image.getAttribute("data-id");
      previewImages.push(src);
      if (nodeId === imageViewer.value.current) {
        currentImageIndex = index;
      }
    });
  },
);
</script>

<style lang="less">
.mxm-main-container {
  height: 100%;
  display: flex;
  position: relative;
}

.mxm-zoomable-container {
  flex: 1;
  scroll-behavior: smooth;
  &.mxm-page-container {
    padding: 20px 50px;
    box-sizing: border-box;
    .mxm-zoomable-content {
      margin: 0 auto;
      box-shadow:
        rgba(0, 0, 0, 0.06) 0px 0px 10px 0px,
        rgba(0, 0, 0, 0.04) 0px 0px 0px 1px;
    }
  }
  &.mxm-web-container {
    display: flex;
    .mxm-zoomable-content {
      flex: 1;
      .mxm-page-corner {
        display: none;
      }
      .mxm-page-content {
        min-height: 100%;
        .mxm-page-node-content {
          min-height: 100px;
        }
      }
    }
  }
  .mxm-page-content {
    transform-origin: 0 0;
    box-sizing: border-box;
    display: flex;
    position: relative;
    box-sizing: border-box;
    background-color: var(--mxm-page-background);
    width: var(--mxm-page-width);
    min-height: var(--mxm-page-height);
    overflow: visible !important;
    display: flex;
    flex-direction: column;
    [contenteditable] {
      outline: none;
    }
  }
}

.mxm-page-node-header {
  height: var(--mxm-page-margin-top);
  overflow: hidden;
}

.mxm-page-node-footer {
  height: var(--mxm-page-margin-bottom);
  overflow: hidden;
}

.mxm-page-node-header,
.mxm-page-node-footer {
  display: flex;
  justify-content: space-between;
}

.mxm-page-corner {
  box-sizing: border-box;
  position: relative;
  z-index: 10;
}

.mxm-page-corner {
  @media print {
    opacity: 0;
  }

  &::after {
    position: absolute;
    content: "";
    display: block;
    height: 1cm;
    width: 1cm;
    border: solid 1px rgba(0, 0, 0, 0.08);
  }

  &.corner-tl::after {
    border-top: none;
    border-left: none;
    bottom: 0;
    right: 0;
  }

  &.corner-tr::after {
    border-top: none;
    border-right: none;
    bottom: 0;
    left: 0;
  }

  &.corner-bl::after {
    border-bottom: none;
    border-left: none;
    top: 0;
    right: 0;
  }

  &.corner-br::after {
    border-bottom: none;
    border-right: none;
    top: 0;
    left: 0;
  }
}

.mxm-page-node-header-content,
.mxm-page-node-footer-content {
  flex: 1;
}

.mxm-page-node-content {
  position: relative;
  box-sizing: border-box;
  flex-shrink: 1;
}

.mxm-main-floating-actions {
  position: absolute;
  bottom: 25px;
  right: 25px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 10px;
  > * {
    position: relative;
    inset-inline-end: unset !important;
    inset-block-end: unset !important;
    opacity: 0.9;
    &:hover {
      opacity: 1;
      background-color: var(--mxm-color-white) !important;
      border: solid 1px var(--mxm-primary-color);
    }
  }
}

.mxm-viewer-container {
  position: absolute;
  inset: 0;
  z-index: 1000;
}
</style>
