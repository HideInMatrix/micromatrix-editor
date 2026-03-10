<script lang="ts" setup>
import { EditorContent } from "@tiptap/vue-3";
import { DragHandle } from "@tiptap/extension-drag-handle-vue-3";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  Link2,
  GripVertical,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Type,
  Underline as UnderlineIcon,
} from "lucide-vue-next";
import CodeToolbar from "@/components/writing-studio/toolbar/Code.vue";
import CodeBlockBubbleMenu from "@/components/writing-studio/bubble-menu/CodeBlock.vue";
import ImageGroup from "@/components/writing-studio/image/Group.vue";
import ImageNodeBubbleMenu from "@/components/writing-studio/bubble-menu/ImageNode.vue";
import LinkBubbleMenu from "@/components/writing-studio/bubble-menu/Link.vue";
import MathEditor from "@/components/writing-studio/bubble-menu/MathEditor.vue";
import TableColumnBubbleMenu from "@/components/writing-studio/bubble-menu/TableColumn.vue";
import TableSelectionBubbleMenu from "@/components/writing-studio/bubble-menu/TableSelection.vue";
import TableHoverControls from "@/components/writing-studio/table/HoverControls.vue";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWritingStudioDragHandle } from "~/composables/writing-studio/drag-handle/useDragHandle";
import {
  applyWritingStudioLinkState,
  getWritingStudioLinkDraftState,
  type WritingStudioActiveLinkState,
} from "~/composables/writing-studio/link/useLinkState";
import { useWritingStudioToolbarActions } from "~/composables/writing-studio/toolbar/useActions";
import { useWritingStudioToolbarState } from "~/composables/writing-studio/toolbar/useState";
import { useWritingStudioEditor } from "~/composables/writing-studio/editor/useEditor";

const { t } = useI18n();
// 写作编辑器实例（tiptap）
const { editor } = useWritingStudioEditor();
// 工具栏状态：按钮样式、激活态与可执行能力判断
const {
  toolbarButtonClass,
  dropdownItemClass,
  isMarkActive,
  isNodeActive,
  canRun,
} = useWritingStudioToolbarState(editor);
// 段落拖拽手柄配置与拖拽开始处理
const { dragHandleNestedOptions, handleDragHandleStart } = useWritingStudioDragHandle();
// 工具栏动作：对编辑器命令的统一封装
const {
  toggleBold,
  toggleCode,
  toggleHighlight,
  toggleItalic,
  toggleTextStyle,
  toggleStrike,
  toggleSubscript,
  toggleSuperscript,
  toggleUnderline,
  setImageAlign,
  setTextAlign,
  setParagraph,
  toggleHeading,
  toggleBlockquote,
  toggleBulletList,
  toggleOrderedList,
  toggleTaskList,
  toggleCodeBlock,
  setCodeBlockLanguage,
  setCodeBlockWrap,
  toggleDetails,
  setHardBreak,
  setHorizontalRule,
  insertImageByUrl,
  insertImageUpload,
  insertAudio,
  insertYoutube,
  insertTwitch,
  insertInlineMath,
  insertBlockMath,
  insertEmoji,
  insertMention,
  insertTable,
  addColumnBefore,
  addColumnAfter,
  deleteColumn,
  addRowBefore,
  addRowAfter,
  deleteRow,
  toggleHeaderRow,
  toggleHeaderColumn,
  mergeOrSplitCells,
  deleteTable,
} = useWritingStudioToolbarActions(editor);

// 段落/标题下拉框可选值
type ParagraphHeadingValue =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "heading6";

// 列表下拉框可选值
type ListTypeValue = "bulletList" | "orderedList" | "taskList";
// 文本对齐可选值
type TextAlignValue = "left" | "center" | "right" | "justify";

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

// 标题选项值到 tiptap level 的映射
const headingLevelMap: Record<Exclude<ParagraphHeadingValue, "paragraph">, 1 | 2 | 3 | 4 | 5 | 6> = {
  heading1: 1,
  heading2: 2,
  heading3: 3,
  heading4: 4,
  heading5: 5,
  heading6: 6,
};

// 读取当前块类型，用于段落/标题下拉框回显
const currentParagraphHeading = (): ParagraphHeadingValue => {
  if (isNodeActive("heading", { level: 1 })) {
    return "heading1";
  }
  if (isNodeActive("heading", { level: 2 })) {
    return "heading2";
  }
  if (isNodeActive("heading", { level: 3 })) {
    return "heading3";
  }
  if (isNodeActive("heading", { level: 4 })) {
    return "heading4";
  }
  if (isNodeActive("heading", { level: 5 })) {
    return "heading5";
  }
  if (isNodeActive("heading", { level: 6 })) {
    return "heading6";
  }

  return "paragraph";
};

// 根据下拉值切换段落或标题级别
const handleParagraphHeadingChange = (value: unknown) => {
  if (typeof value !== "string") {
    return;
  }

  if (value === "paragraph") {
    setParagraph();
    return;
  }

  if (value in headingLevelMap) {
    toggleHeading(headingLevelMap[value as keyof typeof headingLevelMap]);
  }
};

// 读取当前列表类型，用于列表下拉框回显
const currentListType = (): ListTypeValue | undefined => {
  if (isNodeActive("bulletList")) {
    return "bulletList";
  }
  if (isNodeActive("orderedList")) {
    return "orderedList";
  }
  if (isNodeActive("taskList")) {
    return "taskList";
  }

  return undefined;
};

// 根据下拉值切换列表类型
const handleListTypeChange = (value: unknown) => {
  if (value === "bulletList") {
    toggleBulletList();
    return;
  }
  if (value === "orderedList") {
    toggleOrderedList();
    return;
  }
  if (value === "taskList") {
    toggleTaskList();
  }
};

// 读取当前对齐方式（优先 heading，其次 paragraph）
const currentTextAlign = (): TextAlignValue => {
  const paragraphAlign = editor.value?.getAttributes("paragraph").textAlign;
  const headingAlign = editor.value?.getAttributes("heading").textAlign;
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
      <Select
        :model-value="currentParagraphHeading()"
        :disabled="!editor"
        @update:model-value="handleParagraphHeadingChange"
      >
        <SelectTrigger class="h-8 w-[6rem] px-2 text-xs">
          <SelectValue :placeholder="t('writingStudio.toolbar.groups.paragraphHeading')" />
        </SelectTrigger>
        <SelectContent align="start" class="w-[220px]">
          <SelectItem value="paragraph">
            {{ t("writingStudio.toolbar.block.paragraph") }}
          </SelectItem>
          <SelectItem value="heading1">
            {{ t("writingStudio.toolbar.block.heading1") }}
          </SelectItem>
          <SelectItem value="heading2">
            {{ t("writingStudio.toolbar.block.heading2") }}
          </SelectItem>
          <SelectItem value="heading3">
            {{ t("writingStudio.toolbar.block.heading3") }}
          </SelectItem>
          <SelectItem value="heading4">
            {{ t("writingStudio.toolbar.block.heading4") }}
          </SelectItem>
          <SelectItem value="heading5">
            {{ t("writingStudio.toolbar.block.heading5") }}
          </SelectItem>
          <SelectItem value="heading6">
            {{ t("writingStudio.toolbar.block.heading6") }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select
        :model-value="currentListType()"
        :disabled="!editor"
        @update:model-value="handleListTypeChange"
      >
        <SelectTrigger class="h-8 w-[6rem] px-2 text-xs">
          <SelectValue :placeholder="t('writingStudio.toolbar.groups.listNodes')" />
        </SelectTrigger>
        <SelectContent align="start" class="w-[200px]">
          <SelectItem value="bulletList">
            {{ t("writingStudio.toolbar.block.bulletList") }}
          </SelectItem>
          <SelectItem value="orderedList">
            {{ t("writingStudio.toolbar.block.orderedList") }}
          </SelectItem>
          <SelectItem value="taskList">
            {{ t("writingStudio.toolbar.block.taskList") }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Separator orientation="vertical" class="mx-1 h-6" />

      <Button
        variant="ghost"
        size="sm"
        :disabled="!editor || !canRun((current) => current.can().setTextAlign('left'))"
        :class="toolbarButtonClass(currentTextAlign() === 'left')"
        @click="setTextAlign('left')"
      >
        <AlignLeft />
        {{ t("writingStudio.toolbar.align.left") }}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        :disabled="!editor || !canRun((current) => current.can().setTextAlign('center'))"
        :class="toolbarButtonClass(currentTextAlign() === 'center')"
        @click="setTextAlign('center')"
      >
        <AlignCenter />
        {{ t("writingStudio.toolbar.align.center") }}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        :disabled="!editor || !canRun((current) => current.can().setTextAlign('right'))"
        :class="toolbarButtonClass(currentTextAlign() === 'right')"
        @click="setTextAlign('right')"
      >
        <AlignRight />
        {{ t("writingStudio.toolbar.align.right") }}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        :disabled="!editor || !canRun((current) => current.can().setTextAlign('justify'))"
        :class="toolbarButtonClass(currentTextAlign() === 'justify')"
        @click="setTextAlign('justify')"
      >
        <AlignJustify />
        {{ t("writingStudio.toolbar.align.justify") }}
      </Button>

      <Separator orientation="vertical" class="mx-1 h-6" />

      <Button
        variant="ghost"
        size="sm"
        :disabled="!editor"
        :class="toolbarButtonClass(isMarkActive('bold'))"
        @click="toggleBold"
      >
        <Bold />
        {{ t("writingStudio.toolbar.marks.bold") }}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        :disabled="!editor"
        :class="toolbarButtonClass(isMarkActive('highlight'))"
        @click="toggleHighlight"
      >
        <Highlighter />
        {{ t("writingStudio.toolbar.marks.highlight") }}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        :disabled="!editor"
        :class="toolbarButtonClass(isMarkActive('italic'))"
        @click="toggleItalic"
      >
        <Italic />
        {{ t("writingStudio.toolbar.marks.italic") }}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        :disabled="!editor"
        :class="toolbarButtonClass(isMarkActive('strike'))"
        @click="toggleStrike"
      >
        <Strikethrough />
        {{ t("writingStudio.toolbar.marks.strike") }}
      </Button>

      <Separator orientation="vertical" class="mx-1 h-6" />

      <CodeToolbar
        :disabled="!editor"
        :is-code-active="isMarkActive('code')"
        :is-code-block-active="isNodeActive('codeBlock')"
        :dropdown-item-class="dropdownItemClass"
        @toggle-code="toggleCode"
        @toggle-code-block="toggleCodeBlock"
      />

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

      <Separator orientation="vertical" class="mx-1 h-6" />

      <Button
        variant="ghost"
        size="sm"
        :disabled="!editor"
        :class="toolbarButtonClass(isMarkActive('subscript'))"
        @click="toggleSubscript"
      >
        <SubscriptIcon />
        {{ t("writingStudio.toolbar.marks.subscript") }}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        :disabled="!editor"
        :class="toolbarButtonClass(isMarkActive('superscript'))"
        @click="toggleSuperscript"
      >
        <SuperscriptIcon />
        {{ t("writingStudio.toolbar.marks.superscript") }}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        :disabled="!editor"
        :class="toolbarButtonClass(isMarkActive('textStyle'))"
        @click="toggleTextStyle"
      >
        <Type />
        {{ t("writingStudio.toolbar.marks.textStyle") }}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        :disabled="!editor"
        :class="toolbarButtonClass(isMarkActive('underline'))"
        @click="toggleUnderline"
      >
        <UnderlineIcon />
        {{ t("writingStudio.toolbar.marks.underline") }}
      </Button>

      <Separator orientation="vertical" class="mx-1 h-6" />

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" :disabled="!editor" class="h-8 px-2 text-xs">
            {{ t("writingStudio.toolbar.groups.blockNodes") }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-60">
          <DropdownMenuLabel>{{ t("writingStudio.toolbar.labels.nodeBlocks") }}</DropdownMenuLabel>
          <DropdownMenuItem
            :class="dropdownItemClass(isNodeActive('blockquote'))"
            @select.prevent="toggleBlockquote"
          >
            {{ t("writingStudio.toolbar.block.blockquote") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :class="dropdownItemClass(isNodeActive('details'))"
            @select.prevent="toggleDetails"
          >
            {{ t("writingStudio.toolbar.block.details") }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @select.prevent="setHardBreak">
            {{ t("writingStudio.toolbar.block.hardBreak") }}
          </DropdownMenuItem>
          <DropdownMenuItem @select.prevent="setHorizontalRule">
            {{ t("writingStudio.toolbar.block.horizontalRule") }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" :disabled="!editor" class="h-8 px-2 text-xs">
            {{ t("writingStudio.toolbar.groups.mathNodes") }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-60">
          <DropdownMenuLabel>{{ t("writingStudio.toolbar.labels.mathActions") }}</DropdownMenuLabel>
          <DropdownMenuItem @select.prevent="insertInlineMath">
            {{ t("writingStudio.toolbar.insert.inlineMath") }}
          </DropdownMenuItem>
          <DropdownMenuItem @select.prevent="insertBlockMath">
            {{ t("writingStudio.toolbar.insert.blockMath") }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" :disabled="!editor" class="h-8 px-2 text-xs">
            {{ t("writingStudio.toolbar.groups.insertNodes") }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-60">
          <DropdownMenuLabel>{{ t("writingStudio.toolbar.labels.mediaInline") }}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem @select.prevent="insertAudio">
            {{ t("writingStudio.toolbar.insert.audio") }}
          </DropdownMenuItem>
          <DropdownMenuItem @select.prevent="insertYoutube">
            {{ t("writingStudio.toolbar.insert.youtube") }}
          </DropdownMenuItem>
          <DropdownMenuItem @select.prevent="insertTwitch">
            {{ t("writingStudio.toolbar.insert.twitch") }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @select.prevent="insertEmoji">
            {{ t("writingStudio.toolbar.insert.emoji") }}
          </DropdownMenuItem>
          <DropdownMenuItem @select.prevent="insertMention">
            {{ t("writingStudio.toolbar.insert.mention") }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ImageGroup
        :disabled="!editor"
        @insert-upload="insertImageUpload"
        @insert-link="insertImageByUrl"
      />

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" :disabled="!editor" class="h-8 px-2 text-xs">
            {{ t("writingStudio.toolbar.groups.tableNodes") }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-64">
          <DropdownMenuLabel>{{ t("writingStudio.toolbar.labels.tableActions") }}</DropdownMenuLabel>
          <DropdownMenuItem @select.prevent="insertTable">
            {{ t("writingStudio.toolbar.table.insert3x3") }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            :disabled="!canRun((current) => current.can().addColumnBefore())"
            @select.prevent="addColumnBefore"
          >
            {{ t("writingStudio.toolbar.table.addColumnBefore") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :disabled="!canRun((current) => current.can().addColumnAfter())"
            @select.prevent="addColumnAfter"
          >
            {{ t("writingStudio.toolbar.table.addColumnAfter") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :disabled="!canRun((current) => current.can().deleteColumn())"
            @select.prevent="deleteColumn"
          >
            {{ t("writingStudio.toolbar.table.deleteColumn") }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            :disabled="!canRun((current) => current.can().addRowBefore())"
            @select.prevent="addRowBefore"
          >
            {{ t("writingStudio.toolbar.table.addRowBefore") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :disabled="!canRun((current) => current.can().addRowAfter())"
            @select.prevent="addRowAfter"
          >
            {{ t("writingStudio.toolbar.table.addRowAfter") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :disabled="!canRun((current) => current.can().deleteRow())"
            @select.prevent="deleteRow"
          >
            {{ t("writingStudio.toolbar.table.deleteRow") }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            :disabled="!canRun((current) => current.can().toggleHeaderRow())"
            @select.prevent="toggleHeaderRow"
          >
            {{ t("writingStudio.toolbar.table.toggleHeaderRow") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :disabled="!canRun((current) => current.can().toggleHeaderColumn())"
            @select.prevent="toggleHeaderColumn"
          >
            {{ t("writingStudio.toolbar.table.toggleHeaderColumn") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :disabled="!canRun((current) => current.can().mergeOrSplit())"
            @select.prevent="mergeOrSplitCells"
          >
            {{ t("writingStudio.toolbar.table.mergeSplitCells") }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            :disabled="!canRun((current) => current.can().deleteTable())"
            @select.prevent="deleteTable"
          >
            {{ t("writingStudio.toolbar.table.deleteTable") }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <ImageNodeBubbleMenu
      :editor="editor"
      :toolbar-button-class="toolbarButtonClass"
      :set-image-align="setImageAlign"
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
      :set-code-block-language="setCodeBlockLanguage"
      :set-code-block-wrap="setCodeBlockWrap"
    />
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
