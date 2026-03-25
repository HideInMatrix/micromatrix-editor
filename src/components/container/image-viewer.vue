<template>
  <t-image-viewer
    :attach="container"
    :visible="imageViewer.visible"
    :index="index"
    :images="images"
    :trigger="() => {}"
    @update:index="(value) => emits('update:index', value)"
    @close="imageViewer.visible = false"
  />
</template>

<script setup>
defineProps({
  images: {
    type: Array,
    default: () => [],
  },
  index: {
    type: Number,
    default: 0,
  },
})

const emits = defineEmits(['update:index'])

const container = inject('container')
const imageViewer = inject('imageViewer')
</script>
