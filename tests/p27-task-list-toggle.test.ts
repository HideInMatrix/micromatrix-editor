import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { Document } from "@mxm-editor/extension-document";
import { Paragraph } from "@mxm-editor/extension-paragraph";
import { TaskItem } from "@mxm-editor/extension-task-item";
import { TaskList } from "@mxm-editor/extension-task-list";
import { Text } from "@mxm-editor/extension-text";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(content = "<p></p>") {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    extensions: [
      Document,
      Paragraph,
      Text,
      TaskItem,
      TaskList,
    ],
    content,
  });
}

function findTextPosition(editor: Editor, text: string) {
  let position = 0;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return true;
    }

    const index = node.text.indexOf(text);

    if (index === -1) {
      return true;
    }

    position = pos + index + 1;
    return false;
  });

  if (!position) {
    throw new Error(`Unable to find text position for "${text}".`);
  }

  return position;
}

describe("P27 task list toggle command", () => {
  it("wraps paragraphs into task lists through the shared core toggleList", () => {
    const editor = createEditor("<p>Task</p>");

    expect(editor.commands.selectAll()).toBe(true);
    expect(editor.commands.toggleTaskList()).toBe(true);
    expect(editor.getHTML()).toContain(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false">',
    );

    editor.destroy();
  });

  it("lifts content out of a task list when toggled again", () => {
    const editor = createEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><div><p>Task</p></div></li></ul>',
    );

    expect(editor.commands.setTextSelection(findTextPosition(editor, "Task"))).toBe(true);
    expect(editor.commands.toggleTaskList()).toBe(true);
    expect(editor.getHTML()).toBe("<p>Task</p>");

    editor.destroy();
  });
});
