import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { NodeSelection } from "@mxm-editor/pm";
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

function findNodePosition(editor: Editor, typeName: string, occurrence = 0) {
  let position = -1;
  let count = 0;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== typeName) {
      return true;
    }

    if (count === occurrence) {
      position = pos;
      return false;
    }

    count += 1;
    return true;
  });

  if (position < 0) {
    throw new Error(`Unable to find node position for "${typeName}" occurrence ${occurrence}.`);
  }

  return position;
}

describe("P29 core join and select commands", () => {
  it("moves the cursor to the current textblock boundaries", () => {
    const editor = createEditor("<p>Hello world</p>");

    expect(editor.commands.setTextSelection(findTextPosition(editor, "world"))).toBe(true);
    expect(editor.commands.selectTextblockStart()).toBe(true);
    expect(editor.state.selection.from).toBe(1);

    expect(editor.commands.selectTextblockEnd()).toBe(true);
    expect(editor.state.selection.from).toBe(editor.state.doc.content.size - 1);

    editor.destroy();
  });

  it("selects adjacent nodes around the cursor", () => {
    const editor = createEditor("<p>Hello</p><hr><p>After</p>");

    expect(editor.commands.setTextSelection(findTextPosition(editor, "After"))).toBe(true);
    expect(editor.commands.selectTextblockStart()).toBe(true);
    expect(editor.commands.selectNodeBackward()).toBe(true);
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    expect((editor.state.selection as NodeSelection).node.type.name).toBe("horizontalRule");

    expect(editor.commands.setTextSelection(findTextPosition(editor, "Hello"))).toBe(true);
    expect(editor.commands.selectTextblockEnd()).toBe(true);
    expect(editor.commands.selectNodeForward()).toBe(true);
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    expect((editor.state.selection as NodeSelection).node.type.name).toBe("horizontalRule");

    editor.destroy();
  });

  it("joins textblocks backward and forward", () => {
    const backwardEditor = createEditor("<p>One</p><p>Two</p>");

    expect(backwardEditor.commands.setTextSelection(findTextPosition(backwardEditor, "Two"))).toBe(true);
    expect(backwardEditor.commands.selectTextblockStart()).toBe(true);
    expect(backwardEditor.commands.joinBackward()).toBe(true);
    expect(backwardEditor.getHTML()).toBe("<p>OneTwo</p>");
    backwardEditor.destroy();

    const forwardEditor = createEditor("<p>One</p><p>Two</p>");

    expect(forwardEditor.commands.setTextSelection(findTextPosition(forwardEditor, "One"))).toBe(true);
    expect(forwardEditor.commands.selectTextblockEnd()).toBe(true);
    expect(forwardEditor.commands.joinForward()).toBe(true);
    expect(forwardEditor.getHTML()).toBe("<p>OneTwo</p>");
    forwardEditor.destroy();
  });

  it("joins selected blocks upward and downward", () => {
    const upEditor = createEditor(
      "<blockquote><p>One</p></blockquote><blockquote><p>Two</p></blockquote>",
    );

    expect(upEditor.commands.setTextSelection(findTextPosition(upEditor, "Two"))).toBe(true);
    expect(upEditor.commands.joinUp()).toBe(true);
    expect(upEditor.getHTML()).toContain("<blockquote>");
    expect(upEditor.getHTML()).toContain("One");
    expect(upEditor.getHTML()).toContain("Two");
    expect((upEditor.getHTML().match(/<blockquote>/g) ?? [])).toHaveLength(1);
    upEditor.destroy();

    const downEditor = createEditor(
      "<blockquote><p>One</p></blockquote><blockquote><p>Two</p></blockquote>",
    );

    expect(downEditor.commands.setTextSelection(findTextPosition(downEditor, "One"))).toBe(true);
    expect(downEditor.commands.joinDown()).toBe(true);
    expect(downEditor.getHTML()).toContain("<blockquote>");
    expect(downEditor.getHTML()).toContain("One");
    expect(downEditor.getHTML()).toContain("Two");
    expect((downEditor.getHTML().match(/<blockquote>/g) ?? [])).toHaveLength(1);
    downEditor.destroy();
  });

  it("joins list items in both directions", () => {
    const backwardEditor = createEditor("<ul><li><p>One</p></li><li><p>Two</p></li></ul>");

    expect(backwardEditor.commands.setTextSelection(findTextPosition(backwardEditor, "Two") - 1)).toBe(true);
    expect(backwardEditor.commands.joinItemBackward()).toBe(true);
    expect(backwardEditor.getHTML()).toContain("<ul><li><p>OneTwo</p></li></ul>");
    backwardEditor.destroy();

    const forwardEditor = createEditor("<ul><li><p>One</p></li><li><p>Two</p></li></ul>");

    expect(forwardEditor.commands.setTextSelection(findTextPosition(forwardEditor, "One"))).toBe(true);
    expect(forwardEditor.commands.selectTextblockEnd()).toBe(true);
    expect(forwardEditor.commands.joinItemForward()).toBe(true);
    expect(forwardEditor.getHTML()).toContain("<ul><li><p>OneTwo</p></li></ul>");
    forwardEditor.destroy();
  });

  it("joins textblocks across structural boundaries", () => {
    const backwardEditor = createEditor("<blockquote><p>One</p></blockquote><p>Two</p>");

    expect(backwardEditor.commands.setTextSelection(findTextPosition(backwardEditor, "Two"))).toBe(true);
    expect(backwardEditor.commands.selectTextblockStart()).toBe(true);
    expect(backwardEditor.commands.joinTextblockBackward()).toBe(true);
    expect(backwardEditor.getHTML()).toContain("<blockquote><p>OneTwo</p></blockquote>");
    backwardEditor.destroy();

    const forwardEditor = createEditor("<p>One</p><blockquote><p>Two</p></blockquote>");

    expect(forwardEditor.commands.setTextSelection(findTextPosition(forwardEditor, "One"))).toBe(true);
    expect(forwardEditor.commands.selectTextblockEnd()).toBe(true);
    expect(forwardEditor.commands.joinTextblockForward()).toBe(true);
    expect(forwardEditor.getHTML()).toBe("<p>OneTwo</p>");
    forwardEditor.destroy();
  });
});
