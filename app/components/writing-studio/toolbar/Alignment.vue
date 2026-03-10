<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { useWritingStudioOtherActions } from "~/composables/writing-studio/actions/useOtherActions";
import { useWritingStudioToolbarState } from "~/composables/writing-studio/toolbar/useState";
import type { TextAlignValue } from "./types";

const props = defineProps<{
  editor: Editor | null | undefined;
}>();

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const { toolbarButtonClass, canRun } = useWritingStudioToolbarState(editorRef);
const { setTextAlign } = useWritingStudioOtherActions(editorRef);

const alignmentOptions = [
  { value: "left", labelKey: "writingStudio.toolbar.align.left", icon: AlignLeft },
  { value: "center", labelKey: "writingStudio.toolbar.align.center", icon: AlignCenter },
  { value: "right", labelKey: "writingStudio.toolbar.align.right", icon: AlignRight },
  { value: "justify", labelKey: "writingStudio.toolbar.align.justify", icon: AlignJustify },
] as const;

const currentTextAlign = (): TextAlignValue => {
  const paragraphAlign = props.editor?.getAttributes("paragraph").textAlign;
  const headingAlign = props.editor?.getAttributes("heading").textAlign;
  const alignment = headingAlign ?? paragraphAlign;

  if (
    alignment === "left"
    || alignment === "center"
    || alignment === "right"
    || alignment === "justify"
  ) {
    return alignment;
  }

  return "left";
};
</script>

<template>
  <Button
    v-for="option in alignmentOptions"
    :key="option.value"
    variant="ghost"
    size="sm"
    :disabled="!editor || !canRun((current) => current.can().setTextAlign(option.value))"
    :class="toolbarButtonClass(currentTextAlign() === option.value)"
    @click="setTextAlign(option.value)"
  >
    <component :is="option.icon" />
    {{ t(option.labelKey) }}
  </Button>
</template>
