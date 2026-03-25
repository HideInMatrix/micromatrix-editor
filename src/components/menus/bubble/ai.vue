<template>
  <template v-if="aiEnabled && hasTextSelection">
    <menus-button
      ico="ai"
      :tooltip="t('bubbleMenu.ai')"
      @menu-click="insertAiNode"
    />
  </template>
</template>

<script setup>
import { CellSelection } from "@tiptap/pm/tables";

import { canUseAiChat } from "@/utils/ai-actions";
import { getAiSelectionAnchor, hasAiSelection } from "@/utils/selection";

const editor = inject("editor");
const options = inject("options");
const openAiChat = inject("openAiChat", null);

const aiOptions = computed(() => options.value.ai || {});
const aiEnabled = computed(() => {
  return aiOptions.value.enabled && canUseAiChat(aiOptions.value);
});
const hasTextSelection = computed(() => {
  const editorIns = editor.value;
  const selection = editorIns?.state?.selection;
  if (!editorIns || !selection) {
    return false;
  }
  if (selection instanceof CellSelection) {
    return false;
  }
  return hasAiSelection(editorIns);
});

const insertAiNode = () => {
  if (!editor.value || !openAiChat) {
    return;
  }
  const selectionAnchor = getAiSelectionAnchor(editor.value);
  editor.value.chain().focus().run();
  openAiChat({
    scope: selectionAnchor ? "selection" : "document",
    selectionAnchor,
  });
};
</script>
