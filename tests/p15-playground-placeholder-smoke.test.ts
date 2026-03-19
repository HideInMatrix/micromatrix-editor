import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { createPlaygroundExtensions } from "../apps/playground/src/playground/extensions";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("P15 playground placeholder smoke", () => {
  it("shows the command placeholder only for the active empty paragraph", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: createPlaygroundExtensions(),
      content: "<p>seed</p><p></p><p></p><p></p>",
    });

    editor.commands.focus("end");

    const placeholders = element.querySelectorAll('p[data-placeholder]');

    expect(placeholders).toHaveLength(1);
    expect(placeholders[0]?.getAttribute("data-placeholder")).toBe(
      "输入 / 打开命令，或输入 @ 提及成员",
    );
  });
});
