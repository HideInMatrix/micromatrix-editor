<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { useWritingStudioOtherActions } from "~/composables/writing-studio/actions/useOtherActions";
import { useWritingStudioToolbarState } from "~/composables/writing-studio/toolbar/useState";

const props = defineProps<{
  editor: Editor | null | undefined;
}>();

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const { toolbarButtonClass } = useWritingStudioToolbarState(editorRef);
const { setImageAlign } = useWritingStudioOtherActions(editorRef);

const currentImageAlign = (): "left" | "center" | "right" => {
  const alignment = props.editor?.getAttributes("image").align;

  if (alignment === "left" || alignment === "center" || alignment === "right") {
    return alignment;
  }

  return "center";
};

const shouldShowImageMenu = ({ editor: currentEditor }: any) => {
  return currentEditor.isEditable && currentEditor.isActive("image");
};

const preventImageMenuMouseDown = (event: MouseEvent) => {
  event.preventDefault();
};
</script>

<template>
  <BubbleMenu
    v-if="editor"
    plugin-key="writing-studio-image-menu"
    :editor="editor"
    :should-show="shouldShowImageMenu"
    :options="{ placement: 'top', offset: 10 }"
  >
    <div class="ws-image-menu" @mousedown="preventImageMenuMouseDown">
      <Button
        variant="ghost"
        size="sm"
        :class="toolbarButtonClass(currentImageAlign() === 'left')"
        :title="t('writingStudio.toolbar.align.left')"
        :aria-label="t('writingStudio.toolbar.align.left')"
        @click="setImageAlign('left')"
      >
        <AlignLeft />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        :class="toolbarButtonClass(currentImageAlign() === 'center')"
        :title="t('writingStudio.toolbar.align.center')"
        :aria-label="t('writingStudio.toolbar.align.center')"
        @click="setImageAlign('center')"
      >
        <AlignCenter />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        :class="toolbarButtonClass(currentImageAlign() === 'right')"
        :title="t('writingStudio.toolbar.align.right')"
        :aria-label="t('writingStudio.toolbar.align.right')"
        @click="setImageAlign('right')"
      >
        <AlignRight />
      </Button>
    </div>
  </BubbleMenu>
</template>
