import type { Editor } from "@tiptap/core";

type WritingStudioMathKind = "inline" | "block";

type WritingStudioMathEditorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const activeEditor = shallowRef<Editor | null>(null);
const isMathEditorOpen = ref(false);
const mathEditorKind = ref<WritingStudioMathKind>("inline");
const mathEditorLatex = ref("");
const mathEditorPos = ref<number | null>(null);
const mathEditorRect = ref<WritingStudioMathEditorRect | null>(null);

const toRect = (rect: DOMRect): WritingStudioMathEditorRect => {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};

const resolveMathNodeRect = (
  editor: Editor,
  pos: number,
) => {
  const nodeDom = editor.view.nodeDOM(pos);

  if (!(nodeDom instanceof HTMLElement)) {
    return null;
  }

  return toRect(nodeDom.getBoundingClientRect());
};

const refreshMathEditorRect = () => {
  if (!isMathEditorOpen.value || !activeEditor.value || mathEditorPos.value === null) {
    return;
  }

  const rect = resolveMathNodeRect(activeEditor.value, mathEditorPos.value);

  if (!rect) {
    isMathEditorOpen.value = false;
    mathEditorRect.value = null;
    return;
  }

  mathEditorRect.value = rect;
};

const registerMathEditor = (editor: Editor | null | undefined) => {
  activeEditor.value = editor ?? null;

  if (!editor) {
    isMathEditorOpen.value = false;
    mathEditorRect.value = null;
    mathEditorPos.value = null;
  }
};

const openMathEditor = (options: {
  kind: WritingStudioMathKind;
  latex: string;
  pos: number;
}) => {
  const editor = activeEditor.value;

  if (!editor) {
    return false;
  }

  const rect = resolveMathNodeRect(editor, options.pos);

  if (!rect) {
    return false;
  }

  mathEditorKind.value = options.kind;
  mathEditorLatex.value = options.latex;
  mathEditorPos.value = options.pos;
  mathEditorRect.value = rect;
  isMathEditorOpen.value = true;

  editor.chain().setNodeSelection(options.pos).run();

  return true;
};

const closeMathEditor = () => {
  isMathEditorOpen.value = false;
  mathEditorRect.value = null;
};

const saveMathEditor = (nextLatex: string) => {
  const editor = activeEditor.value;
  const pos = mathEditorPos.value;
  const normalizedLatex = nextLatex.trim();

  if (!editor || pos === null || !normalizedLatex) {
    return false;
  }

  const chain = editor.chain().focus().setNodeSelection(pos) as any;
  const success = mathEditorKind.value === "block"
    ? chain.updateBlockMath({ latex: normalizedLatex, pos }).focus().run()
    : chain.updateInlineMath({ latex: normalizedLatex, pos }).focus().run();

  if (!success) {
    return false;
  }

  mathEditorLatex.value = normalizedLatex;
  closeMathEditor();
  return true;
};

export const useWritingStudioMathEditor = () => {
  return {
    isMathEditorOpen,
    mathEditorKind,
    mathEditorLatex,
    mathEditorRect,
    registerMathEditor,
    openMathEditor,
    closeMathEditor,
    saveMathEditor,
    refreshMathEditorRect,
  };
};
