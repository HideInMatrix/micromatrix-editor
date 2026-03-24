import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Editor } from "@mxm-editor/core";
import {
  Plugin,
  PluginKey,
} from "@mxm-editor/pm";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor() {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    content: "<p>Hello world</p>",
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
      }),
    ],
  });
}

describe("P48 core destroy guard alignment", () => {
  it("treats mutating APIs as no-ops after destroy", () => {
    const editor = createEditor();
    const pluginKey = new PluginKey("destroyGuardProbe");
    const plugin = new Plugin({ key: pluginKey });
    const updateSpy = vi.fn();

    editor.on("update", updateSpy);
    editor.registerPlugin(plugin);

    expect(pluginKey.get(editor.state)).toBeDefined();
    expect(editor.getHTML()).toBe("<p>Hello world</p>");

    editor.destroy();

    editor.setOptions({
      editable: false,
      enableCoreExtensions: false,
    });
    editor.setEditable(false);
    editor.setContent("<p>Changed after destroy</p>");

    expect(editor.unregisterPlugin(pluginKey)).toBeUndefined();
    expect(editor.isDestroyed).toBe(true);
    expect(editor.options.editable).toBe(true);
    expect(editor.options.enableCoreExtensions).toBe(true);
    expect(editor.getHTML()).toBe("<p>Hello world</p>");
    expect(pluginKey.get(editor.state)).toBeDefined();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("allows destroy to be called multiple times safely", () => {
    const editor = createEditor();

    editor.destroy();

    expect(() => editor.destroy()).not.toThrow();
    expect(editor.isDestroyed).toBe(true);
  });
});
