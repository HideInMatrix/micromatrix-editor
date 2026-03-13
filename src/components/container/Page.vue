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
        <ElWatermark
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
          :content="pageWatermarkConfig.content"
          :font="pageWatermarkConfig.font"
          :rotate="pageWatermarkConfig.rotate"
          :z-index="pageWatermarkConfig.zIndex"
          :gap="pageWatermarkConfig.gap"
          :offset="pageWatermarkConfig.offset"
          :width="pageWatermarkConfig.width">
          <div class="mxm-page-node-header" contenteditable="false">
            <div
              :class="['mxm-page-corner corner-tl box-border relative z-10', pageOptions.layout === 'web' ? 'hidden' : '']"
              style="width: var(--mxm-page-margin-left)"></div>

            <div class="mxm-page-node-header-content flex-1"></div>
            <div
              :class="['mxm-page-corner corner-tr box-border relative z-10', pageOptions.layout === 'web' ? 'hidden' : '']"
              style="width: var(--mxm-page-margin-right)"></div>
          </div>
          <div class="mxm-page-node-content">
            <Editor>
              <template #bubble_menu="props">
                <slot name="bubble_menu" v-bind="props" />
              </template>
            </Editor>
          </div>
          <div class="mxm-page-node-footer" contenteditable="false">
            <div
              :class="['mxm-page-corner corner-bl box-border relative z-10', pageOptions.layout === 'web' ? 'hidden' : '']"
              style="width: var(--mxm-page-margin-left)"></div>
            <div class="mxm-page-node-footer-content flex-1"></div>
            <div
              :class="['mxm-page-corner corner-br box-border relative z-10', pageOptions.layout === 'web' ? 'hidden' : '']"
              style="width: var(--mxm-page-margin-right)"></div>
          </div>
        </ElWatermark>
      </div>
    </div>
    <div class="mxm-main-floating-actions absolute right-[25px] bottom-[25px] z-[200] flex flex-col gap-[10px]">
      <TBackTop
        class="mxm-main-floating-action relative opacity-90 hover:opacity-100 [inset-inline-end:unset!important] [inset-block-end:unset!important]"
        :container="`${container} .mxm-zoomable-container`"
        :visible-height="800"
        size="small" />
    </div>
    <TImageViewer :attach="container" v-model:visible="imageViewer.visible" v-model:index="currentImageIndex" :images="previewImages" :trigger="emptyImageTrigger" @close="imageViewer.visible = false" />
    <ContainerSearchReplace />
    <ContainerPrint />
  </div>
</template>

<script setup lang="ts">
import { ElWatermark } from "element-plus";

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
const clampWatermarkAlpha = (alpha = 1) => Math.min(Math.max(alpha, 0), 1);
const toWatermarkColor = (color = "#000000", alpha = 1) => {
  const nextAlpha = Number(clampWatermarkAlpha(alpha).toFixed(3));
  const rgbColor = color.match(/^rgba?\((.+)\)$/i)?.[1];
  if (rgbColor) {
    const [red = "0", green = "0", blue = "0"] = rgbColor.split(",").map((value) => value.trim());
    return `rgba(${red}, ${green}, ${blue}, ${nextAlpha})`;
  }
  const hexColor = color.replace("#", "").trim();
  if ([3, 4, 6, 8].includes(hexColor.length)) {
    const unit = hexColor.length <= 4 ? 1 : 2;
    const rawChannels = hexColor.match(new RegExp(`.{${unit}}`, "g")) || [];
    const [red = "00", green = "00", blue = "00"] = rawChannels.map((value) =>
      unit === 1 ? value.repeat(2) : value,
    );
    return `rgba(${Number.parseInt(red, 16)}, ${Number.parseInt(green, 16)}, ${Number.parseInt(blue, 16)}, ${nextAlpha})`;
  }
  return color;
};
const watermarkPresets = {
  compact: {
    width: 320,
    gap: [0, 240] as [number, number],
    offset: [0, 120] as [number, number],
  },
  spacious: {
    width: 480,
    gap: [0, 360] as [number, number],
    offset: [0, 180] as [number, number],
  },
} as const;
const pageWatermarkConfig = $computed(() => {
  const watermark = pageOptions.value.watermark || {};
  const preset = watermark.type === "compact" ? watermarkPresets.compact : watermarkPresets.spacious;
  return {
    content: watermark.text || "",
    font: {
      color: toWatermarkColor(watermark.fontColor || "#000000", watermark.alpha ?? 0.2),
      fontFamily: watermark.fontFamily || "sans-serif",
      fontSize: watermark.fontSize || 16,
      fontWeight: watermark.fontWeight || "normal",
    },
    rotate: -22,
    zIndex: 9,
    ...preset,
  };
});

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

.mxm-page-node-content {
  position: relative;
  box-sizing: border-box;
  flex-shrink: 1;
}

.mxm-main-floating-actions {
  .mxm-main-floating-action:hover {
    background-color: var(--mxm-color-white) !important;
    border: solid 1px var(--mxm-primary-color);
  }
}

.mxm-viewer-container {
  position: absolute;
  inset: 0;
  z-index: 1000;
}
</style>
