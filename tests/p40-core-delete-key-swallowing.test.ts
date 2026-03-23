import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import { Editor } from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(content = "<p>Hello world</p>") {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    content,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
      }),
    ],
  });
}

function triggerShortcut(editor: Editor, key: string) {
  const view = editor.view;

  if (!view) {
    throw new Error("Expected mounted editor view.");
  }

  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  let handled = false;

  view.someProp("handleKeyDown", (handler) => {
    handled = handler(view, event);
    return handled;
  });

  return handled;
}

describe("P40 core delete key swallowing", () => {
  it("does not mark empty cursor deletion as handled", () => {
    const editor = createEditor();

    expect(editor.commands.setTextSelection(7)).toBe(true);
    expect(editor.commands.deleteSelection()).toBe(false);
    expect(triggerShortcut(editor, "Backspace")).toBe(false);
    expect(triggerShortcut(editor, "Delete")).toBe(false);

    editor.destroy();
  });

  it("still deletes a real text selection", () => {
    const editor = createEditor();

    expect(editor.commands.setTextSelection({ from: 7, to: 12 })).toBe(true);
    expect(editor.commands.deleteSelection()).toBe(true);
    expect(editor.getText()).toBe("Hello ");

    editor.destroy();
  });
});
