<template>
  <template v-if="aiEnabled">
    <menus-button
      class="umo-block-menu-button"
      ico="ai"
      hide-text
      :tooltip="t('blockMenu.ai')"
      @menu-click="insertAiNode"
    />
  </template>
</template>

<script setup>
import { createBlockAiNodePayload } from '@/composables/ai-node'
import { canUseAiChat } from '@/utils/ai-actions'

const props = defineProps({
  node: {
    type: Object,
    default: null,
  },
  pos: {
    type: Number,
    default: null,
  },
})

const editor = inject('editor')
const options = inject('options')

const aiOptions = computed(() => options.value.ai || {})
const aiEnabled = computed(() => {
  return aiOptions.value.enabled && canUseAiChat(aiOptions.value)
})

const insertAiNode = () => {
  const payload = createBlockAiNodePayload({
    editor: editor.value,
    node: props.node,
    pos: props.pos,
    locale: options.value.locale,
  })
  if (!payload) {
    return
  }
  editor.value?.commands.setAi(payload.attrs, payload.position)
}
</script>
