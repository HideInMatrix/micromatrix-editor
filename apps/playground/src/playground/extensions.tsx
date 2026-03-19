import { Extension, type AnyExtension, type Editor } from "@mxm-editor/core";
import {
  Callout,
} from "@mxm-editor/extension-callout";
import { CharacterCount } from "@mxm-editor/extension-character-count";
import { Collaboration } from "@mxm-editor/extension-collaboration";
import { CollaborationCaret } from "@mxm-editor/extension-collaboration-caret";
import { Color } from "@mxm-editor/extension-color";
import { DragHandle } from "@mxm-editor/extension-drag-handle";
import { Highlight } from "@mxm-editor/extension-highlight";
import { Image } from "@mxm-editor/extension-image";
import { ListKeymap } from "@mxm-editor/extension-list-keymap";
import { Mathematics } from "@mxm-editor/extension-mathematics";
import {
  Mention,
  type MentionItem,
} from "@mxm-editor/extension-mention";
import { Placeholder } from "@mxm-editor/extension-placeholder";
import { Subscript } from "@mxm-editor/extension-subscript";
import { Superscript } from "@mxm-editor/extension-superscript";
import { Table } from "@mxm-editor/extension-table";
import { TaskItem } from "@mxm-editor/extension-task-item";
import { TaskList } from "@mxm-editor/extension-task-list";
import { TextAlign } from "@mxm-editor/extension-text-align";
import { TextStyle } from "@mxm-editor/extension-text-style";
import { Typography } from "@mxm-editor/extension-typography";
import { Markdown, MarkdownManager } from "@mxm-editor/markdown";
import { PluginKey, type EditorView } from "@mxm-editor/pm";
import {
  Suggestion,
  exitSuggestion,
  type SuggestionProps,
} from "@mxm-editor/suggestion";
import { StarterKit } from "@mxm-editor/starter-kit";
import type { Awareness } from "y-protocols/awareness";
import type { Doc } from "yjs";
import {
  mentionDirectory,
  sampleImageUrl,
} from "./constants";

const mentionPluginKey = new PluginKey("mention");
const slashPluginKey = new PluginKey("slash-command");

export interface PlaygroundCollaborationPeer {
  document: Doc;
  awareness: Awareness;
  user: {
    name: string;
    color: string;
  };
}

interface PlaygroundExtensionOptions {
  collaborative?: boolean;
  peer?: PlaygroundCollaborationPeer;
  interactive?: boolean;
}

interface SlashItem {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  execute: (editor: Editor) => void;
}

function filterMentionItems(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return mentionDirectory.slice(0, 5);
  }

  return mentionDirectory
    .filter((item) => item.label.toLowerCase().includes(normalizedQuery))
    .slice(0, 5);
}

function createMentionRenderer() {
  let popup: HTMLDivElement | null = null;
  let currentProps: SuggestionProps<MentionItem, MentionItem> | null = null;
  let selectedIndex = 0;

  const ensurePopup = () => {
    if (!popup) {
      popup = document.createElement("div");
      popup.className = "mention-palette";
      document.body.appendChild(popup);
    }

    return popup;
  };

  const paint = (props: SuggestionProps<MentionItem, MentionItem>) => {
    currentProps = props;

    const element = ensurePopup();
    const rect = props.clientRect?.();

    if (rect) {
      element.style.top = `${rect.bottom + window.scrollY + 10}px`;
      element.style.left = `${rect.left + window.scrollX}px`;
    }

    element.replaceChildren();

    if (!props.items.length) {
      const emptyState = document.createElement("div");

      emptyState.className = "mention-empty";
      emptyState.textContent = "没有匹配成员";
      element.appendChild(emptyState);
      return;
    }

    props.items.forEach((item, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = `mention-item ${
        index === selectedIndex ? "is-active" : ""
      }`;
      button.textContent = `@${item.label}`;
      button.onmousedown = (event) => {
        event.preventDefault();
      };
      button.onclick = () => {
        props.command(item);
      };

      element.appendChild(button);
    });
  };

  const move = (delta: number) => {
    if (!currentProps?.items.length) {
      return;
    }

    selectedIndex =
      (
        selectedIndex
        + delta
        + currentProps.items.length
      )
      % currentProps.items.length;

    paint(currentProps);
  };

  return {
    onStart(props: SuggestionProps<MentionItem, MentionItem>) {
      selectedIndex = 0;
      paint(props);
    },
    onUpdate(props: SuggestionProps<MentionItem, MentionItem>) {
      selectedIndex = Math.min(
        selectedIndex,
        Math.max(props.items.length - 1, 0),
      );
      paint(props);
    },
    onKeyDown({
      event,
      view,
    }: {
      event: KeyboardEvent;
      view: EditorView;
    }) {
      if (!currentProps) {
        return false;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        move(1);
        return true;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        move(-1);
        return true;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        currentProps.items[selectedIndex] && currentProps.command(
          currentProps.items[selectedIndex],
        );
        return true;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        exitSuggestion(view, mentionPluginKey);
        return true;
      }

      return false;
    },
    onExit() {
      popup?.remove();
      popup = null;
      currentProps = null;
      selectedIndex = 0;
    },
  };
}

const slashItems: SlashItem[] = [
  {
    id: "heading-1",
    label: "一级标题",
    description: "把当前段落转换成一级标题",
    keywords: ["h1", "title", "heading", "标题"],
    execute: (editor) => {
      editor.commands.setHeading({ level: 1 });
    },
  },
  {
    id: "heading-2",
    label: "二级标题",
    description: "把当前段落转换成二级标题",
    keywords: ["h2", "subtitle", "heading", "标题"],
    execute: (editor) => {
      editor.commands.setHeading({ level: 2 });
    },
  },
  {
    id: "paragraph",
    label: "段落",
    description: "恢复为普通段落",
    keywords: ["text", "paragraph", "body", "正文", "段落"],
    execute: (editor) => {
      editor.commands.setParagraph();
    },
  },
  {
    id: "quote",
    label: "引用",
    description: "包裹当前块级内容为引用",
    keywords: ["quote", "blockquote", "cite", "引用"],
    execute: (editor) => {
      editor.commands.toggleBlockquote();
    },
  },
  {
    id: "bullet-list",
    label: "无序列表",
    description: "把当前块转换为无序列表",
    keywords: ["bullet", "list", "ul", "列表", "无序"],
    execute: (editor) => {
      editor.commands.toggleBulletList();
    },
  },
  {
    id: "ordered-list",
    label: "有序列表",
    description: "把当前块转换为有序列表",
    keywords: ["ordered", "list", "ol", "number", "列表", "有序"],
    execute: (editor) => {
      editor.commands.toggleOrderedList();
    },
  },
  {
    id: "task-list",
    label: "任务列表",
    description: "把当前块转换为任务列表",
    keywords: ["task", "checkbox", "todo", "任务", "待办"],
    execute: (editor) => {
      editor.commands.toggleTaskList();
    },
  },
  {
    id: "code-block",
    label: "代码块",
    description: "插入围栏代码块",
    keywords: ["code", "pre", "snippet", "代码"],
    execute: (editor) => {
      editor.commands.toggleCodeBlock();
    },
  },
  {
    id: "block-math",
    label: "块级公式",
    description: "插入一个 KaTeX 块级公式节点",
    keywords: ["math", "latex", "equation", "katex", "公式"],
    execute: (editor) => {
      editor.commands.insertBlockMath({
        latex: String.raw`\sum_{i=1}^{n} x_i = X`,
      });
    },
  },
  {
    id: "horizontal-rule",
    label: "分隔线",
    description: "插入一个分隔线块",
    keywords: ["hr", "divider", "rule", "分隔线"],
    execute: (editor) => {
      editor.commands.setHorizontalRule();
    },
  },
  {
    id: "image",
    label: "图片",
    description: "插入一个块级图片节点",
    keywords: ["image", "media", "photo", "图片"],
    execute: (editor) => {
      editor.commands.setImage({
        src: sampleImageUrl,
        alt: "mxm-editor 预览图",
        title: "mxm-editor 预览图",
      });
    },
  },
  {
    id: "table",
    label: "表格",
    description: "插入一个带表头的 3x3 表格",
    keywords: ["table", "grid", "markdown", "表格"],
    execute: (editor) => {
      editor.commands.insertTable({
        rows: 3,
        cols: 3,
        withHeaderRow: true,
      });
    },
  },
  {
    id: "table-row",
    label: "新增表格行",
    description: "在当前表格选区后新增一行",
    keywords: ["table", "row", "grid", "表格", "行"],
    execute: (editor) => {
      editor.commands.addRowAfter();
    },
  },
  {
    id: "table-column",
    label: "新增表格列",
    description: "在当前表格选区后新增一列",
    keywords: ["table", "column", "grid", "表格", "列"],
    execute: (editor) => {
      editor.commands.addColumnAfter();
    },
  },
  {
    id: "tip",
    label: "提示块",
    description: "插入一个提示信息块",
    keywords: ["tip", "callout", "note", "提示"],
    execute: (editor) => {
      editor.commands.insertCallout("tip");
    },
  },
  {
    id: "warning",
    label: "警告块",
    description: "插入一个警告信息块",
    keywords: ["warning", "alert", "callout", "警告"],
    execute: (editor) => {
      editor.commands.insertCallout("warning");
    },
  },
];

function filterSlashItems(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return slashItems;
  }

  return slashItems.filter((item) =>
    item.label.toLowerCase().includes(normalizedQuery)
    || item.description.toLowerCase().includes(normalizedQuery)
    || item.keywords.some((keyword) => keyword.includes(normalizedQuery)),
  );
}

function createSlashRenderer() {
  let popup: HTMLDivElement | null = null;
  let currentProps: SuggestionProps<SlashItem, SlashItem> | null = null;
  let selectedIndex = 0;

  const ensurePopup = () => {
    if (!popup) {
      popup = document.createElement("div");
      popup.className = "slash-palette";
      document.body.appendChild(popup);
    }

    return popup;
  };

  const paint = (props: SuggestionProps<SlashItem, SlashItem>) => {
    currentProps = props;

    const element = ensurePopup();
    const rect = props.clientRect?.();

    if (rect) {
      element.style.top = `${rect.bottom + window.scrollY + 10}px`;
      element.style.left = `${rect.left + window.scrollX}px`;
    }

    element.replaceChildren();

    if (!props.items.length) {
      const emptyState = document.createElement("div");

      emptyState.className = "slash-empty";
      emptyState.textContent = "没有匹配的命令";
      element.appendChild(emptyState);
      return;
    }

    props.items.forEach((item, index) => {
      const button = document.createElement("button");
      const title = document.createElement("strong");
      const description = document.createElement("span");

      button.type = "button";
      button.className = `slash-item ${
        index === selectedIndex ? "is-active" : ""
      }`;
      button.onmousedown = (event) => {
        event.preventDefault();
      };
      button.onclick = () => {
        props.command(item);
      };
      title.textContent = item.label;
      description.textContent = item.description;
      button.appendChild(title);
      button.appendChild(description);
      element.appendChild(button);
    });
  };

  const move = (delta: number) => {
    if (!currentProps?.items.length) {
      return;
    }

    selectedIndex =
      (
        selectedIndex
        + delta
        + currentProps.items.length
      )
      % currentProps.items.length;

    paint(currentProps);
  };

  return {
    onStart(props: SuggestionProps<SlashItem, SlashItem>) {
      selectedIndex = 0;
      paint(props);
    },
    onUpdate(props: SuggestionProps<SlashItem, SlashItem>) {
      selectedIndex = Math.min(
        selectedIndex,
        Math.max(props.items.length - 1, 0),
      );
      paint(props);
    },
    onKeyDown({
      event,
      view,
    }: {
      event: KeyboardEvent;
      view: EditorView;
    }) {
      if (!currentProps) {
        return false;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        move(1);
        return true;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        move(-1);
        return true;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        currentProps.items[selectedIndex] && currentProps.command(
          currentProps.items[selectedIndex],
        );
        return true;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        exitSuggestion(view, slashPluginKey);
        return true;
      }

      return false;
    },
    onExit() {
      popup?.remove();
      popup = null;
      currentProps = null;
      selectedIndex = 0;
    },
  };
}

function createSlashCommand() {
  return Extension.create({
    name: "slashCommand",

    priority: 800,

    addProseMirrorPlugins() {
      return [
        Suggestion<SlashItem, SlashItem>({
          editor: this.editor,
          pluginKey: slashPluginKey,
          char: "/",
          startOfLine: true,
          allowedPrefixes: null,
          items: ({ query }) => filterSlashItems(query),
          render: createSlashRenderer,
          decorationTag: "span",
          decorationClass: "slash-suggestion",
          decorationEmptyClass: "is-empty",
          allow: ({ state, range }) => {
            const { $from } = state.selection;

            return (
              $from.parent.type.name === "paragraph"
              && range.from === $from.start()
            );
          },
          command: ({ editor, range, props }) => {
            editor.view?.dispatch(
              editor.view.state.tr.delete(range.from, range.to).scrollIntoView(),
            );
            props.execute(editor);
          },
        }),
      ];
    },
  });
}

function createMentionExtension(interactive: boolean) {
  return Mention.configure({
    HTMLAttributes: {
      class: "mention-chip",
    },
    ...(interactive
      ? {
          suggestion: {
            char: "@",
            pluginKey: mentionPluginKey,
            items: ({ query }) => filterMentionItems(query),
            render: createMentionRenderer,
            allowSpaces: false,
            allowToIncludeChar: false,
            allowedPrefixes: [" "],
            startOfLine: false,
            decorationTag: "span",
            decorationClass: "mention-suggestion",
            decorationEmptyClass: "is-empty",
            allow: () => true,
          },
        }
      : {}),
  });
}

function createCalloutExtension(interactive: boolean) {
  return Callout;
}

export function createPlaygroundExtensions(
  options: PlaygroundExtensionOptions = {},
) {
  const interactive = options.interactive ?? true;

  return [
    StarterKit.configure({
      ...(options.collaborative ? { undoRedo: false } : {}),
      link: {
        openOnClick: false,
      },
    }),
    ...(interactive ? [ListKeymap] : []),
    TaskItem,
    TaskList,
    Table,
    Mathematics.configure({
      katexOptions: {
        throwOnError: false,
      },
    }),
    Image,
    ...(interactive ? [DragHandle] : []),
    Markdown,
    TextStyle,
    Color,
    Superscript,
    Subscript,
    Typography,
    Highlight.configure({
      multicolor: true,
    }),
    TextAlign,
    ...(interactive ? [CharacterCount] : []),
    ...(interactive
      ? [
          Placeholder.configure({
            showOnlyCurrent: true,
            placeholder: ({ node }) =>
              node.type.name.startsWith("heading")
                ? "输入标题"
                : "输入 / 打开命令，或输入 @ 提及成员",
          }),
          createSlashCommand(),
        ]
      : []),
    createMentionExtension(interactive),
    createCalloutExtension(interactive),
    ...(options.collaborative
      ? [
          Collaboration.configure({
            document: options.peer?.document ?? null,
            field: "playground",
          }),
          CollaborationCaret.configure({
            awareness: options.peer?.awareness ?? null,
            user: options.peer?.user ?? null,
          }),
        ]
      : []),
  ] satisfies AnyExtension[];
}

export const localExtensions = createPlaygroundExtensions();

export const markdownManager = new MarkdownManager({
  extensions: createPlaygroundExtensions({
    interactive: false,
  }),
});
