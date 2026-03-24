import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Editor } from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function createExtensions() {
  return [
    StarterKit.configure({
      undoRedo: false,
      trailingNode: false,
    }),
  ];
}

describe("P44 core content check alignment", () => {
  it("emits contentError for invalid HTML when content checking is enabled", () => {
    const records: string[] = [];
    const editor = new Editor({
      extensions: createExtensions(),
      content: "<p>Alpha</p><mxm-unknown>Beta</mxm-unknown>",
      enableContentCheck: true,
      onContentError: ({ error }) => {
        records.push(error.message);
      },
    });

    expect(records).toEqual([
      "[mxm-editor error]: Invalid HTML content",
    ]);
    expect(editor.getHTML()).not.toContain("mxm-unknown");
    expect(editor.getText()).toContain("Alpha");
    expect(editor.getText()).toContain("Beta");

    editor.destroy();
  });

  it("emits contentError and falls back to a safe document for invalid JSON setContent", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const records: string[] = [];
    const editor = new Editor({
      extensions: createExtensions(),
      content: "<p>Hello</p>",
      onContentError: ({ error }) => {
        records.push(error.message);
      },
    });

    editor.setContent(
      {
        type: "doc",
        content: [
          {
            type: "unknown-node",
          },
        ],
      },
      {
        errorOnInvalidContent: true,
      },
    );

    expect(records).toEqual([
      "[mxm-editor error]: Invalid JSON content",
    ]);
    expect(editor.getText()).toBe("");
    expect(editor.getJSON()).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
        },
      ],
    });
    expect(warn).toHaveBeenCalledTimes(1);

    editor.destroy();
  });
});
