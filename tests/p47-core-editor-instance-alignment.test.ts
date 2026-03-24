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

function createExtensions(extraExtensions: ConstructorParameters<typeof Editor>[0]["extensions"] = []) {
  return [
    StarterKit.configure({
      undoRedo: false,
      trailingNode: false,
    }),
    ...extraExtensions,
  ];
}

function createEditor(options: Partial<ConstructorParameters<typeof Editor>[0]> = {}) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    content: "<p>Hello</p>",
    ...options,
    extensions: createExtensions(options.extensions),
  });
}

describe("P47 core editor instance alignment", () => {
  it("exposes a tiptap-style instance id and storage alias", () => {
    const editor = createEditor();

    expect(editor.instanceId).toMatch(/^[a-z0-9]{7}$/);
    expect(editor.extensionStorage).toBe(editor.storage);
    expect(editor.extensionStorage).toBe(editor.extensionManager.storage);

    editor.destroy();
  });

  it("keeps extensionStorage synchronized when extensions are rebuilt", () => {
    const First = Extension.create({
      name: "firstStorageProbe",

      addStorage() {
        return {
          value: "first",
        };
      },
    });
    const Second = Extension.create({
      name: "secondStorageProbe",

      addStorage() {
        return {
          value: "second",
        };
      },
    });
    const editor = createEditor({
      extensions: [First],
    });
    const initialStorage = editor.extensionStorage;

    expect(initialStorage.firstStorageProbe).toEqual({
      value: "first",
    });
    expect(editor.storage).toBe(initialStorage);

    editor.setOptions({
      extensions: createExtensions([Second]),
    });

    expect(editor.extensionStorage).toBe(editor.storage);
    expect(editor.extensionStorage).toBe(editor.extensionManager.storage);
    expect(editor.extensionStorage).not.toBe(initialStorage);
    expect("firstStorageProbe" in editor.extensionStorage).toBe(false);
    expect(editor.extensionStorage.secondStorageProbe).toEqual({
      value: "second",
    });

    editor.destroy();
  });
});
