import { afterEach, describe, expect, it } from "vitest";
import { Editor, Extension } from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

const TextDirection = Extension.create({
  name: "customTextDirection",

  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph"],
        attributes: {
          dir: {
            default: null,
            parseHTML: (element) => element.getAttribute("dir"),
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.dir) {
                return {};
              }

              return {
                dir: String(attributes.dir),
              };
            },
          },
        },
      },
    ];
  },
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

function findTextBoundary(editor: Editor, text: string) {
  return findTextPosition(editor, text) - 1;
}

describe("P30 core command parity", () => {
  it("cuts a document slice and inserts it at the mapped target position", () => {
    const editor = createEditor();

    editor.setContent("<p>Hello brave world</p>");

    expect(
      editor.commands.cut(
        {
          from: findTextBoundary(editor, "brave"),
          to: findTextBoundary(editor, "world"),
        },
        1,
      ),
    ).toBe(true);
    expect(editor.getHTML()).toBe("<p>brave Hello world</p>");

    editor.destroy();
  });

  it("deletes the current empty node but leaves non-empty nodes intact", () => {
    const editor = createEditor();

    editor.setContent("<p></p><p>After</p>");
    expect(editor.commands.setTextSelection(1)).toBe(true);
    expect(editor.commands.deleteCurrentNode()).toBe(true);
    expect(editor.getHTML()).toBe("<p>After</p>");

    editor.setContent("<p>Keep</p>");
    expect(editor.commands.setTextSelection(findTextPosition(editor, "Keep"))).toBe(true);
    expect(editor.commands.deleteCurrentNode()).toBe(false);
    expect(editor.getHTML()).toBe("<p>Keep</p>");

    editor.destroy();
  });

  it("sets and unsets text direction on nodes that support the dir attribute", () => {
    const editor = createEditor([TextDirection]);

    editor.setContent("<p>Alpha</p><p>Beta</p>");

    expect(editor.commands.selectAll()).toBe(true);
    expect(editor.commands.setTextDirection("rtl")).toBe(true);
    expect(editor.getHTML()).toBe('<p dir="rtl">Alpha</p><p dir="rtl">Beta</p>');

    expect(editor.commands.selectAll()).toBe(true);
    expect(editor.commands.unsetTextDirection()).toBe(true);
    expect(editor.getHTML()).toBe("<p>Alpha</p><p>Beta</p>");

    editor.destroy();
  });
});
