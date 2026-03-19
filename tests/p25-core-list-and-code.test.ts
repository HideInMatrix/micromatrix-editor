import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(content = "<p></p>") {
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
    content,
  });
}

function findTextPosition(editor: Editor, text: string, occurrence = 0) {
  let position = 0;
  let count = 0;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return true;
    }

    const index = node.text.indexOf(text);

    if (index === -1) {
      return true;
    }

    if (count === occurrence) {
      position = pos + index + 1;
      return false;
    }

    count += 1;
    return true;
  });

  if (!position) {
    throw new Error(`Unable to find text position for "${text}" occurrence ${occurrence}.`);
  }

  return position;
}

describe("P25 core list and code commands", () => {
  it("exits code blocks into a following paragraph", () => {
    const editor = createEditor("<pre><code>const value = 1;</code></pre>");

    expect(editor.commands.setTextSelection(editor.state.doc.content.size - 1)).toBe(true);
    expect(editor.commands.exitCode()).toBe(true);
    expect(editor.getHTML()).toContain("<pre><code>const value = 1;</code></pre><p></p>");

    editor.destroy();
  });

  it("wraps paragraphs into lists through the core command", () => {
    const editor = createEditor("<p>Item</p>");

    expect(editor.commands.selectAll()).toBe(true);
    expect(editor.commands.wrapInList("bulletList")).toBe(true);
    expect(editor.getHTML()).toContain("<ul><li><p>Item</p></li></ul>");

    editor.destroy();
  });

  it("sinks and lifts list items", () => {
    const editor = createEditor("<ul><li><p>One</p></li><li><p>Two</p></li></ul>");

    expect(editor.commands.setTextSelection(findTextPosition(editor, "Two"))).toBe(true);
    expect(editor.commands.sinkListItem("listItem")).toBe(true);
    expect(editor.getHTML()).toContain("<ul><li><p>One</p><ul><li><p>Two</p></li></ul></li></ul>");

    expect(editor.commands.setTextSelection(findTextPosition(editor, "Two"))).toBe(true);
    expect(editor.commands.liftListItem("listItem")).toBe(true);
    expect(editor.getHTML()).toContain("<ul><li><p>One</p></li><li><p>Two</p></li></ul>");

    editor.destroy();
  });

  it("splits list items into a new sibling item", () => {
    const editor = createEditor("<ul><li><p>Alpha</p></li></ul>");

    expect(editor.commands.setTextSelection(findTextPosition(editor, "Alpha") + "Alpha".length - 1)).toBe(true);
    expect(editor.commands.splitListItem("listItem")).toBe(true);
    expect(editor.getHTML()).toContain("<ul><li><p>Alpha</p></li><li><p></p></li></ul>");

    editor.destroy();
  });
});
