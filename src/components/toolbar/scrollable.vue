<template>
  <div ref="wraperRef" class="mxm-scrollable-container">
    <div
      v-if="!hidePrev"
      class="mxm-scrollable-control scrollable-left"
      @click="scrollLeft"
    >
      <icon name="arrow-down" />
    </div>
    <div ref="contentRef" class="mxm-scrollable-content">
      <slot />
    </div>
    <div
      v-if="!hideNext"
      class="mxm-scrollable-control scrollable-right"
      @click="scrollRight"
    >
      <icon name="arrow-down" />
    </div>
  </div>
</template>

<script setup lang="ts">
const wraperRef = ref(null)
const contentRef = $ref(null)
let hidePrev = $ref(true)
let hideNext = $ref(true)

const checkScrollPosition = () => {
  const { scrollLeft = 0, scrollWidth = 0, clientWidth = 0 } = contentRef || {}
  hidePrev = scrollLeft === 0
  hideNext = scrollLeft + clientWidth + 20 >= scrollWidth
}

const scrollLeft = () => {
  if (contentRef && (contentRef.scrollLeft || contentRef.scrollLeft === 0)) {
    contentRef.scrollLeft -= contentRef.offsetWidth - 10 || 100
  }
}

const scrollRight = () => {
  if (contentRef && (contentRef.scrollLeft || contentRef.scrollLeft === 0)) {
    contentRef.scrollLeft += contentRef.offsetWidth - 10 || 100
  }
}

// 监听父元素大小变化
useResizeObserver(wraperRef, () => {
  checkScrollPosition()
})

// 支持鼠标滚轮滚动
const wheelScroll = (e) => {
  e.preventDefault()
  e.deltaY < 0 ? scrollLeft() : scrollRight()
}
onMounted(() => {
  if (contentRef) {
    contentRef.addEventListener('scroll', checkScrollPosition)
    contentRef.addEventListener('wheel', wheelScroll, { passive: false })
  }
})
onUnmounted(() => {
  if (contentRef) {
    contentRef.removeEventListener('wheel', wheelScroll)
  }
})

// 更新
const update = () => {
  if (contentRef) {
    contentRef.scrollLeft = 0
  }
  hideNext = true
  checkScrollPosition()
}

defineExpose({
  update,
})
</script>

<style lang="less" scoped>
.mxm-scrollable-container {
  width: 100%;
  overflow: hidden;
  position: relative;
  .mxm-scrollable-control {
    display: flex;
    align-items: center;
    justify-content: center;
    border: solid 1px var(--mxm-border-color);
    border-radius: var(--mxm-radius);
    cursor: pointer;
    color: var(--mxm-text-color-light);
    overflow: visible;
    background-color: var(--mxm-button-hover-background);
    z-index: 10;
    font-size: 20px;
    box-sizing: border-box;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: calc(100% - 20px);
    outline: solid 10px var(--mxm-color-white);
    &:hover {
      border-color: var(--mxm-primary-color);
      background-color: var(--mxm-primary-color);
      color: var(--mxm-color-white);
    }
    &.scrollable-left {
      left: 10px;
      :deep(.mxm-icon) {
        transform: rotate(90deg);
      }
      &::before {
        display: block;
        content: '';
        background: linear-gradient(
          to left,
          transparent,
          var(--mxm-color-white)
        );
        position: absolute;
        left: 30px;
        top: 0;
        bottom: 0;
        width: 30px;
        pointer-events: none;
      }
    }
    &.scrollable-right {
      right: 10px;
      :deep(.mxm-icon) {
        transform: rotate(-90deg);
      }
      &::before {
        display: block;
        content: '';
        background: linear-gradient(
          to right,
          transparent,
          var(--mxm-color-white)
        );
        position: absolute;
        right: 30px;
        top: 0;
        bottom: 0;
        width: 30px;
        pointer-events: none;
      }
    }
  }
  .mxm-scrollable-content {
    overflow-x: auto;
    overflow-y: hidden;
    scroll-behavior: smooth;
    flex: 1;
    &::-webkit-scrollbar {
      display: none;
    }
  }
}
</style>

<style lang="less">
.mxm-skin-modern {
  &.toolbar-ribbon {
    .mxm-scrollable-container {
      padding: 10px 15px 2px 15px !important;
    }
    .mxm-scrollable-control {
      height: calc(100% - 32px) !important;
      margin-top: 4px;
    }
  }
  &.toolbar-classic {
    .mxm-scrollable-container {
      padding: 15px 15px 2px 15px !important;
    }
    .mxm-scrollable-control {
      height: calc(100% - 38px) !important;
      margin-top: 6px;
    }
  }
  .mxm-scrollable-content {
    border-radius: 6px;
    background-color: var(--mxm-color-white);
    padding: 10px 0 10px 10px;
    box-shadow:
      0 0 0 1px hsla(0, 0%, 5%, 0.04),
      0 2px 5px hsla(0, 0%, 5%, 0.06);
    &:hover {
      box-shadow:
        0 0 0 1px hsla(0, 0%, 5%, 0.06),
        0 2px 5px hsla(0, 0%, 5%, 0.1);
    }
  }
  .mxm-scrollable-control {
    border-radius: 5px !important;
    &.scrollable-left {
      left: 25px !important;
    }
    &.scrollable-right {
      right: 25px !important;
    }
  }
}
[theme-mode='dark'] .mxm-skin-modern .mxm-scrollable-content {
  outline: solid 1px var(--mxm-border-color-light);
}
</style>
