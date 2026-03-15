import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@mxm-editor/core";
import { Details } from "@mxm-editor/extension-details";
import { FileHandler } from "@mxm-editor/extension-file-handler";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function findTextPosition(editor: Editor, text: string) {
  let position = 0;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return true;
    }

    const index = node.text.indexOf(text);

    if (index === -1) {
      return true;
    }

    position = pos + index + 1;
    return false;
  });

  if (!position) {
    throw new Error(`Unable to find text position for "${text}".`);
  }

  return position;
}

describe("P7 input and structure smoke", () => {
  it("filters file paste and drop events like tiptap file handler", () => {
    const element = document.createElement("div");
    const imageFile = new File(["image"], "demo.png", { type: "image/png" });
    const textFile = new File(["text"], "demo.txt", { type: "text/plain" });
    const onPaste = vi.fn();
    const onDrop = vi.fn();

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
        }),
        FileHandler.configure({
          allowedMimeTypes: ["image/png"],
          onPaste,
          onDrop,
        }),
      ],
      content: "<p>seed</p>",
    });

    if (!editor.view) {
      throw new Error("Expected mounted editor view.");
    }

    editor.view.posAtCoords = () => ({
      pos: 4,
      inside: 0,
    });

    const pasteEvent = {
      clipboardData: {
        files: [imageFile, textFile],
        getData: (type: string) => (type === "text/html" ? "<p>from html</p>" : ""),
      },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as ClipboardEvent;
    let pasteHandled: boolean | undefined;

    editor.view.someProp("handlePaste", (handler) => {
      pasteHandled = handler(editor.view!, pasteEvent, null as any);
      return pasteHandled;
    });

    expect(pasteHandled).toBe(false);
    expect(onPaste).toHaveBeenCalledWith(editor, [imageFile], "<p>from html</p>");
    expect(pasteEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(pasteEvent.stopPropagation).toHaveBeenCalledTimes(1);

    const dropEvent = {
      clientX: 10,
      clientY: 20,
      dataTransfer: {
        files: [textFile, imageFile],
      },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as DragEvent;
    let dropHandled: boolean | undefined;

    editor.view.someProp("handleDrop", (handler) => {
      dropHandled = handler(editor.view!, dropEvent, null as any, false);
      return dropHandled;
    });

    expect(dropHandled).toBe(true);
    expect(onDrop).toHaveBeenCalledWith(editor, [imageFile], 4);
    expect(dropEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(dropEvent.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("wraps content into details blocks with setDetails", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
        }),
        Details,
      ],
      content: "<p>Body</p>",
    });
    const bodyStart = findTextPosition(editor, "Body");

    editor.commands.setTextSelection(bodyStart);

    expect(editor.commands.setDetails()).toBe(true);
    expect(editor.getHTML()).toContain("<details");
    expect(editor.getHTML()).toContain("<summary");
    expect(editor.getHTML()).toContain('data-type="detailsContent"');
    expect(editor.getHTML()).toContain("<p>Body</p>");
  });

  it("persists details open state and unwraps back to paragraphs", async () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
        }),
        Details.configure({
          persist: true,
        }),
      ],
      content: [
        "<details>",
        "<summary>Summary</summary>",
        '<div data-type="detailsContent"><p>Body</p></div>',
        "</details>",
      ].join(""),
    });

    await Promise.resolve();

    const toggle = element.querySelector("[data-details-toggle]");
    const detailsContent = element.querySelector(
      '[data-type="detailsContent"]',
    ) as HTMLElement | null;

    if (!(toggle instanceof HTMLButtonElement) || !detailsContent) {
      throw new Error("Expected details node view elements.");
    }

    expect(detailsContent.hasAttribute("hidden")).toBe(true);

    toggle.click();

    expect(detailsContent.hasAttribute("hidden")).toBe(false);
    expect(editor.getHTML()).toContain("<details open");

    editor.commands.focus("start");

    expect(editor.commands.unsetDetails()).toBe(true);
    expect(editor.getHTML()).not.toContain("<details");
    expect(editor.getHTML()).toContain("<p>Summary</p>");
    expect(editor.getHTML()).toContain("<p>Body</p>");
  });
});
