import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  Editor,
  Extension,
} from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createExtensions(extra: any[] = []) {
  return [
    StarterKit.configure({
      undoRedo: false,
      trailingNode: false,
    }),
    ...extra,
  ];
}

function createEditor(options: Partial<ConstructorParameters<typeof Editor>[0]> = {}) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    content: "<p>Hello world</p>",
    ...options,
    extensions: options.extensions ?? createExtensions(),
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

describe("P38 core setOptions alignment", () => {
  it("rebuilds built-in core extensions when enableCoreExtensions changes", () => {
    const editor = createEditor();

    expect(editor.view?.dom.getAttribute("tabindex")).toBe("0");
    expect(typeof editor.commands.keyboardShortcut).toBe("function");

    editor.setOptions({
      enableCoreExtensions: {
        tabindex: false,
        keymap: false,
      },
    });

    const extensionNames = editor.extensionManager.extensions.map((extension) => extension.name);

    expect(extensionNames).not.toContain("tabindex");
    expect(extensionNames).not.toContain("keymap");
    expect(editor.view?.dom.getAttribute("tabindex")).toBeNull();
    expect(editor.commands.setTextSelection(7)).toBe(true);
    expect(editor.commands.selectAll()).toBe(true);

    editor.destroy();
  });

  it("rebuilds schema-backed core options when text direction config changes", () => {
    const editor = createEditor();

    expect(editor.getHTML()).toBe("<p>Hello world</p>");
    expect(editor.view?.dom.getAttribute("dir")).toBeNull();

    editor.setOptions({
      coreExtensionOptions: {
        textDirection: {
          direction: "rtl",
        },
      },
    });

    expect(editor.view?.dom.getAttribute("dir")).toBe("rtl");
    expect(editor.getHTML()).toBe('<p dir="rtl">Hello world</p>');

    editor.destroy();
  });

  it("removes old extension lifecycle listeners when extensions are replaced", () => {
    const records: string[] = [];
    const First = Extension.create({
      name: "firstSetOptionsProbe",

      onUpdate() {
        records.push("first");
      },
    });
    const Second = Extension.create({
      name: "secondSetOptionsProbe",

      onUpdate() {
        records.push("second");
      },
    });
    const editor = createEditor({
      extensions: createExtensions([First]),
    });

    records.length = 0;

    editor.setOptions({
      extensions: createExtensions([Second]),
    });

    expect(editor.commands.insertContent("!")).toBe(true);
    expect(records).toEqual(["second"]);
    expect(typeof getViewProp(editor, "clipboardTextSerializer")).toBe("function");

    editor.destroy();
  });
});
