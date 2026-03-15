import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import {
  CharacterCount,
  type CharacterCountStorage,
} from "@mxm-editor/extension-character-count";
import { Image } from "@mxm-editor/extension-image";
import { ListKeymap } from "@mxm-editor/extension-list-keymap";
import { Placeholder } from "@mxm-editor/extension-placeholder";
import { TextAlign } from "@mxm-editor/extension-text-align";
import { MarkdownManager } from "@mxm-editor/markdown";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createExtensions() {
  return [
    StarterKit.configure({
      undoRedo: false,
    }),
    ListKeymap,
    Image,
    TextAlign,
    CharacterCount,
    Placeholder.configure({
      showOnlyCurrent: false,
    }),
  ];
}

describe("P1 smoke", () => {
  it("supports placeholder, character count, text align, and image", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: createExtensions(),
      content: "<p></p>",
    });
    const characterCount = editor.storage.characterCount as CharacterCountStorage;

    expect(element.querySelector("[data-placeholder]")).not.toBeNull();
    expect(characterCount.characters()).toBe(0);
    expect(characterCount.words()).toBe(0);

    expect(editor.commands.setContent("<p>hello world</p>")).toBe(true);
    expect(characterCount.characters()).toBe(11);
    expect(characterCount.words()).toBe(2);

    expect(editor.commands.setTextAlign("center")).toBe(true);
    expect(editor.isActive({ textAlign: "center" })).toBe(true);
    expect(editor.getHTML()).toContain("text-align: center");

    expect(editor.commands.setContent("<p></p>")).toBe(true);
    expect(
      editor.commands.setImage({
        src: "https://example.com/mxm.png",
        alt: "mxm",
        title: "demo",
      }),
    ).toBe(true);
    expect(editor.getHTML()).toContain("<img");
    expect(editor.getHTML()).toContain('src="https://example.com/mxm.png"');
  });

  it("enforces character count limits without blocking reductions", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        CharacterCount.configure({
          limit: 5,
        }),
      ],
      content: "<p>hello</p>",
    });
    const characterCount = editor.storage.characterCount as CharacterCountStorage;

    editor.commands.setTextSelection(6);
    editor.commands.insertContent("!");

    expect(editor.getText()).toBe("hello");
    expect(characterCount.characters()).toBe(5);

    editor.commands.selectAll();
    editor.commands.insertContent("<p>hey</p>");

    expect(editor.getText()).toBe("hey");
    expect(characterCount.characters()).toBe(3);
  });

  it("lifts nested list items on backspace at the start of a nested item", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        ListKeymap,
      ],
      content: [
        "<ul>",
        "<li><p>Parent</p><ul><li><p>Child</p></li></ul></li>",
        "</ul>",
      ].join(""),
    });

    let childPosition = 0;

    editor.state.doc.descendants((node, position) => {
      if (node.isText && node.text === "Child") {
        childPosition = position;
        return false;
      }

      return true;
    });

    editor.commands.setTextSelection(childPosition);

    const handled =
      ListKeymap.config.addKeyboardShortcuts
        ?.call(ListKeymap.createContext(editor))
        .Backspace();

    expect(handled).toBe(true);
    expect(editor.getHTML()).not.toContain("<ul><li><p>Child</p></li></ul>");
    expect(editor.getHTML()).toContain("<li><p>Parent</p></li><li><p>Child</p></li>");
  });

  it("round-trips markdown for text align and image", () => {
    const markdownManager = new MarkdownManager({
      extensions: createExtensions(),
    });
    const documentNode = markdownManager.parse([
      "<p style=\"text-align:center\">Centered</p>",
      "",
      "![mxm](https://example.com/mxm.png \"demo\")",
    ].join("\n"));
    const serialized = markdownManager.serialize(documentNode);

    expect(serialized).toContain("<p style=\"text-align: center\">Centered</p>");
    expect(serialized).toContain("![mxm](https://example.com/mxm.png \"demo\")");
  });
});
