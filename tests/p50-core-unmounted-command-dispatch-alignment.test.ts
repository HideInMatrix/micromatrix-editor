import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import { Editor } from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";
import { flushEditorCreate } from "./helpers/flushEditorCreate";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(options: Partial<ConstructorParameters<typeof Editor>[0]> = {}) {
  return new Editor({
    content: "<p>Hello</p>",
    ...options,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
      }),
      ...(options.extensions ?? []),
    ],
  });
}

describe("P50 core unmounted command dispatch alignment", () => {
  it("applies commands to editor state before mount and preserves them after mount", async () => {
    const records: string[] = [];
    const editor = createEditor({
      onTransaction: () => {
        records.push("transaction");
      },
      onSelectionUpdate: () => {
        records.push("selection");
      },
      onUpdate: () => {
        records.push("update");
      },
    });

    expect(editor.view).toBeNull();
    expect(editor.chain().focus("end").insertContent("!").run()).toBe(true);
    expect(editor.getHTML()).toBe("<p>Hello!</p>");
    expect(editor.getText()).toBe("Hello!");
    expect(records).toEqual([
      "transaction",
      "selection",
      "update",
    ]);

    const element = document.createElement("div");

    document.body.appendChild(element);
    editor.mount(element);
    await flushEditorCreate();

    expect(editor.view?.dom.textContent).toContain("Hello!");

    editor.destroy();
  });

  it("supports chained selection changes before mount", () => {
    const editor = createEditor();

    expect(editor.commands.setTextSelection(3)).toBe(true);
    expect(editor.state.selection.from).toBe(3);
    expect(editor.state.selection.to).toBe(3);

    expect(editor.chain().insertContent("!").run()).toBe(true);
    expect(editor.getText()).toBe("He!llo");

    editor.destroy();
  });
});
