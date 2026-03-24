import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  Editor,
  Extension,
} from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(options: Partial<ConstructorParameters<typeof Editor>[0]> = {}) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    content: "<p>Hello</p>",
    ...options,
    extensions: options.extensions ?? [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
      }),
    ],
  });
}

describe("P45 core insert content alignment", () => {
  it("returns false and emits contentError when strict insert content validation fails", () => {
    const records: string[] = [];
    const editor = createEditor({
      onContentError: ({ error }) => {
        records.push(error.message);
      },
    });

    expect(
      editor.commands.insertContent(
        {
          type: "unknown-node",
        },
        {
          errorOnInvalidContent: true,
        },
      ),
    ).toBe(false);
    expect(records).toEqual([
      "[mxm-editor error]: Invalid JSON content",
    ]);
    expect(editor.getHTML()).toBe("<p>Hello</p>");

    editor.destroy();
  });

  it("forwards applyInputRules and applyPasteRules metadata through insertContentAt", () => {
    const metaRecords: Array<{
      input: unknown;
      paste: unknown;
    }> = [];
    const MetaProbe = Extension.create({
      name: "insertContentMetaProbe",

      onTransaction({ transaction }) {
        const input = transaction.getMeta("applyInputRules");
        const paste = transaction.getMeta("applyPasteRules");

        if (input || paste) {
          metaRecords.push({
            input,
            paste,
          });
        }
      },
    });
    const editor = createEditor({
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
        }),
        MetaProbe,
      ],
    });

    expect(editor.commands.setTextSelection(6)).toBe(true);
    expect(
      editor.commands.insertContentAt(
        6,
        "!",
        {
          applyInputRules: true,
          applyPasteRules: true,
        },
      ),
    ).toBe(true);

    expect(editor.getHTML()).toBe("<p>Hello!</p>");
    expect(metaRecords).toEqual([
      {
        input: {
          from: 6,
          text: "!",
        },
        paste: {
          from: 6,
          text: "!",
        },
      },
    ]);

    editor.destroy();
  });
});
