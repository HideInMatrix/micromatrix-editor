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
    content: "<p></p>",
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

describe("P36 core builtins alignment", () => {
  it("uses the clipboard text serializer core extension with custom block separators", () => {
    const editor = createEditor({
      content: "<p>Alpha</p><p>Beta</p>",
      coreExtensionOptions: {
        clipboardTextSerializer: {
          blockSeparator: " | ",
        },
      },
    });
    const serialize = getViewProp<() => string>(editor, "clipboardTextSerializer");

    expect(editor.commands.selectAll()).toBe(true);
    expect(serialize?.()).toBe("Alpha | Beta");

    editor.destroy();
  });

  it("applies built-in text direction attributes and commands when configured", () => {
    const editor = createEditor({
      content: "<p>Alpha</p><p>Beta</p>",
      coreExtensionOptions: {
        textDirection: {
          direction: "rtl",
        },
      },
    });

    expect(editor.view?.dom.getAttribute("dir")).toBe("rtl");
    expect(editor.getHTML()).toBe('<p dir="rtl">Alpha</p><p dir="rtl">Beta</p>');

    expect(editor.commands.selectAll()).toBe(true);
    expect(editor.commands.setTextDirection("ltr")).toBe(true);
    expect(editor.getHTML()).toBe('<p dir="ltr">Alpha</p><p dir="ltr">Beta</p>');

    expect(editor.commands.selectAll()).toBe(true);
    expect(editor.commands.unsetTextDirection()).toBe(true);
    expect(editor.getHTML()).toBe('<p dir="rtl">Alpha</p><p dir="rtl">Beta</p>');

    editor.destroy();
  });
});
