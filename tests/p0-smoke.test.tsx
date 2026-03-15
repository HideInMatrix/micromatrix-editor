import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { MarkdownManager } from "@mxm-editor/markdown";
import {
  EditorProvider,
  useCurrentEditor,
  useEditorState,
} from "@mxm-editor/react";
import { Plugin, PluginKey } from "@mxm-editor/pm";
import { StarterKit } from "@mxm-editor/starter-kit";
import { Table } from "@mxm-editor/extension-table";
import { TaskItem } from "@mxm-editor/extension-task-item";
import { TaskList } from "@mxm-editor/extension-task-list";

afterEach(() => {
  document.body.innerHTML = "";
});

function createExtensions() {
  return [
    StarterKit.configure({
      undoRedo: false,
    }),
    TaskItem,
    TaskList,
    Table,
  ];
}

describe("P0 smoke", () => {
  it("supports core editor APIs and commands", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: createExtensions(),
      content: '<p><a href="https://mxm.dev">hello</a></p>',
    });

    expect(editor.isEditable).toBe(true);
    expect(editor.isDestroyed).toBe(false);
    expect(editor.getAttributes("link").href).toBe("https://mxm.dev");

    editor.setEditable(false);
    expect(editor.isEditable).toBe(false);

    expect(editor.commands.setContent("<h2>Headline</h2><p>Body</p>")).toBe(true);
    expect(editor.isActive("heading", { level: 2 })).toBe(true);

    expect(editor.commands.setTextSelection(1)).toBe(true);
    expect(editor.chain().focus().insertContent("<hr>").run()).toBe(true);
    expect(editor.getHTML()).toContain("<hr");

    editor.commands.setContent("<p>One<br>Two</p>");
    expect(editor.getText()).toContain("One\nTwo");

    const pluginKey = new PluginKey("smoke");
    const plugin = new Plugin({ key: pluginKey });

    editor.registerPlugin(plugin);
    expect(pluginKey.get(editor.state)).toBeDefined();
    editor.unregisterPlugin(pluginKey as PluginKey | string);
    expect(pluginKey.get(editor.state)).toBeUndefined();

    editor.destroy();
    expect(editor.isDestroyed).toBe(true);
  });

  it("serializes markdown with hard break and horizontal rule", () => {
    const markdownManager = new MarkdownManager({
      extensions: createExtensions(),
    });
    const documentNode = markdownManager.parse([
      "before  ",
      "after",
      "",
      "---",
      "",
      "| A | B |",
      "| --- | --- |",
      "| 1 | 2 |",
    ].join("\n"));
    const serialized = markdownManager.serialize(documentNode);

    expect(serialized).toContain("before  \nafter");
    expect(serialized).toContain("---");
    expect(serialized).toContain("| A | B |");
  });

  it("accepts ProseMirror documents from another schema instance in setContent", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: createExtensions(),
      content: "<p>seed</p>",
    });
    const markdownManager = new MarkdownManager({
      extensions: createExtensions(),
    });

    editor.setContent(markdownManager.parse([
      "## Shared",
      "",
      "- [x] Task",
      "",
      "| A | B |",
      "| --- | --- |",
      "| 1 | 2 |",
    ].join("\n")));

    expect(editor.getHTML()).toContain("<h2");
    expect(editor.getHTML()).toContain('data-type="taskList"');
    expect(editor.getHTML()).toContain("<table");
  });

  it("provides editor context and derived state in react", async () => {
    const container = document.createElement("div");

    document.body.appendChild(container);

    function Probe() {
      const { editor } = useCurrentEditor();
      const isEditable = useEditorState({
        selector: ({ editor: currentEditor }) => currentEditor?.isEditable ?? false,
      });

      return (
        <div
          data-editor={editor ? "ready" : "missing"}
          data-editable={String(isEditable)}
        />
      );
    }

    const root = createRoot(container);

    await act(async () => {
      root.render(
        <EditorProvider
          extensions={createExtensions()}
          content="<p>React provider</p>"
          slotBefore={<div data-slot="before" />}
          slotAfter={<div data-slot="after" />}
          editorContainerProps={{ className: "provider-surface" }}
        >
          <Probe />
        </EditorProvider>,
      );
    });

    expect(container.querySelector('[data-slot="before"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="after"]')).not.toBeNull();
    expect(container.querySelector('[data-editor="ready"]')).not.toBeNull();
    expect(container.querySelector(".provider-surface")).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
  });

  it("caches object snapshots in useEditorState", async () => {
    const container = document.createElement("div");

    document.body.appendChild(container);

    function Probe() {
      const snapshot = useEditorState({
        selector: ({ editor: currentEditor }) => ({
          editable: currentEditor?.isEditable ?? false,
          empty: currentEditor?.isEmpty ?? true,
        }),
      });

      return (
        <div
          data-editable={String(snapshot.editable)}
          data-empty={String(snapshot.empty)}
        />
      );
    }

    const root = createRoot(container);

    await act(async () => {
      root.render(
        <EditorProvider
          extensions={createExtensions()}
          content="<p>Object snapshot</p>"
        >
          <Probe />
        </EditorProvider>,
      );
    });

    expect(container.querySelector('[data-editable="true"]')).not.toBeNull();
    expect(container.querySelector('[data-empty="false"]')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
  });
});
