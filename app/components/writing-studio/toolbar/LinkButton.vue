<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { Link2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { useWritingStudioToolbarState } from "~/composables/writing-studio/toolbar/useState";

const props = defineProps<{
  editor: Editor | null | undefined;
  openLinkEditor: () => void;
}>();

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const { toolbarButtonClass, isMarkActive } = useWritingStudioToolbarState(editorRef);
</script>

<template>
  <Button
    variant="ghost"
    size="sm"
    :disabled="!editor"
    :class="toolbarButtonClass(isMarkActive('link'))"
    @click="openLinkEditor()"
  >
    <Link2 />
    {{ t("writingStudio.toolbar.marks.link") }}
  </Button>
</template>
