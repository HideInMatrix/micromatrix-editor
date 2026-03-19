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

describe("P26 core toggleList command", () => {
  it("wraps text blocks into a target list", () => {
    const editor = createEditor("<p>Alpha</p><p>Beta</p>");

    expect(editor.commands.selectAll()).toBe(true);
    expect(editor.commands.toggleList("bulletList", "listItem")).toBe(true);
    expect(editor.getHTML()).toContain("<ul><li><p>Alpha</p></li><li><p>Beta</p></li></ul>");

    editor.destroy();
  });

  it("lifts content out of the same list type", () => {
    const editor = createEditor("<ul><li><p>Alpha</p></li></ul>");

    expect(editor.commands.setTextSelection(findTextPosition(editor, "Alpha"))).toBe(true);
    expect(editor.commands.toggleList("bulletList", "listItem")).toBe(true);
    expect(editor.getHTML()).toContain("<p>Alpha</p>");
    expect(editor.getHTML()).not.toContain("<ul>");

    editor.destroy();
  });

  it("switches between compatible list types and joins adjacent lists", () => {
    const editor = createEditor(
      "<ol><li><p>One</p></li></ol><ul><li><p>Two</p></li></ul>",
    );

    expect(editor.commands.setTextSelection(findTextPosition(editor, "Two"))).toBe(true);
    expect(editor.commands.toggleList("orderedList", "listItem")).toBe(true);
    expect(editor.getHTML()).toContain("<ol><li><p>One</p></li><li><p>Two</p></li></ol>");
    expect(editor.getHTML()).not.toContain("</ol><ol>");
    expect(editor.getHTML()).not.toContain("<ul>");

    editor.destroy();
  });

  it("normalizes non-paragraph blocks before wrapping into a list", () => {
    const editor = createEditor("<h2>Heading</h2>");

    expect(editor.commands.selectAll()).toBe(true);
    expect(editor.commands.toggleList("bulletList", "listItem")).toBe(true);
    expect(editor.getHTML()).toContain("<ul><li><p>Heading</p></li></ul>");
    expect(editor.getHTML()).not.toContain("<h2>");

    editor.destroy();
  });

  it("keeps only splittable stored marks when keepMarks is enabled", () => {
    const editor = createEditor("<p>Alpha</p>");

    expect(editor.commands.setTextSelection(editor.state.doc.content.size - 1)).toBe(true);
    expect(editor.commands.toggleBold()).toBe(true);
    expect(editor.commands.setLink({ href: "https://example.com" })).toBe(true);
    expect(editor.commands.toggleList("bulletList", "listItem", true)).toBe(true);

    expect(editor.isActive("bold")).toBe(true);
    expect(editor.isActive("link")).toBe(false);

    editor.destroy();
  });
});
