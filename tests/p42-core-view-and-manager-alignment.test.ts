import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  Editor,
  Extension,
  ExtensionManager,
} from "@mxm-editor/core";
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

describe("P42 core view and manager alignment", () => {
  it("adds a textbox role while preserving custom editor attributes", () => {
    const editor = createEditor({
      editorProps: {
        attributes: {
          "data-probe": "yes",
        },
      },
    });

    expect(editor.view?.dom.getAttribute("role")).toBe("textbox");
    expect(editor.view?.dom.getAttribute("data-probe")).toBe("yes");

    editor.destroy();
  });

  it("supports attribute resolvers while keeping the default textbox role", () => {
    const editor = createEditor({
      editorProps: {
        attributes: (state) => ({
          "data-doc-size": String(state.doc.content.size),
        }),
      },
    });

    expect(editor.view?.dom.getAttribute("role")).toBe("textbox");
    expect(editor.view?.dom.getAttribute("data-doc-size")).toBeTruthy();

    editor.destroy();
  });

  it("exposes ExtensionManager flatten, sort, and resolve helpers", () => {
    const records: string[] = [];
    const Child = Extension.create({
      name: "managerChildProbe",
      priority: 50,
    });
    const Parent = Extension.create({
      name: "managerParentProbe",
      priority: 100,

      addExtensions() {
        return [Child];
      },
    });
    const High = Extension.create({
      name: "managerHighProbe",
      priority: 1000,
    });
    const flattened = ExtensionManager.flatten([Parent, High]);
    const sorted = ExtensionManager.sort(flattened);
    const resolved = ExtensionManager.resolve([Parent, High]);

    records.push(...flattened.map((extension) => extension.name));

    expect(records).toEqual([
      "managerParentProbe",
      "managerChildProbe",
      "managerHighProbe",
    ]);
    expect(sorted.map((extension) => extension.name)).toEqual([
      "managerHighProbe",
      "managerParentProbe",
      "managerChildProbe",
    ]);
    expect(resolved.map((extension) => extension.name)).toEqual([
      "managerHighProbe",
      "managerParentProbe",
      "managerChildProbe",
    ]);
  });
});
