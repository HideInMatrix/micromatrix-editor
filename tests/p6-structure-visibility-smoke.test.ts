import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import {
  InvisibleCharacters,
  type InvisibleCharactersStorage,
} from "@mxm-editor/extension-invisible-characters";
import {
  TableOfContents,
  type TableOfContentsStorage,
  getHeadlineLevel,
  getHierarchicalIndexes,
  getLinearIndexes,
} from "@mxm-editor/extension-table-of-contents";
import { StarterKit } from "@mxm-editor/starter-kit";
import { flushEditorCreate } from "./helpers/flushEditorCreate";

afterEach(() => {
  document.body.innerHTML = "";
  document.head
    .querySelectorAll(
      "[data-mxm-invisible-characters], [data-tiptap-extension-invisible-characters-style]",
    )
    .forEach((element) => element.remove());
});

describe("P6 structure and visibility smoke", () => {
  it("renders invisible characters and toggles their visibility", async () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
        }),
        InvisibleCharacters,
      ],
      content: "<p>a b<br>c</p><p>next</p>",
    });
    const storage = editor.storage.invisibleCharacters as InvisibleCharactersStorage;

    await flushEditorCreate();

    expect(storage.visibility()).toBe(true);
    expect(
      document.head.querySelector(
        "[data-mxm-invisible-characters], [data-tiptap-extension-invisible-characters-style]",
      ),
    ).not.toBeNull();
    expect(element.querySelector('[class*="invisible-character--space"]')).not.toBeNull();
    expect(
      element.querySelector(
        '[class*="invisible-character--hard-break"], [class*="invisible-character--break"]',
      ),
    ).not.toBeNull();
    expect(
      element.querySelector('[class*="invisible-character--paragraph"]'),
    ).not.toBeNull();

    expect(editor.commands.toggleInvisibleCharacters()).toBe(true);
    expect(storage.visibility()).toBe(false);
    expect(element.querySelector('[class*="invisible-character"]')).toBeNull();

    expect(editor.commands.showInvisibleCharacters()).toBe(true);
    expect(storage.visibility()).toBe(true);
    expect(element.querySelector('[class*="invisible-character"]')).not.toBeNull();

    editor.destroy();
  });

  it("persists heading ids and exposes table-of-contents helpers", async () => {
    const element = document.createElement("div");
    const updates: Array<{ count: number; isCreate: boolean }> = [];

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
        }),
        TableOfContents.configure({
          getId: (content) =>
            content
              .trim()
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-"),
          onUpdate: (anchors, isCreate) => {
            updates.push({
              count: anchors.length,
              isCreate,
            });
          },
        }),
      ],
      content: [
        "<h1>Title</h1>",
        "<h2>Child</h2>",
        "<h2>Child</h2>",
        "<h1>Title</h1>",
      ].join(""),
    });
    const storage = editor.storage.tableOfContents as TableOfContentsStorage;

    await flushEditorCreate();

    const [first, second, third, fourth] = storage.content;

    if (!first || !second || !third || !fourth) {
      throw new Error("Expected four table-of-contents anchors.");
    }

    const hierarchicalFirst = {
      ...first,
      itemIndex: 1,
    };
    const hierarchicalSecond = {
      ...second,
      itemIndex: 1,
    };
    const hierarchicalThird = {
      ...third,
      itemIndex: 2,
    };

    expect(storage.content).toHaveLength(4);
    expect(storage.anchors).toHaveLength(4);
    expect(storage.anchors.every((anchor) => anchor instanceof HTMLElement)).toBe(true);
    expect(storage.content.map((anchor) => anchor.id)).toEqual([
      "title",
      "child",
      "child-2",
      "title-2",
    ]);
    expect(storage.content.map((anchor) => anchor.level)).toEqual([1, 2, 2, 1]);
    expect(storage.content.map((anchor) => anchor.itemIndex)).toEqual([1, 2, 3, 4]);
    expect(storage.content.every((anchor) => anchor.dom?.id === anchor.id)).toBe(true);
    expect(editor.getHTML()).toContain('data-toc-id="title"');
    expect(editor.getHTML()).toContain('data-toc-id="child-2"');

    expect(getLinearIndexes(second, [first])).toBe(2);
    expect(getHierarchicalIndexes(second, [hierarchicalFirst], second.level)).toBe(1);
    expect(
      getHierarchicalIndexes(
        third,
        [hierarchicalFirst, hierarchicalSecond],
        third.level,
      ),
    ).toBe(2);
    expect(
      getHierarchicalIndexes(
        fourth,
        [hierarchicalFirst, hierarchicalSecond, hierarchicalThird],
        fourth.level,
      ),
    ).toBe(2);
    expect(
      getHeadlineLevel(
        {
          ...third,
          id: "deep-child",
          level: 1,
          originalLevel: 4,
          textContent: "Deep child",
          content: "Deep child",
        },
        [first, second],
      ),
    ).toBe(3);

    expect(editor.commands.updateTableOfContents()).toBe(true);
    expect(updates[0]).toEqual({
      count: 4,
      isCreate: true,
    });

    editor.destroy();
  });
});
