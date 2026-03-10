<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import {
  Bold,
  Highlighter,
  Italic,
  Strikethrough,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { useWritingStudioOtherActions } from "~/composables/writing-studio/actions/useOtherActions";
import { useWritingStudioToolbarState } from "~/composables/writing-studio/toolbar/useState";

const props = defineProps<{
  editor: Editor | null | undefined;
}>();

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const { toolbarButtonClass, isMarkActive } = useWritingStudioToolbarState(editorRef);
const {
  toggleBold,
  toggleHighlight,
  toggleItalic,
  toggleStrike,
} = useWritingStudioOtherActions(editorRef);

const markOptions = [
  {
    key: "bold",
    labelKey: "writingStudio.toolbar.marks.bold",
    icon: Bold,
    isActive: () => isMarkActive("bold"),
    action: toggleBold,
  },
  {
    key: "highlight",
    labelKey: "writingStudio.toolbar.marks.highlight",
    icon: Highlighter,
    isActive: () => isMarkActive("highlight"),
    action: toggleHighlight,
  },
  {
    key: "italic",
    labelKey: "writingStudio.toolbar.marks.italic",
    icon: Italic,
    isActive: () => isMarkActive("italic"),
    action: toggleItalic,
  },
  {
    key: "strike",
    labelKey: "writingStudio.toolbar.marks.strike",
    icon: Strikethrough,
    isActive: () => isMarkActive("strike"),
    action: toggleStrike,
  },
] as const;
</script>

<template>
  <Button
    v-for="option in markOptions"
    :key="option.key"
    variant="ghost"
    size="sm"
    :disabled="!editor"
    :class="toolbarButtonClass(option.isActive())"
    @click="option.action()"
  >
    <component :is="option.icon" />
    {{ t(option.labelKey) }}
  </Button>
</template>
