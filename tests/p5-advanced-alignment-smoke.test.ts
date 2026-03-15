import { afterEach, describe, expect, it } from "vitest";
import { Editor, type JSONContent } from "@mxm-editor/core";
import { Selection } from "@mxm-editor/extension-selection";
import {
  Typography,
} from "@mxm-editor/extension-typography";
import {
  generateUniqueIds,
  UniqueID,
} from "@mxm-editor/extension-unique-id";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

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

function getTopLevelIds(documentNode: JSONContent) {
  return (documentNode.content ?? []).map((node) => node.attrs?.id);
}

describe("P5 advanced alignment smoke", () => {
  it("renders selection decorations while blurred", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
        }),
        Selection,
      ],
      content: "<p>hello world</p>",
    });

    editor.view?.dom.dispatchEvent(new Event("focus", { bubbles: true }));
    editor.commands.setTextSelection({ from: 1, to: 6 });

    expect(element.querySelector(".selection")).toBeNull();

    editor.view?.dom.dispatchEvent(new Event("blur", { bubbles: true }));
    expect(element.querySelector(".selection")).not.toBeNull();

    editor.view?.dom.dispatchEvent(new Event("focus", { bubbles: true }));
    expect(element.querySelector(".selection")).toBeNull();
  });

  it("applies typography input rules and respects disabled options", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
        }),
        Typography.configure({
          ellipsis: false,
        }),
      ],
      content: "<p></p>",
    });

    editor.commands.setTextSelection(1);
    typeText(editor, "\"Hello\" -- 2x3...");

    expect(editor.getText()).toBe("“Hello” — 2×3...");
  });

  it("assigns unique ids to configured nodes and fixes duplicates after updates", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
        }),
        UniqueID.configure({
          types: ["heading", "paragraph"],
          generateID: ({ node, pos }) => `${node.type.name}-${pos}`,
        }),
      ],
      content: "<h1>Title</h1><p>One</p><p>Two</p>",
    });

    const initialDocument = editor.getJSON();
    const initialIds = getTopLevelIds(initialDocument);

    expect(initialIds.every(Boolean)).toBe(true);
    expect(new Set(initialIds).size).toBe(initialIds.length);
    expect(editor.getHTML()).toContain("data-id=");

    expect(
      editor.commands.setContent({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: {
              id: "duplicate",
              level: 1,
            },
            content: [
              {
                type: "text",
                text: "Title",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              id: "duplicate",
            },
            content: [
              {
                type: "text",
                text: "One",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              id: "duplicate",
            },
            content: [
              {
                type: "text",
                text: "Two",
              },
            ],
          },
        ],
      }),
    ).toBe(true);

    const nextIds = getTopLevelIds(editor.getJSON());

    expect(nextIds.every(Boolean)).toBe(true);
    expect(new Set(nextIds).size).toBe(nextIds.length);
  });

  it("generates unique ids for JSON documents without mounting an editor", () => {
    const documentNode: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "One",
            },
          ],
        },
        {
          type: "paragraph",
          attrs: {
            id: "same",
          },
          content: [
            {
              type: "text",
              text: "Two",
            },
          ],
        },
        {
          type: "paragraph",
          attrs: {
            id: "same",
          },
          content: [
            {
              type: "text",
              text: "Three",
            },
          ],
        },
      ],
    };

    const nextDocument = generateUniqueIds(documentNode, [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
      }),
      UniqueID.configure({
        types: ["paragraph"],
        generateID: ({ pos }) => `paragraph-${pos}`,
      }),
    ]);
    const ids = getTopLevelIds(nextDocument);

    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
