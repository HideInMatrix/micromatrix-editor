import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { TextAlign } from "@mxm-editor/extension-text-align";
import { ListKit } from "@mxm-editor/list-kit";
import { StarterKit } from "@mxm-editor/starter-kit";
import { TableKit } from "@mxm-editor/table-kit";
import { TextStyleKit } from "@mxm-editor/text-style-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("P3 alignment smoke", () => {
  it("merges multiple inline text style attributes through TextStyleKit", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
        }),
        TextStyleKit,
      ],
      content: "<p>hello</p>",
    });

    editor.commands.setTextSelection({ from: 1, to: 6 });

    expect(editor.commands.setColor("#ff5a36")).toBe(true);
    expect(editor.commands.setBackgroundColor("#fff3b0")).toBe(true);
    expect(editor.commands.setFontFamily("Georgia")).toBe(true);
    expect(editor.commands.setFontSize("18px")).toBe(true);

    const html = editor.getHTML();
    const attrs = editor.getAttributes("textStyle");

    expect(attrs.color).toBe("#ff5a36");
    expect(attrs.backgroundColor).toBe("#fff3b0");
    expect(attrs.fontFamily).toBe("Georgia");
    expect(attrs.fontSize).toBe("18px");
    expect(html).toContain("color:");
    expect(html).toContain("background-color:");
    expect(html).toContain("font-family: Georgia");
    expect(html).toContain("font-size: 18px");
    expect((html.match(/<span/g) ?? []).length).toBe(1);
  });

  it("merges line-height and text-align styles on the same block node", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
        }),
        TextAlign,
        TextStyleKit,
      ],
      content: "<p>hello</p>",
    });

    editor.commands.setTextSelection({ from: 1, to: 6 });

    expect(editor.commands.setTextAlign("center")).toBe(true);
    expect(editor.commands.setLineHeight("1.8")).toBe(true);

    const html = editor.getHTML();

    expect(html).toContain("text-align: center");
    expect(html).toContain("line-height: 1.8");
  });

  it("supports task list commands through ListKit", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          trailingNode: false,
        }),
        ListKit,
      ],
      content: "<p>todo</p>",
    });

    editor.commands.setTextSelection({ from: 1, to: 5 });

    expect(editor.commands.setTaskList()).toBe(true);
    expect(editor.getHTML()).toContain('data-type="taskList"');
    expect(editor.getHTML()).toContain('data-type="taskItem"');

    expect(editor.commands.toggleTaskItemChecked()).toBe(true);
    expect(editor.getHTML()).toContain('data-checked="true"');
  });

  it("toggles task item state when the checkbox UI is clicked", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          trailingNode: false,
        }),
        ListKit,
      ],
      content: "<p>todo</p>",
    });

    editor.commands.setTextSelection({ from: 1, to: 5 });
    expect(editor.commands.setTaskList()).toBe(true);

    const checkbox = element.querySelector(
      'li[data-type="taskItem"] input[type="checkbox"]',
    ) as HTMLInputElement | null;

    expect(checkbox).not.toBeNull();

    checkbox!.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
    }));

    expect(editor.getHTML()).toContain('data-checked="true"');
  });

  it("inserts tables through TableKit", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
        }),
        TableKit,
      ],
      content: "<p></p>",
    });

    expect(
      editor.commands.insertTable({
        rows: 2,
        cols: 2,
        withHeaderRow: true,
      }),
    ).toBe(true);

    const html = editor.getHTML();

    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
  });

  it("includes trailing node behavior in StarterKit by default", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
      ],
      content: "<p>start</p>",
    });

    expect(editor.commands.setContent("<blockquote><p>quote</p></blockquote>")).toBe(true);
    expect(editor.getJSON().content?.at(-1)).toEqual({
      type: "paragraph",
    });
  });
});
