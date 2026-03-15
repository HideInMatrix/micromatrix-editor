import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@mxm-editor/core";
import { Link } from "@mxm-editor/extension-link";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function createEditor(
  extensionOptions: Record<string, any> = {},
  content = "<p></p>",
) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
        link: false,
      }),
      Link.configure(extensionOptions),
    ],
    content,
  });

  return { editor };
}

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

function pastePlainText(editor: Editor, text: string) {
  const view = editor.view;

  if (!view) {
    throw new Error("Expected mounted editor view.");
  }

  const event = {
    clipboardData: {
      getData: (type: string) => (type === "text/plain" ? text : ""),
    },
  } as unknown as ClipboardEvent;

  let handled = false;

  view.someProp("handlePaste", (handler) => {
    if (handler(view, event, null as never)) {
      handled = true;
      return true;
    }

    return false;
  });

  return handled;
}

function findTextRange(editor: Editor, text: string) {
  let range: { from: number; to: number } | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return true;
    }

    const index = node.text.indexOf(text);

    if (index === -1) {
      return true;
    }

    range = {
      from: pos + index,
      to: pos + index + text.length,
    };

    return false;
  });

  if (!range) {
    throw new Error(`Unable to find text range for "${text}".`);
  }

  return range;
}

describe("P14 link parity smoke", () => {
  it("autolinks on whitespace and supports deprecated validate option", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { editor } = createEditor({
      defaultProtocol: "https",
      validate: (url: string) => url.endsWith(".dev"),
    });

    editor.commands.setTextSelection(1);
    typeText(editor, "example.com ");

    expect(editor.getHTML()).not.toContain("<a");

    expect(editor.commands.setContent("<p></p>")).toBe(true);
    editor.commands.setTextSelection(1);
    typeText(editor, "tiptap.dev ");

    expect(editor.getHTML()).toContain('href="https://tiptap.dev"');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("unsets the whole link when the cursor is inside it", () => {
    const { editor } = createEditor(
      {},
      '<p><a href="https://tiptap.dev">Label</a></p>',
    );
    const range = findTextRange(editor, "Label");

    editor.commands.setTextSelection(range.from + 1);

    expect(editor.commands.unsetLink()).toBe(true);
    expect(editor.getHTML()).toBe("<p>Label</p>");
  });

  it("linkifies matching urls inside pasted plain text", () => {
    const { editor } = createEditor({
      defaultProtocol: "https",
    });

    editor.commands.setTextSelection(1);

    expect(
      pastePlainText(editor, "Visit example.com and https://tiptap.dev"),
    ).toBe(true);
    expect(editor.getHTML()).toContain("Visit ");
    expect(editor.getHTML()).toContain('href="https://example.com"');
    expect(editor.getHTML()).toContain('href="https://tiptap.dev"');
  });
});
