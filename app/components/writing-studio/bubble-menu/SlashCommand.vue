<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import type { EditorState } from "@tiptap/pm/state";
import type { Component } from "vue";
import { FloatingMenu } from "@tiptap/vue-3/menus";
import {
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  List,
  ListOrdered,
  ListTodo,
  Pilcrow,
  Table2,
} from "lucide-vue-next";
import { useWritingStudioBlockActions } from "~/composables/writing-studio/actions/useBlockActions";
import { useWritingStudioListActions } from "~/composables/writing-studio/actions/useListActions";
import { useWritingStudioOtherActions } from "~/composables/writing-studio/actions/useOtherActions";

type SlashMenuItem = {
  key: string;
  labelKey: string;
  icon: Component;
  keywords: string[];
  action: () => void;
};

type SlashMenuGroup = {
  key: string;
  labelKey: string;
  items: SlashMenuItem[];
};

type SlashCommandContext = {
  from: number;
  to: number;
  query: string;
};

const props = defineProps<{
  editor: Editor | null | undefined;
}>();

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const { setParagraph, toggleHeading } = useWritingStudioBlockActions(editorRef);
const { toggleBulletList, toggleOrderedList, toggleTaskList } = useWritingStudioListActions(editorRef);
const { insertImageUpload, insertTable } = useWritingStudioOtherActions(editorRef);
const slashQuery = ref("");

const resolveSlashCommandContext = (state?: EditorState | null): SlashCommandContext | null => {
  if (!state || !state.selection.empty) {
    return null;
  }

  const { $from } = state.selection;
  if ($from.depth !== 1 || $from.parent.type.name !== "paragraph") {
    return null;
  }

  const text = $from.parent.textContent;
  if (!text.startsWith("/")) {
    return null;
  }

  return {
    from: $from.start(),
    to: $from.end(),
    query: text.slice(1).trim().toLowerCase(),
  };
};

const syncSlashQuery = () => {
  slashQuery.value = resolveSlashCommandContext(props.editor?.state ?? null)?.query ?? "";
};

const detachEditorListeners = (editor?: Editor | null) => {
  editor?.off("selectionUpdate", syncSlashQuery);
  editor?.off("transaction", syncSlashQuery);
};

watch(() => props.editor, (editor, previousEditor) => {
  detachEditorListeners(previousEditor);
  editor?.on("selectionUpdate", syncSlashQuery);
  editor?.on("transaction", syncSlashQuery);
  syncSlashQuery();
}, {
  immediate: true,
});

onBeforeUnmount(() => {
  detachEditorListeners(props.editor);
});

const runSlashCommand = (action: () => void) => {
  const editor = props.editor;
  if (!editor) {
    return;
  }

  const context = resolveSlashCommandContext(editor.state);
  if (context) {
    editor.chain().focus().deleteRange({
      from: context.from,
      to: context.to,
    }).run();
  }

  action();
};

const slashMenuGroups = computed<SlashMenuGroup[]>(() => [
  {
    key: "paragraph-heading",
    labelKey: "writingStudio.toolbar.groups.paragraphHeading",
    items: [
      {
        key: "paragraph",
        labelKey: "writingStudio.toolbar.block.paragraph",
        icon: Pilcrow,
        keywords: ["paragraph", "text", "正文", "段落"],
        action: () => runSlashCommand(setParagraph),
      },
      {
        key: "heading-1",
        labelKey: "writingStudio.toolbar.block.heading1",
        icon: Heading1,
        keywords: ["heading", "title", "h1", "一级标题", "标题"],
        action: () => runSlashCommand(() => toggleHeading(1)),
      },
      {
        key: "heading-2",
        labelKey: "writingStudio.toolbar.block.heading2",
        icon: Heading2,
        keywords: ["heading", "title", "h2", "二级标题", "标题"],
        action: () => runSlashCommand(() => toggleHeading(2)),
      },
      {
        key: "heading-3",
        labelKey: "writingStudio.toolbar.block.heading3",
        icon: Heading3,
        keywords: ["heading", "title", "h3", "三级标题", "标题"],
        action: () => runSlashCommand(() => toggleHeading(3)),
      },
    ],
  },
  {
    key: "list",
    labelKey: "writingStudio.toolbar.groups.listNodes",
    items: [
      {
        key: "bullet-list",
        labelKey: "writingStudio.toolbar.block.bulletList",
        icon: List,
        keywords: ["list", "bullet", "unordered", "无序列表", "列表"],
        action: () => runSlashCommand(toggleBulletList),
      },
      {
        key: "ordered-list",
        labelKey: "writingStudio.toolbar.block.orderedList",
        icon: ListOrdered,
        keywords: ["list", "ordered", "numbered", "有序列表", "列表"],
        action: () => runSlashCommand(toggleOrderedList),
      },
      {
        key: "task-list",
        labelKey: "writingStudio.toolbar.block.taskList",
        icon: ListTodo,
        keywords: ["list", "task", "todo", "任务列表", "列表"],
        action: () => runSlashCommand(toggleTaskList),
      },
    ],
  },
  {
    key: "table",
    labelKey: "writingStudio.toolbar.groups.tableNodes",
    items: [
      {
        key: "table",
        labelKey: "writingStudio.toolbar.table.insert3x3",
        icon: Table2,
        keywords: ["table", "grid", "表格"],
        action: () => runSlashCommand(insertTable),
      },
    ],
  },
  {
    key: "image",
    labelKey: "writingStudio.toolbar.groups.imageNodes",
    items: [
      {
        key: "image-upload",
        labelKey: "writingStudio.toolbar.image.upload",
        icon: ImagePlus,
        keywords: ["image", "photo", "picture", "upload", "图片", "上传"],
        action: () => runSlashCommand(insertImageUpload),
      },
    ],
  },
]);

const visibleSlashMenuGroups = computed(() => {
  const normalizedQuery = slashQuery.value.trim().toLowerCase();
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return slashMenuGroups.value
    .map((group) => {
      const items = group.items.filter((item) => {
        if (tokens.length === 0) {
          return true;
        }

        const haystack = [
          t(group.labelKey),
          t(item.labelKey),
          ...item.keywords,
        ].join(" ").toLowerCase();

        return tokens.every(token => haystack.includes(token));
      });

      return {
        ...group,
        items,
      };
    })
    .filter(group => group.items.length > 0);
});

const shouldShowSlashMenu = ({ state }: { state: EditorState }) => {
  return Boolean(resolveSlashCommandContext(state));
};
</script>

<template>
  <FloatingMenu
    v-if="editor"
    :editor="editor"
    plugin-key="writingStudioSlashCommand"
    :options="{
      placement: 'bottom-start',
      offset: 8,
      shift: true,
    }"
    :should-show="shouldShowSlashMenu"
    class="ws-slash-command-menu"
  >
    <div
      class="overflow-hidden rounded-xl border bg-popover shadow-lg"
      @mousedown.prevent
    >
      <div v-if="visibleSlashMenuGroups.length === 0" class="ws-slash-command-empty">
        {{ t("writingStudio.toolbar.slash.empty") }}
      </div>

      <div v-else class="max-h-[22rem] overflow-y-auto p-1">
        <div
          v-for="group in visibleSlashMenuGroups"
          :key="group.key"
          class="py-1"
        >
          <div class="px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {{ t(group.labelKey) }}
          </div>

          <button
            v-for="item in group.items"
            :key="item.key"
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
            @click="item.action"
          >
            <span class="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <component :is="item.icon" class="h-4 w-4" />
            </span>
            <span class="min-w-0 text-sm">
              {{ t(item.labelKey) }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </FloatingMenu>
</template>
