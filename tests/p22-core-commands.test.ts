import { afterEach, describe, expect, it } from "vitest";
import { Editor, Extension, textInputRule } from "@mxm-editor/core";
import { NodeSelection } from "@mxm-editor/pm";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(extensions: any[] = []) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
      }),
      ...extensions,
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

function triggerTextInput(editor: Editor, text: string) {
  const view = editor.view;

  if (!view) {
    throw new Error("Expected mounted editor view.");
  }

  let handled = false;

  view.someProp("handleTextInput", (handler) => {
    handled = handler(
      view,
      editor.state.selection.from,
      editor.state.selection.to,
      text,
    );

    return handled;
  });

  return handled;
}

const DashInputRule = Extension.create({
  name: "dashInputRule",

  addInputRules() {
    return [
      textInputRule({
        find: /--$/,
        replace: "—",
      }),
    ];
  },
});

describe("P22 core command extensions", () => {
  it("creates a nearby paragraph for node selections", () => {
    const editor = createEditor();

    editor.setContent("<hr>");

    expect(editor.commands.setNodeSelection(0)).toBe(true);
    expect(editor.commands.createParagraphNear()).toBe(true);
    expect(editor.getHTML()).toBe("<hr><p></p>");

    editor.destroy();
  });

  it("selects the parent node around the current text selection", () => {
    const editor = createEditor();

    editor.setContent("<blockquote><p>Hello</p></blockquote>");
    expect(editor.commands.setTextSelection(findTextPosition(editor, "Hello"))).toBe(true);
    expect(editor.commands.selectParentNode()).toBe(true);
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    expect((editor.state.selection as NodeSelection).node.type.name).toBe("paragraph");

    editor.destroy();
  });

  it("deletes ancestor nodes by name", () => {
    const editor = createEditor();

    editor.setContent("<blockquote><p>Hello</p></blockquote><p>After</p>");
    expect(editor.commands.setTextSelection(findTextPosition(editor, "Hello"))).toBe(true);
    expect(editor.commands.deleteNode("blockquote")).toBe(true);
    expect(editor.getHTML()).not.toContain("<blockquote>");
    expect(editor.getHTML()).toContain("<p>After</p>");

    editor.destroy();
  });

  it("clears nested block structure back to plain paragraphs", () => {
    const editor = createEditor();

    editor.setContent("<blockquote><h2>Hello</h2></blockquote>");
    expect(editor.commands.selectAll()).toBe(true);
    expect(editor.commands.clearNodes()).toBe(true);
    expect(editor.getHTML()).not.toContain("<blockquote>");
    expect(editor.getHTML()).not.toContain("<h2");
    expect(editor.getHTML()).toContain("<p>Hello</p>");

    editor.destroy();
  });

  it("supports forEach and undoInputRule", () => {
    const editor = createEditor([DashInputRule]);

    editor.setContent("<p></p>");
    expect(
      editor.commands.forEach(["A", "B", "C"], (item, { commands, index }) =>
        commands.insertContent(index === 1 ? item.toLowerCase() : item),
      ),
    ).toBe(true);
    expect(editor.getText()).toBe("AbC");

    editor.setContent("<p>-</p>");
    expect(editor.commands.setTextSelection(2)).toBe(true);
    expect(triggerTextInput(editor, "-")).toBe(true);
    expect(editor.getText()).toBe("—");
    expect(editor.commands.undoInputRule()).toBe(true);
    expect(editor.getText()).toBe("--");

    editor.destroy();
  });
});
