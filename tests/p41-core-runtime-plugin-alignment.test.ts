import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import { Editor } from "@mxm-editor/core";
import {
  Plugin,
  PluginKey,
} from "@mxm-editor/pm";
import { Document } from "@mxm-editor/extension-document";
import { Paragraph } from "@mxm-editor/extension-paragraph";
import { Text } from "@mxm-editor/extension-text";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(options: Partial<ConstructorParameters<typeof Editor>[0]> = {}) {
  return new Editor({
    content: "<p>Hello</p>",
    ...options,
    extensions: [
      Document,
      Paragraph,
      Text,
      ...(options.extensions ?? []),
    ],
  });
}

describe("P41 core runtime plugin alignment", () => {
  it("registers runtime plugins before mount and keeps them after mount", () => {
    const editor = createEditor();
    const pluginKey = new PluginKey("runtimeProbe");
    const plugin = new Plugin({
      key: pluginKey,
      props: {
        attributes: {
          "data-runtime-probe": "yes",
        },
      },
    });
    const state = editor.registerPlugin(plugin);
    const element = document.createElement("div");

    document.body.appendChild(element);

    expect(pluginKey.get(state)).toBeDefined();
    expect(pluginKey.get(editor.state)).toBeDefined();

    editor.mount(element);

    expect(editor.view?.dom.getAttribute("data-runtime-probe")).toBe("yes");

    editor.destroy();
  });

  it("unregisters runtime plugins by string key and supports key arrays", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = createEditor({ element });
    const firstKey = new PluginKey("runtimeFirst");
    const secondKey = new PluginKey("runtimeSecond");

    editor.registerPlugin(new Plugin({ key: firstKey }));
    editor.registerPlugin(new Plugin({ key: secondKey }));

    expect(firstKey.get(editor.state)).toBeDefined();
    expect(secondKey.get(editor.state)).toBeDefined();

    const removed = editor.unregisterPlugin(["runtimeFirst", secondKey]);

    expect(removed).toBeDefined();
    expect(firstKey.get(editor.state)).toBeUndefined();
    expect(secondKey.get(editor.state)).toBeUndefined();
    expect(editor.unregisterPlugin("missing-runtime-plugin")).toBeUndefined();

    editor.destroy();
  });

  it("passes the full current plugin list to registerPlugin handlers", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = createEditor({ element });
    const plugin = new Plugin({
      key: new PluginKey("orderedRuntimeProbe"),
    });
    let seenPluginCount = 0;

    editor.registerPlugin(plugin, (newPlugin, plugins) => {
      seenPluginCount = plugins.length;

      return [newPlugin, ...plugins];
    });

    expect(seenPluginCount).toBeGreaterThan(0);
    expect(editor.state.plugins.some((item) => item === plugin)).toBe(true);

    editor.destroy();
  });
});
