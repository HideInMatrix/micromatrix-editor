import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import {
  Mathematics,
  createMathMigrateTransaction,
} from "@mxm-editor/extension-mathematics";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(content = "<p></p>") {
  const element = document.createElement("div");

  document.body.appendChild(element);

  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
      }),
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
        },
      }),
    ],
    content,
  });

  return { editor, element };
}

function typeText(editor: Editor, text: string) {
  const view = editor.view;

  if (!view) {
    throw new Error("Typing requires a mounted editor view.");
  }

  for (const character of text) {
    const { from, to } = view.state.selection;
    let handled = false;

    view.someProp("handleTextInput", (handler) => {
      if (handler(view, from, to, character)) {
        handled = true;
        return true;
      }

      return false;
    });

    if (!handled) {
      view.dispatch(view.state.tr.insertText(character, from, to));
    }
  }
}

function findNodePosition(editor: Editor, nodeName: string) {
  let position: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== nodeName) {
      return true;
    }

    position = pos;
    return false;
  });

  if (position === null) {
    throw new Error(`Unable to find ${nodeName} node.`);
  }

  return position;
}

describe("P13 mathematics smoke", () => {
  it("supports inline and block math commands", () => {
    const { editor } = createEditor();

    expect(
      editor.commands.insertInlineMath({
        latex: "E = mc^2",
      }),
    ).toBe(true);
    expect(editor.getHTML()).toContain('data-type="inline-math"');
    expect(editor.getHTML()).toContain('data-latex="E = mc^2"');

    const inlinePos = findNodePosition(editor, "inlineMath");

    expect(editor.commands.setNodeSelection(inlinePos)).toBe(true);
    expect(
      editor.commands.updateInlineMath({
        latex: "a^2 + b^2 = c^2",
      }),
    ).toBe(true);
    expect(editor.getHTML()).toContain('data-latex="a^2 + b^2 = c^2"');
    expect(editor.commands.deleteInlineMath()).toBe(true);
    expect(editor.getHTML()).not.toContain('data-type="inline-math"');

    expect(
      editor.commands.insertBlockMath({
        latex: String.raw`\\sum_{i=1}^{n} x_i = X`,
      }),
    ).toBe(true);
    expect(editor.getHTML()).toContain('data-type="block-math"');

    const blockPos = findNodePosition(editor, "blockMath");

    expect(editor.commands.setNodeSelection(blockPos)).toBe(true);
    expect(
      editor.commands.updateBlockMath({
        latex: String.raw`\\int_0^1 x^2 dx`,
      }),
    ).toBe(true);
    expect(editor.getHTML()).toContain(
      'data-latex="\\\\int_0^1 x^2 dx"',
    );
    expect(editor.commands.deleteBlockMath()).toBe(true);
    expect(editor.getHTML()).not.toContain('data-type="block-math"');
  });

  it("converts inline and block math input rules", () => {
    const { editor } = createEditor();

    editor.commands.setTextSelection(1);
    typeText(editor, "$$x^2$$");

    expect(editor.getHTML()).toContain('data-type="inline-math"');
    expect(editor.getHTML()).toContain('data-latex="x^2"');

    expect(editor.commands.setContent("<p></p>")).toBe(true);
    editor.commands.setTextSelection(1);
    typeText(editor, "$$$x^2$$$");

    expect(editor.getHTML()).toContain('data-type="block-math"');
    expect(editor.getHTML()).toContain('data-latex="x^2"');
  });

  it("renders katex node views and supports migration helpers", () => {
    const { editor, element } = createEditor("<p>Math: $x^2$</p>");
    const migrated = createMathMigrateTransaction(editor, editor.state.tr);

    expect(migrated.doc.toJSON()).toMatchObject({
      type: "doc",
    });
    expect(migrated.doc.textContent).toContain("Math:");

    editor.view?.dispatch(migrated);

    expect(editor.getHTML()).toContain('data-type="inline-math"');
    expect(element.querySelector(".katex")).not.toBeNull();
  });
});
