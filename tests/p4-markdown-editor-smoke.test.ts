import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { Table } from "@mxm-editor/extension-table";
import { TaskItem } from "@mxm-editor/extension-task-item";
import { TaskList } from "@mxm-editor/extension-task-list";
import { Markdown } from "@mxm-editor/markdown";
import { StarterKit } from "@mxm-editor/starter-kit";

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
    Markdown,
  ];
}

describe("P4 markdown editor smoke", () => {
  it("supports markdown as initial editor content and exposes getMarkdown", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: createExtensions(),
      content: [
        "# Title",
        "",
        "- [x] Task",
      ].join("\n"),
      contentType: "markdown",
    });

    expect(editor.markdown).not.toBeNull();
    expect(editor.isActive("heading", { level: 1 })).toBe(true);
    expect(editor.getHTML()).toContain('data-type="taskList"');
    expect(editor.getMarkdown()).toContain("# Title");
    expect(editor.getMarkdown()).toContain("- [x] Task");
  });

  it("supports markdown contentType in setContent and insertContentAt", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: createExtensions(),
      content: "<p>seed</p>",
    });

    expect(
      editor.commands.setContent(
        [
          "## Section",
          "",
          "Body",
        ].join("\n"),
        { contentType: "markdown" },
      ),
    ).toBe(true);
    expect(editor.isActive("heading", { level: 2 })).toBe(true);

    expect(
      editor.commands.insertContentAt(
        editor.state.doc.content.size,
        [
          "",
          "| A | B |",
          "| --- | --- |",
          "| 1 | 2 |",
        ].join("\n"),
        { contentType: "markdown" },
      ),
    ).toBe(true);

    expect(editor.getHTML()).toContain("<table");
    expect(editor.getMarkdown()).toContain("## Section");
    expect(editor.getMarkdown()).toContain("| A | B |");
  });
});
