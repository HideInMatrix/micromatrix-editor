import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(
  options: Parameters<typeof Editor>[0] = {},
) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    extensions: [
      StarterKit.configure({
        trailingNode: false,
      }),
    ],
    content: "<p></p>",
    ...options,
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

describe("P24 core editing actions", () => {
  it("splits blocks through the enter command", () => {
    const editor = createEditor({
      content: "<p>Hello world</p>",
    });

    expect(editor.commands.setTextSelection(7)).toBe(true);
    expect(editor.commands.enter()).toBe(true);
    expect(editor.getHTML()).toContain("<p>Hello </p><p>world</p>");

    editor.destroy();
  });

  it("inserts line breaks inside code blocks through newlineInCode", () => {
    const editor = createEditor({
      content: "<pre><code>const a = 1;</code></pre>",
    });

    expect(editor.commands.setTextSelection(findTextPosition(editor, "1;") + 1)).toBe(true);
    expect(editor.commands.newlineInCode()).toBe(true);
    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          type: "codeBlock",
          content: [
            {
              type: "text",
              text: "const a = 1;\n",
            },
          ],
        },
      ],
    });

    editor.destroy();
  });

  it("lifts empty textblocks out of wrapping structure", () => {
    const editor = createEditor({
      content: "<blockquote><p></p></blockquote>",
    });

    expect(editor.commands.setTextSelection(2)).toBe(true);
    expect(editor.commands.liftEmptyBlock()).toBe(true);
    expect(editor.getHTML()).toBe("<p></p>");

    editor.destroy();
  });
});
