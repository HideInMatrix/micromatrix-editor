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
import { canUseAiChat } from "@/utils/ai-actions";
import { getAiSelectionAnchor } from "@/utils/selection";

const props = defineProps({
  node: {
    type: Object,
    default: null,
  },
  pos: {
    type: Number,
    default: null,
  },
});

const editor = inject("editor");
const options = inject("options");
const openAiChat = inject("openAiChat", null);

const aiOptions = computed(() => options.value.ai || {});
const aiEnabled = computed(() => {
  return aiOptions.value.enabled && canUseAiChat(aiOptions.value);
});

const resolveBlockSelectionRange = () => {
  const { node, pos } = props;
  if (!editor.value || !node || !Number.isFinite(pos) || !node.isTextblock) {
    return null;
  }
  const from = pos + 1;
  const to = pos + node.nodeSize - 1;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
    return;
  }
  return { from, to, hasContent: to > from };
};

const insertAiNode = () => {
  if (!editor.value || !openAiChat) {
    return;
  }

  const range = resolveBlockSelectionRange();
  if (range?.hasContent) {
    editor.value.chain().focus().setTextSelection(range).run();
    openAiChat({
      scope: "selection",
      selectionAnchor: {
        from: range.from,
        to: range.to,
        empty: false,
        isNodeSelection: false,
        nodeType: props.node?.type?.name || "",
        nodeSize: props.node?.nodeSize || 0,
      },
    });
    return;
  }

  if (Number.isFinite(props.pos) && props.node) {
    editor.value.chain().focus().setNodeSelection(props.pos).run();
    openAiChat({
      scope: "selection",
      selectionAnchor: getAiSelectionAnchor(editor.value),
    });
    return;
  }

  editor.value.chain().focus().run();
  openAiChat({ scope: "document", selectionAnchor: null });
};
</script>
