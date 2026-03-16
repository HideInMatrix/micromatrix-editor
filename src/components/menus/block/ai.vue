<template>
  <template v-if="aiEnabled">
    <menus-button
      class="umo-block-menu-button"
      ico="ai"
      hide-text
      :tooltip="t('blockMenu.ai')"
      @menu-click="dialogVisible = true"
    />
    <menus-ai-dialog
      :visible="dialogVisible"
      target-type="block"
      :node="node"
      :pos="pos"
      @close="dialogVisible = false"
    />
  </template>
</template>

<script setup>
defineProps({
  node: {
    type: Object,
    default: null,
  },
  pos: {
    type: Number,
    default: null,
  },
})

const options = inject('options')

const aiOptions = computed(() => options.value.ai || {})
const aiEnabled = computed(() => {
  return (
    aiOptions.value.enabled &&
    typeof aiOptions.value.onChat === 'function'
  )
})

let dialogVisible = $ref(false)
</script>
