<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import {
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Type,
  Underline as UnderlineIcon,
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
  toggleSubscript,
  toggleSuperscript,
  toggleTextStyle,
  toggleUnderline,
} = useWritingStudioOtherActions(editorRef);

const textStyleOptions = [
  {
    key: "subscript",
    labelKey: "writingStudio.toolbar.marks.subscript",
    icon: SubscriptIcon,
    isActive: () => isMarkActive("subscript"),
    action: toggleSubscript,
  },
  {
    key: "superscript",
    labelKey: "writingStudio.toolbar.marks.superscript",
    icon: SuperscriptIcon,
    isActive: () => isMarkActive("superscript"),
    action: toggleSuperscript,
  },
  {
    key: "textStyle",
    labelKey: "writingStudio.toolbar.marks.textStyle",
    icon: Type,
    isActive: () => isMarkActive("textStyle"),
    action: toggleTextStyle,
  },
  {
    key: "underline",
    labelKey: "writingStudio.toolbar.marks.underline",
    icon: UnderlineIcon,
    isActive: () => isMarkActive("underline"),
    action: toggleUnderline,
  },
] as const;
</script>

<template>
  <Button
    v-for="option in textStyleOptions"
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
