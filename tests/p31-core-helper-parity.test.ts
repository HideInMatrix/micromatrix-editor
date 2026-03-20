import { afterEach, describe, expect, it } from "vitest";
import {
  Editor,
  findChildrenInRange,
  getAttributes,
  getMarkAttributes,
  getNodeAtPosition,
  getNodeAttributes,
  isNodeSelection,
  isTextSelection,
} from "@mxm-editor/core";
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

describe("P31 core helper parity", () => {
  it("reads mark and node attributes from editor state helpers", () => {
    const editor = createEditor(
      '<h2>Heading</h2><p><a href="https://mxm.dev" title="Docs">hello</a></p>',
    );

    expect(editor.commands.setTextSelection(findTextPosition(editor, "hello"))).toBe(true);
    expect(getMarkAttributes(editor.state, "link")).toMatchObject({
      href: "https://mxm.dev",
      title: "Docs",
    });
    expect(getAttributes(editor.state, "link")).toMatchObject({
      href: "https://mxm.dev",
      title: "Docs",
    });

    expect(editor.commands.setTextSelection(findTextPosition(editor, "Heading"))).toBe(true);
    expect(getNodeAttributes(editor.state, "heading")).toMatchObject({
      level: 2,
    });
    expect(getAttributes(editor.state, "heading")).toMatchObject({
      level: 2,
    });

    editor.destroy();
  });

  it("finds descendants in a specific range and resolves parent nodes by position", () => {
    const editor = createEditor("<p>Alpha</p><blockquote><p>Beta</p></blockquote>");
    const betaPosition = findTextPosition(editor, "Beta");
    const matchingParagraphs = findChildrenInRange(
      editor.state.doc,
      {
        from: betaPosition,
        to: editor.state.doc.content.size,
      },
      (node) => node.type.name === "paragraph",
    );

    expect(matchingParagraphs).toHaveLength(1);
    expect(matchingParagraphs[0]?.node.textContent).toBe("Beta");

    const [blockquoteNode, depth] = getNodeAtPosition(
      editor.state,
      "blockquote",
      betaPosition,
    );

    expect(blockquoteNode?.type.name).toBe("blockquote");
    expect(depth).toBe(1);

    editor.destroy();
  });

  it("provides selection guards for node and text selections", () => {
    const editor = createEditor("<blockquote><p>Gamma</p></blockquote>");

    expect(editor.commands.setTextSelection(findTextPosition(editor, "Gamma"))).toBe(true);
    expect(isTextSelection(editor.state.selection)).toBe(true);
    expect(isNodeSelection(editor.state.selection)).toBe(false);

    expect(editor.commands.setNodeSelection(0)).toBe(true);
    expect(isNodeSelection(editor.state.selection)).toBe(true);
    expect(isTextSelection(editor.state.selection)).toBe(false);

    editor.destroy();
  });
});
