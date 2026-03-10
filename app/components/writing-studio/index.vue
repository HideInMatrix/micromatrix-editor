<script lang="ts" setup>
import { EditorContent } from "@tiptap/vue-3";
import { DragHandle } from "@tiptap/extension-drag-handle-vue-3";
import { GripVertical } from "lucide-vue-next";
import CodeToolbar from "@/components/writing-studio/toolbar/Code.vue";
import AlignmentToolbar from "@/components/writing-studio/toolbar/Alignment.vue";
import BlockToolbar from "@/components/writing-studio/toolbar/Block.vue";
import ImageToolbar from "@/components/writing-studio/toolbar/Image.vue";
import InsertToolbar from "@/components/writing-studio/toolbar/Insert.vue";
import LinkButtonToolbar from "@/components/writing-studio/toolbar/LinkButton.vue";
import MarksToolbar from "@/components/writing-studio/toolbar/Marks.vue";
import MathToolbar from "@/components/writing-studio/toolbar/Math.vue";
import StructureToolbar from "@/components/writing-studio/toolbar/Structure.vue";
import TableToolbar from "@/components/writing-studio/toolbar/Table.vue";
import TextStyleToolbar from "@/components/writing-studio/toolbar/TextStyle.vue";
import CodeBlockBubbleMenu from "@/components/writing-studio/bubble-menu/CodeBlock.vue";
import ImageNodeBubbleMenu from "@/components/writing-studio/bubble-menu/ImageNode.vue";
import LinkBubbleMenu from "@/components/writing-studio/bubble-menu/Link.vue";
import MathEditor from "@/components/writing-studio/bubble-menu/MathEditor.vue";
import SlashCommandBubbleMenu from "@/components/writing-studio/bubble-menu/SlashCommand.vue";
import TableColumnBubbleMenu from "@/components/writing-studio/bubble-menu/TableColumn.vue";
import TableSelectionBubbleMenu from "@/components/writing-studio/bubble-menu/TableSelection.vue";
import TableHoverControls from "@/components/writing-studio/table/HoverControls.vue";
import { Separator } from "@/components/ui/separator";
import { useWritingStudioDragHandle } from "~/composables/writing-studio/drag-handle/useDragHandle";
import {
  applyWritingStudioLinkState,
  getWritingStudioLinkDraftState,
  type WritingStudioActiveLinkState,
} from "~/composables/writing-studio/link/useLinkState";
import { useWritingStudioEditor } from "~/composables/writing-studio/editor/useEditor";

// 写作编辑器实例（tiptap）
const { editor } = useWritingStudioEditor();
// 段落拖拽手柄配置与拖拽开始处理
const { dragHandleNestedOptions, handleDragHandleStart } = useWritingStudioDragHandle();

// 链接编辑弹窗是否打开
const isLinkEditorOpen = ref(false);
// 链接地址输入值
const linkEditorHref = ref("https://");
// 链接文本输入值
const linkEditorText = ref("");
// 当前链接是否允许删除
const linkEditorCanRemove = ref(false);
// 待提交的链接选区范围
const pendingLinkRange = ref<Pick<WritingStudioActiveLinkState, "from" | "to"> | null>(null);
// 编辑器容器引用（供浮层定位等能力使用）
const editorSurfaceRef = ref<HTMLElement | null>(null);

// 打开链接编辑弹窗：优先使用传入状态，否则读取当前选区
const openLinkEditor = (linkState?: WritingStudioActiveLinkState | null) => {
  const draftState = linkState
    ? {
        ...linkState,
        canRemove: true,
      }
    : getWritingStudioLinkDraftState(editor.value);

  if (!draftState) {
    return;
  }

  pendingLinkRange.value = {
    from: draftState.from,
    to: draftState.to,
  };
  linkEditorHref.value = draftState.href || "https://";
  linkEditorText.value = draftState.text;
  linkEditorCanRemove.value = draftState.canRemove;
  isLinkEditorOpen.value = true;
};

// 关闭链接编辑弹窗并清理临时状态
const closeLinkEditor = () => {
  isLinkEditorOpen.value = false;
  pendingLinkRange.value = null;
  linkEditorCanRemove.value = false;
};

// 应用链接编辑结果
const saveLinkFromMenu = () => {
  const success = applyWritingStudioLinkState(
    editor.value,
    {
      href: linkEditorHref.value,
      text: linkEditorText.value,
    },
    pendingLinkRange.value,
  );

  if (!success) {
    return;
  }

  closeLinkEditor();
};

// 移除链接（保留文本）
const removeLinkFromMenu = () => {
  const success = applyWritingStudioLinkState(
    editor.value,
    {
      href: "",
      text: linkEditorText.value,
    },
    pendingLinkRange.value,
  );

  if (!success) {
    return;
  }

  closeLinkEditor();
};

</script>

<template>
  <section class="space-y-3 h-dvh">
    <div class="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-2 shadow-sm">
      <StructureToolbar :editor="editor" />

      <Separator orientation="vertical" class="mx-1 h-6" />

      <AlignmentToolbar :editor="editor" />

      <Separator orientation="vertical" class="mx-1 h-6" />

      <MarksToolbar :editor="editor" />

      <Separator orientation="vertical" class="mx-1 h-6" />

      <CodeToolbar :editor="editor" />

      <LinkButtonToolbar
        :editor="editor"
        :open-link-editor="() => openLinkEditor()"
      />

      <Separator orientation="vertical" class="mx-1 h-6" />

      <TextStyleToolbar :editor="editor" />

      <Separator orientation="vertical" class="mx-1 h-6" />

      <BlockToolbar :editor="editor" />

      <MathToolbar :editor="editor" />

      <InsertToolbar :editor="editor" />

      <ImageToolbar :editor="editor" />

      <TableToolbar :editor="editor" />
    </div>

    <ImageNodeBubbleMenu
      :editor="editor"
    />
    <LinkBubbleMenu
      :editor="editor"
      :is-editing="isLinkEditorOpen"
      :href="linkEditorHref"
      :text="linkEditorText"
      :can-remove="linkEditorCanRemove"
      @edit-link="openLinkEditor"
      @update:href="linkEditorHref = $event"
      @update:text="linkEditorText = $event"
      @save-link="saveLinkFromMenu"
      @cancel-link-edit="closeLinkEditor"
      @remove-link="removeLinkFromMenu"
    />
    <CodeBlockBubbleMenu
      :editor="editor"
    />
    <SlashCommandBubbleMenu :editor="editor" />
    <MathEditor />

    <div ref="editorSurfaceRef" class="relative rounded-lg border bg-background px-4 py-3 shadow-sm max-w-6xl mx-auto">
      <TableHoverControls :editor="editor" :container="editorSurfaceRef" />
      <TableColumnBubbleMenu :editor="editor" :container="editorSurfaceRef" />
      <TableSelectionBubbleMenu :editor="editor" :container="editorSurfaceRef" />
      <EditorContent :editor="editor" class="writing-editor" />
    </div>

    <DragHandle
      v-if="editor"
      :editor="editor"
      class="ws-drag-handle"
      :nested="dragHandleNestedOptions"
      :compute-position-config="{ placement: 'left-start' }"
      :on-element-drag-start="handleDragHandleStart"
    >
      <GripVertical class="ws-drag-handle-icon" :size="16" :stroke-width="2.5" aria-hidden="true" />
    </DragHandle>
  </section>
</template>

<style src="~/assets/css/writing-studio/index.css"></style>
