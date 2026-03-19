import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(content = "<p></p>") {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
      }),
    ],
    content,
  });
}

describe("P28 core transaction and content behaviors", () => {
  it("preserves active stored marks when inserting plain text content", () => {
    const editor = createEditor("<p></p>");

    expect(editor.commands.setTextSelection(1)).toBe(true);
    expect(editor.commands.toggleBold()).toBe(true);
    expect(editor.commands.insertContent("Hello")).toBe(true);
    expect(editor.getHTML()).toBe("<p><strong>Hello</strong></p>");

    editor.destroy();
  });

  it("replaces an empty textblock when inserting block content", () => {
    const editor = createEditor("<p></p>");

    expect(editor.commands.setTextSelection(1)).toBe(true);
    expect(editor.commands.insertContent("<hr>")).toBe(true);
    expect(editor.getHTML()).toBe("<hr>");

    editor.destroy();
  });

  it("captures view-dispatched transactions without mutating editor state", () => {
    const editor = createEditor("<p>Hello</p>");
    const view = editor.view;

    if (!view) {
      throw new Error("Expected mounted editor view.");
    }

    const transaction = editor.captureTransaction(() => {
      view.dispatch(view.state.tr.insertText("!", 6));
    });

    expect(transaction).not.toBeNull();
    expect(transaction?.doc.textContent).toBe("Hello!");
    expect(editor.getText()).toBe("Hello");

    editor.destroy();
  });
});
