import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

const DRAFT_STORAGE_KEY = "paper-writer-draft-v1";

type PersistedDraft = {
  content: string;
  savedAt: number;
};

export type PaperCommand =
  | "bold"
  | "italic"
  | "strike"
  | "heading1"
  | "heading2"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "codeBlock"
  | "undo"
  | "redo"
  | "clearFormatting";

export type PaperActiveState = {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  heading1: boolean;
  heading2: boolean;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  codeBlock: boolean;
};

export type PaperStats = {
  words: number;
  characters: number;
  paragraphs: number;
  readingMinutes: number;
};

const DEFAULT_CONTENT = `
<h1>论文标题</h1>
<p>请先描述研究背景与问题定义。</p>
<h2>摘要</h2>
<p>简要说明研究目标、方法和结论。</p>
<h2>正文</h2>
<p>在这里展开你的核心论证。</p>
`.trim();

function toWordCount(text: string) {
  const cjkChars = (text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length;
  const latinWords = text
    .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;

  return cjkChars + latinWords;
}

function parseDraft(rawValue: string | null) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PersistedDraft;
  } catch {
    return null;
  }
}

export function usePaperEditor() {
  const changeTick = ref(0);
  const lastSavedAt = ref<Date | null>(null);
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  const editor = useEditor({
    content: DEFAULT_CONTENT,
    editorProps: {
      attributes: {
        class: "paper-prosemirror",
      },
    },
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "heading" ? "输入章节标题..." : "开始编写论文内容...",
      }),
    ],
    onUpdate: () => {
      changeTick.value += 1;
      schedulePersist();
    },
  });

  const editorReady = computed(() => Boolean(editor.value));

  const plainText = computed(() => {
    changeTick.value;
    return editor.value?.getText({ blockSeparator: "\n" }).trim() ?? "";
  });

  const stats = computed<PaperStats>(() => {
    const text = plainText.value;
    const paragraphs = text
      .split(/\n+/u)
      .map(line => line.trim())
      .filter(Boolean).length;
    const words = toWordCount(text);

    return {
      words,
      characters: text.replace(/\s+/gu, "").length,
      paragraphs,
      readingMinutes: words === 0 ? 0 : Math.ceil(words / 320),
    };
  });

  const activeState = computed<PaperActiveState>(() => {
    changeTick.value;
    const currentEditor = editor.value;

    if (!currentEditor) {
      return {
        bold: false,
        italic: false,
        strike: false,
        heading1: false,
        heading2: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
      };
    }

    return {
      bold: currentEditor.isActive("bold"),
      italic: currentEditor.isActive("italic"),
      strike: currentEditor.isActive("strike"),
      heading1: currentEditor.isActive("heading", { level: 1 }),
      heading2: currentEditor.isActive("heading", { level: 2 }),
      bulletList: currentEditor.isActive("bulletList"),
      orderedList: currentEditor.isActive("orderedList"),
      blockquote: currentEditor.isActive("blockquote"),
      codeBlock: currentEditor.isActive("codeBlock"),
    };
  });

  const canUndo = computed(() => {
    changeTick.value;
    const currentEditor = editor.value;
    return Boolean(currentEditor?.can().chain().focus().undo().run());
  });

  const canRedo = computed(() => {
    changeTick.value;
    const currentEditor = editor.value;
    return Boolean(currentEditor?.can().chain().focus().redo().run());
  });

  function execute(command: PaperCommand) {
    const currentEditor = editor.value;
    if (!currentEditor) {
      return false;
    }

    const chain = currentEditor.chain().focus();

    switch (command) {
      case "bold":
        return chain.toggleBold().run();
      case "italic":
        return chain.toggleItalic().run();
      case "strike":
        return chain.toggleStrike().run();
      case "heading1":
        return chain.toggleHeading({ level: 1 }).run();
      case "heading2":
        return chain.toggleHeading({ level: 2 }).run();
      case "bulletList":
        return chain.toggleBulletList().run();
      case "orderedList":
        return chain.toggleOrderedList().run();
      case "blockquote":
        return chain.toggleBlockquote().run();
      case "codeBlock":
        return chain.toggleCodeBlock().run();
      case "clearFormatting":
        return chain.unsetAllMarks().clearNodes().run();
      case "undo":
        return chain.undo().run();
      case "redo":
        return chain.redo().run();
      default:
        return false;
    }
  }

  function schedulePersist() {
    if (!import.meta.client) {
      return;
    }

    if (persistTimer) {
      clearTimeout(persistTimer);
    }

    persistTimer = setTimeout(() => {
      persistDraft();
    }, 300);
  }

  function persistDraft() {
    const currentEditor = editor.value;
    if (!import.meta.client || !currentEditor) {
      return;
    }

    const payload: PersistedDraft = {
      content: currentEditor.getHTML(),
      savedAt: Date.now(),
    };

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    lastSavedAt.value = new Date(payload.savedAt);
  }

  function restoreDraft() {
    if (!import.meta.client || !editor.value) {
      return;
    }

    const draft = parseDraft(localStorage.getItem(DRAFT_STORAGE_KEY));
    if (!draft?.content) {
      return;
    }

    editor.value.commands.setContent(draft.content);
    lastSavedAt.value = new Date(draft.savedAt);
    changeTick.value += 1;
  }

  function clearEditor() {
    const currentEditor = editor.value;
    if (!currentEditor) {
      return;
    }

    currentEditor.commands.clearContent();
    changeTick.value += 1;
    persistDraft();
  }

  async function copyPlainText() {
    if (!import.meta.client) {
      return false;
    }

    const text = plainText.value;
    if (!text) {
      return false;
    }

    await navigator.clipboard.writeText(text);
    return true;
  }

  async function copyHtml() {
    if (!import.meta.client || !editor.value) {
      return false;
    }

    const html = editor.value.getHTML().trim();
    if (!html) {
      return false;
    }

    await navigator.clipboard.writeText(html);
    return true;
  }

  if (import.meta.client) {
    const stopRestoreWatcher = watch(
      editor,
      (instance) => {
        if (!instance) {
          return;
        }

        restoreDraft();
        stopRestoreWatcher();
      },
      { immediate: true },
    );
  }

  onBeforeUnmount(() => {
    if (persistTimer) {
      clearTimeout(persistTimer);
    }

    persistDraft();
  });

  return {
    editor,
    editorReady,
    stats,
    activeState,
    canUndo,
    canRedo,
    lastSavedAt,
    execute,
    persistDraft,
    clearEditor,
    copyPlainText,
    copyHtml,
  };
}
