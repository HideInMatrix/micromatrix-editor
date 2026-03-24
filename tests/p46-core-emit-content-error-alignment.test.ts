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

describe("P46 core emitContentError alignment", () => {
  it("emits contentError in non-strict insertContent flows while keeping the command successful", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const records: string[] = [];
    const editor = createEditor({
      emitContentError: true,
      onContentError: ({ error }) => {
        records.push(error.message);
      },
    });

    expect(editor.commands.setTextSelection(6)).toBe(true);
    expect(
      editor.commands.insertContent(
        {
          type: "unknown-node",
        },
      ),
    ).toBe(true);

    expect(records).toEqual([
      "[mxm-editor error]: Invalid JSON content",
    ]);
    expect(editor.getHTML()).toBe("<p>Hello</p>");
    expect(warn).toHaveBeenCalledTimes(1);

    editor.destroy();
  });
});
