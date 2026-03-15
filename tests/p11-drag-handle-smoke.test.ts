import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@mxm-editor/core";
import { DragHandle } from "@mxm-editor/extension-drag-handle";
import { NodeSelection } from "@mxm-editor/pm";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

async function flushFrame() {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
  await Promise.resolve();
}

function getTextPosition(editor: Editor, text: string) {
  let resolvedPosition = 0;

  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text?.includes(text)) {
      resolvedPosition = pos + 1;
      return false;
    }

    return true;
  });

  return resolvedPosition;
}

function setRect(element: Element, rect: DOMRect) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => rect,
  });
}

describe("P11 drag handle smoke", () => {
  it("renders a drag handle, updates the hovered node, and supports lock/hide meta commands", async () => {
    const element = document.createElement("div");
    const nodeChanges: Array<string | null> = [];

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        DragHandle.configure({
          onNodeChange: ({ node }) => {
            nodeChanges.push(node?.type.name ?? null);
          },
        }),
      ],
      content: "<blockquote><p>Nested</p></blockquote><p>Second</p>",
    });
    const blockquote = element.querySelector("blockquote");

    expect(blockquote).not.toBeNull();

    setRect(blockquote!, new DOMRect(80, 40, 160, 56));

    const nestedTextPosition = getTextPosition(editor, "Nested");

    editor.view!.posAtCoords = () => ({
      inside: nestedTextPosition,
      pos: nestedTextPosition,
    });

    editor.view!.dom.dispatchEvent(new MouseEvent("mousemove", {
      bubbles: true,
      clientX: 96,
      clientY: 48,
    }));
    await flushFrame();

    const handle = element.querySelector(".drag-handle") as HTMLElement | null;

    expect(handle).not.toBeNull();
    expect(handle?.style.visibility).toBe("visible");
    expect(handle?.draggable).toBe(true);
    expect(nodeChanges.at(-1)).toBe("blockquote");

    expect(editor.commands.lockDragHandle()).toBe(true);
    expect(handle?.draggable).toBe(false);

    expect(editor.commands.unlockDragHandle()).toBe(true);
    expect(handle?.draggable).toBe(true);

    expect(editor.commands.setMeta("hideDragHandle", true)).toBe(true);
    expect(handle?.style.visibility).toBe("hidden");
    expect(nodeChanges.at(-1)).toBeNull();
  });

  it("prefers nested block targets when nested mode is enabled", async () => {
    const element = document.createElement("div");
    const nodeChange = vi.fn();

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        DragHandle.configure({
          nested: true,
          onNodeChange: nodeChange,
        }),
      ],
      content: "<blockquote><p>Nested</p></blockquote>",
    });
    const paragraph = element.querySelector("blockquote p");

    expect(paragraph).not.toBeNull();

    setRect(paragraph!, new DOMRect(96, 40, 160, 32));

    const nestedTextPosition = getTextPosition(editor, "Nested");

    editor.view!.posAtCoords = () => ({
      inside: nestedTextPosition,
      pos: nestedTextPosition,
    });

    editor.view!.dom.dispatchEvent(new MouseEvent("mousemove", {
      bubbles: true,
      clientX: 148,
      clientY: 62,
    }));
    await flushFrame();

    expect(nodeChange).toHaveBeenCalled();
    expect(nodeChange.mock.calls.at(-1)?.[0].node?.type.name).toBe("paragraph");
  });

  it("registers a move drag state so dragged nodes are moved instead of copied", async () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        DragHandle,
      ],
      content: "<p>Draggable</p>",
    });
    const paragraph = element.querySelector("p");

    expect(paragraph).not.toBeNull();

    setRect(paragraph!, new DOMRect(80, 40, 160, 32));

    const textPosition = getTextPosition(editor, "Draggable");

    editor.view!.posAtCoords = () => ({
      inside: textPosition,
      pos: textPosition,
    });

    editor.view!.dom.dispatchEvent(new MouseEvent("mousemove", {
      bubbles: true,
      clientX: 96,
      clientY: 48,
    }));
    await flushFrame();

    const handle = element.querySelector(".drag-handle") as HTMLElement | null;
    const dataTransfer = {
      effectAllowed: "",
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };
    const dragEvent = new Event("dragstart", {
      bubbles: true,
    }) as DragEvent;

    expect(handle).not.toBeNull();

    Object.defineProperty(dragEvent, "dataTransfer", {
      configurable: true,
      value: dataTransfer,
    });

    handle!.dispatchEvent(dragEvent);

    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    expect(editor.view!.dragging).not.toBeNull();
    expect(editor.view!.dragging?.move).toBe(true);
    expect(dataTransfer.effectAllowed).toBe("copyMove");
  });
});
