<script lang="ts" setup>
import { EditorContent } from "@tiptap/vue-3";
import {
  Bold,
  Code2,
  Highlighter,
  Italic,
  Link2,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Type,
  Underline as UnderlineIcon,
} from "lucide-vue-next";
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
const {
  toggleBold,
  toggleCode,
  toggleHighlight,
  toggleItalic,
  toggleLink,
  toggleTextStyle,
  toggleStrike,
  toggleSubscript,
  toggleSuperscript,
  toggleUnderline,
  setParagraph,
  toggleHeading,
  toggleBlockquote,
  toggleBulletList,
  toggleOrderedList,
  toggleTaskList,
  toggleCodeBlock,
  toggleDetails,
  setHardBreak,
  setHorizontalRule,
  insertImage,
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
</script>

<template>
  <section class="space-y-3">
    <div class="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-2 shadow-sm">
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
        :class="toolbarButtonClass(isMarkActive('code'))"
        @click="toggleCode"
      >
        <Code2 />
        {{ t("writingStudio.toolbar.marks.code") }}
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
        :class="toolbarButtonClass(isMarkActive('link'))"
        @click="toggleLink"
      >
        <Link2 />
        {{ t("writingStudio.toolbar.marks.link") }}
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
            :class="dropdownItemClass(isNodeActive('paragraph'))"
            @select.prevent="setParagraph"
          >
            {{ t("writingStudio.toolbar.block.paragraph") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :class="dropdownItemClass(isNodeActive('heading', { level: 1 }))"
            @select.prevent="toggleHeading(1)"
          >
            {{ t("writingStudio.toolbar.block.heading1") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :class="dropdownItemClass(isNodeActive('heading', { level: 2 }))"
            @select.prevent="toggleHeading(2)"
          >
            {{ t("writingStudio.toolbar.block.heading2") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :class="dropdownItemClass(isNodeActive('heading', { level: 3 }))"
            @select.prevent="toggleHeading(3)"
          >
            {{ t("writingStudio.toolbar.block.heading3") }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            :class="dropdownItemClass(isNodeActive('blockquote'))"
            @select.prevent="toggleBlockquote"
          >
            {{ t("writingStudio.toolbar.block.blockquote") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :class="dropdownItemClass(isNodeActive('bulletList'))"
            @select.prevent="toggleBulletList"
          >
            {{ t("writingStudio.toolbar.block.bulletList") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :class="dropdownItemClass(isNodeActive('orderedList'))"
            @select.prevent="toggleOrderedList"
          >
            {{ t("writingStudio.toolbar.block.orderedList") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :class="dropdownItemClass(isNodeActive('taskList'))"
            @select.prevent="toggleTaskList"
          >
            {{ t("writingStudio.toolbar.block.taskList") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            :class="dropdownItemClass(isNodeActive('codeBlock'))"
            @select.prevent="toggleCodeBlock"
          >
            {{ t("writingStudio.toolbar.block.codeBlock") }}
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
          <DropdownMenuItem @select.prevent="insertImage">
            {{ t("writingStudio.toolbar.insert.image") }}
          </DropdownMenuItem>
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

    <div class="rounded-lg border bg-background px-4 py-3 shadow-sm">
      <EditorContent :editor="editor" class="writing-editor" />
    </div>
  </section>
</template>

<style scoped>
.writing-editor :deep(.tiptap) {
  min-height: 320px;
  outline: none;
  line-height: 1.7;
}

.writing-editor :deep(.tiptap p) {
  margin: 0.6rem 0;
}

.writing-editor :deep(.tiptap h1, .tiptap h2, .tiptap h3, .tiptap h4, .tiptap h5, .tiptap h6) {
  margin: 0.8rem 0 0.5rem;
  line-height: 1.3;
  font-weight: 700;
}

.writing-editor :deep(.tiptap h1) {
  font-size: 2rem;
}

.writing-editor :deep(.tiptap h2) {
  font-size: 1.625rem;
}

.writing-editor :deep(.tiptap h3) {
  font-size: 1.375rem;
}

.writing-editor :deep(.tiptap h4) {
  font-size: 1.25rem;
}

.writing-editor :deep(.tiptap h5) {
  font-size: 1.125rem;
}

.writing-editor :deep(.tiptap h6) {
  font-size: 1rem;
}

.writing-editor :deep(.tiptap blockquote) {
  margin: 0.8rem 0;
  padding-left: 0.8rem;
  border-left: 3px solid hsl(var(--border));
  color: hsl(var(--muted-foreground));
}

.writing-editor :deep(.tiptap pre) {
  margin: 0.8rem 0;
  padding: 0.75rem 0.9rem;
  border-radius: 0.5rem;
  background: hsl(var(--secondary));
  overflow-x: auto;
}

.writing-editor :deep(.tiptap .ws-text-style) {
  font-family: "JetBrains Mono", monospace;
  letter-spacing: 0.02em;
  border-bottom: 1px dotted currentColor;
}

.writing-editor :deep(.tiptap .ws-mention) {
  padding: 0.1rem 0.35rem;
  border-radius: 9999px;
  background: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
}

.writing-editor :deep(.tiptap .ws-emoji) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.writing-editor :deep(.tiptap .ws-media) {
  display: block;
  max-width: 100%;
  margin: 0.8rem 0;
}

.writing-editor :deep(.tiptap .tableWrapper) {
  margin: 0.8rem 0;
  overflow-x: auto;
}

.writing-editor :deep(.tiptap table) {
  width: 100%;
  border-collapse: collapse;
}

.writing-editor :deep(.tiptap th, .tiptap td) {
  min-width: 90px;
  border: 1px solid hsl(var(--border));
  padding: 0.35rem 0.5rem;
}

.writing-editor :deep(.tiptap th) {
  background: hsl(var(--muted));
}

.writing-editor :deep(.tiptap ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 0.4rem;
}

.writing-editor :deep(.tiptap li[data-type="taskItem"]) {
  display: flex;
  gap: 0.45rem;
  align-items: flex-start;
}

.writing-editor :deep(.tiptap li[data-type="taskItem"] > label) {
  margin-top: 0.2rem;
}

.writing-editor :deep(.tiptap .ws-details) {
  margin: 0.8rem 0;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
}
</style>
