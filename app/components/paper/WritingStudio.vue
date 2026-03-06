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
import WritingStudioCodeToolbar from "@/components/paper/WritingStudioCodeToolbar.vue";
import WritingStudioCodeBlockBubbleMenu from "@/components/paper/WritingStudioCodeBlockBubbleMenu.vue";
import WritingStudioImageGroup from "@/components/paper/WritingStudioImageGroup.vue";
import WritingStudioImageNodeBubbleMenu from "@/components/paper/WritingStudioImageNodeBubbleMenu.vue";
import WritingStudioLinkBubbleMenu from "@/components/paper/WritingStudioLinkBubbleMenu.vue";
import WritingStudioTableColumnBubbleMenu from "@/components/paper/WritingStudioTableColumnBubbleMenu.vue";
import WritingStudioTableHoverControls from "@/components/paper/WritingStudioTableHoverControls.vue";
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
import { useWritingStudioDragHandle } from "~/composables/writing/studio/useWritingStudioDragHandle";
import {
  applyWritingStudioLinkState,
  getWritingStudioLinkDraftState,
  type WritingStudioActiveLinkState,
} from "~/composables/writing/studio/useWritingStudioLinkState";
import { useWritingStudioToolbarActions } from "~/composables/writing/studio/useWritingStudioToolbarActions";
import { useWritingStudioToolbarState } from "~/composables/writing/studio/useWritingStudioToolbarState";
import { useTipTapEditor } from "~/composables/writing/useTipTapEditor";

const { t } = useI18n();
const { editor } = useTipTapEditor();
const {
  toolbarButtonClass,
  dropdownItemClass,
  isMarkActive,
  isNodeActive,
  canRun,
} = useWritingStudioToolbarState(editor);
const { dragHandleNestedOptions, handleDragHandleStart } = useWritingStudioDragHandle();
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

type ParagraphHeadingValue =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "heading6";

type ListTypeValue = "bulletList" | "orderedList" | "taskList";
type TextAlignValue = "left" | "center" | "right" | "justify";

const isLinkEditorOpen = ref(false);
const linkEditorHref = ref("https://");
const linkEditorText = ref("");
const linkEditorCanRemove = ref(false);
const pendingLinkRange = ref<Pick<WritingStudioActiveLinkState, "from" | "to"> | null>(null);
const editorSurfaceRef = ref<HTMLElement | null>(null);

const headingLevelMap: Record<Exclude<ParagraphHeadingValue, "paragraph">, 1 | 2 | 3 | 4 | 5 | 6> = {
  heading1: 1,
  heading2: 2,
  heading3: 3,
  heading4: 4,
  heading5: 5,
  heading6: 6,
};

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

const closeLinkEditor = () => {
  isLinkEditorOpen.value = false;
  pendingLinkRange.value = null;
  linkEditorCanRemove.value = false;
};

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

      <WritingStudioCodeToolbar
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
            {{ t("writingStudio.toolbar.groups.insertNodes") }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-60">
          <DropdownMenuLabel>{{ t("writingStudio.toolbar.labels.mediaInline") }}</DropdownMenuLabel>
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

      <WritingStudioImageGroup
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

    <WritingStudioImageNodeBubbleMenu
      :editor="editor"
      :toolbar-button-class="toolbarButtonClass"
      :set-image-align="setImageAlign"
    />
    <WritingStudioLinkBubbleMenu
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
    <WritingStudioCodeBlockBubbleMenu
      :editor="editor"
      :set-code-block-language="setCodeBlockLanguage"
      :set-code-block-wrap="setCodeBlockWrap"
    />

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
    <div ref="editorSurfaceRef" class="relative rounded-lg border bg-background px-4 py-3 shadow-sm max-w-6xl mx-auto">
      <WritingStudioTableHoverControls :editor="editor" :container="editorSurfaceRef" />
      <WritingStudioTableColumnBubbleMenu :editor="editor" :container="editorSurfaceRef" />
      <EditorContent :editor="editor" class="writing-editor" />
    </div>
  </section>
</template>

<style src="~/assets/css/writing-studio/index.css"></style>
