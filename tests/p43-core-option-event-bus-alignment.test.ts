import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Editor } from "@mxm-editor/core";
import { Fragment, Slice } from "@mxm-editor/pm";
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

describe("P43 core option event bus alignment", () => {
  it("routes option callbacks through the editor event bus exactly once", () => {
    const onUpdate = vi.fn();
    const onPaste = vi.fn();
    const onDrop = vi.fn();
    const editor = createEditor({
      onUpdate,
      onPaste,
      onDrop,
    });
    const pasteEvent = {
      clipboardData: {
        getData: () => "",
      },
    } as ClipboardEvent;
    const dropEvent = {
      dataTransfer: null,
    } as DragEvent;
    const slice = new Slice(
      Fragment.from(editor.schema.text("payload")),
      0,
      0,
    );

    expect(editor.commands.insertContent("!")).toBe(true);
    editor.view?.someProp("handlePaste", (handler) => {
      handler(editor.view!, pasteEvent, slice);
      return false;
    });
    editor.view?.someProp("handleDrop", (handler) => {
      handler(editor.view!, dropEvent, slice, true);
      return false;
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onPaste).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledTimes(1);

    editor.destroy();
  });

  it("uses the latest option callbacks after setOptions without duplicating older handlers", () => {
    const first = vi.fn();
    const second = vi.fn();
    const editor = createEditor({
      onUpdate: first,
    });

    first.mockClear();
    editor.setOptions({
      onUpdate: second,
    });

    expect(editor.commands.insertContent("!")).toBe(true);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    editor.destroy();
  });
});
