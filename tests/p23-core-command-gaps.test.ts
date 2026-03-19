import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor() {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
      }),
    ],
    content: "<p></p>",
  });
}

function findTextPosition(editor: Editor, text: string) {
  let position = 0;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return true;
    }

    const index = node.text.indexOf(text);

    if (index === -1) {
      return true;
    }

    position = pos + index + 1;
    return false;
  });

  if (!position) {
    throw new Error(`Unable to find text position for "${text}".`);
  }

  return position;
}

describe("P23 core command gaps", () => {
  it("extends a text selection to the full mark range", () => {
    const editor = createEditor();

    editor.setContent('<p><a href="https://mxm.dev">hello world</a></p>');
    expect(
      editor.commands.setTextSelection({
        from: findTextPosition(editor, "lo"),
        to: findTextPosition(editor, "wo"),
      }),
    ).toBe(true);

    expect(editor.commands.extendMarkRange("link")).toBe(true);
    expect(editor.state.selection.from).toBe(1);
    expect(editor.state.selection.to).toBe(12);

    editor.destroy();
  });

  it("resets node attributes back to schema defaults", () => {
    const editor = createEditor();

    editor.setContent("<h3>Heading</h3>");
    expect(editor.commands.setTextSelection(findTextPosition(editor, "Heading"))).toBe(true);
    expect(editor.commands.resetAttributes("heading", "level")).toBe(true);
    expect(editor.getHTML()).toContain("<h1");
    expect(editor.getHTML()).toContain(">Heading</h1>");

    editor.destroy();
  });

  it("resets mark attributes for the active mark range", () => {
    const editor = createEditor();

    editor.setContent('<p><a href="https://mxm.dev" title="Docs">hello</a></p>');
    expect(editor.commands.setTextSelection(findTextPosition(editor, "hello"))).toBe(true);
    expect(editor.commands.resetAttributes("link", "title")).toBe(true);
    expect(editor.getHTML()).toContain('href="https://mxm.dev"');
    expect(editor.getHTML()).not.toContain('title="Docs"');

    editor.destroy();
  });

  it("triggers extension keyboard shortcuts through core commands", () => {
    const editor = createEditor();

    editor.setContent("<p>Hello</p>");
    expect(editor.commands.setTextSelection({ from: 1, to: 6 })).toBe(true);
    expect(editor.commands.keyboardShortcut("Mod-b")).toBe(true);
    expect(editor.getHTML()).toContain("<strong>Hello</strong>");

    editor.destroy();
  });
});
