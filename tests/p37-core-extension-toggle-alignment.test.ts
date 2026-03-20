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

function createEditor(options: Partial<ConstructorParameters<typeof Editor>[0]> = {}) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    content: "<p>Hello world</p>",
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

function getViewProp<T>(editor: Editor, name: string): T | undefined {
  let value: T | undefined;

  editor.view?.someProp(name as never, (prop: T) => {
    value = prop;
    return true;
  });

  return value;
}

describe("P37 core extension toggle alignment", () => {
  it("disables all built-in core extensions when configured", () => {
    const editor = createEditor({
      enableCoreExtensions: false,
    });
    const extensionNames = editor.extensionManager.extensions.map((extension) => extension.name);

    expect(extensionNames).not.toContain("editable");
    expect(extensionNames).not.toContain("clipboardTextSerializer");
    expect(extensionNames).not.toContain("commands");
    expect(extensionNames).not.toContain("focusEvents");
    expect(extensionNames).not.toContain("keymap");
    expect(extensionNames).not.toContain("tabindex");
    expect(extensionNames).not.toContain("drop");
    expect(extensionNames).not.toContain("paste");
    expect(extensionNames).not.toContain("delete");
    expect(extensionNames).not.toContain("textDirection");
    expect(editor.view?.dom.getAttribute("tabindex")).toBeNull();
    expect(
      typeof (editor.commands as Record<string, unknown>).keyboardShortcut,
    ).toBe("undefined");

    editor.destroy();
  });

  it("can disable individual built-in extensions by name", () => {
    const editor = createEditor({
      content: "<p>Hello world</p>",
      enableCoreExtensions: {
        clipboardTextSerializer: false,
        keymap: false,
        tabindex: false,
        textDirection: false,
      },
      coreExtensionOptions: {
        clipboardTextSerializer: {
          blockSeparator: " | ",
        },
        textDirection: {
          direction: "rtl",
        },
      },
    });
    const extensionNames = editor.extensionManager.extensions.map((extension) => extension.name);

    expect(extensionNames).toContain("commands");
    expect(extensionNames).not.toContain("clipboardTextSerializer");
    expect(extensionNames).not.toContain("keymap");
    expect(extensionNames).not.toContain("tabindex");
    expect(extensionNames).not.toContain("textDirection");
    expect(editor.view?.dom.getAttribute("tabindex")).toBeNull();
    expect(editor.view?.dom.getAttribute("dir")).toBeNull();
    expect(editor.getHTML()).toBe("<p>Hello world</p>");
    expect(getViewProp(editor, "clipboardTextSerializer")).toBeUndefined();
    expect(editor.commands.setTextSelection(7)).toBe(true);
    expect(editor.commands.selectAll()).toBe(true);

    editor.destroy();
  });
});
