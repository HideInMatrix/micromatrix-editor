import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { CodeBlockLowlight } from "@mxm-editor/extension-code-block-lowlight";
import { Emoji } from "@mxm-editor/extension-emoji";
import { Link } from "@mxm-editor/extension-link";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(
  extensions: any[],
  starterKitOptions: Record<string, any> = {},
  content = "<p></p>",
) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
        ...starterKitOptions,
      }),
      ...extensions,
    ],
    content,
  });

  return { editor, element };
}

function typeText(editor: Editor, text: string) {
  const view = editor.view;

  if (!view) {
    throw new Error("Typing requires a mounted editor view.");
  }

  for (const character of text) {
    const { from, to } = view.state.selection;
    let handled = false;

    view.someProp("handleTextInput", (handler) => {
      if (handler(view, from, to, character)) {
        handled = true;
        return true;
      }

      return false;
    });

    if (!handled) {
      view.dispatch(view.state.tr.insertText(character, from, to));
    }
  }
}

function pastePlainText(editor: Editor, text: string) {
  const view = editor.view;

  if (!view) {
    throw new Error("Expected mounted editor view.");
  }

  const event = {
    clipboardData: {
      getData: (type: string) => (type === "text/plain" ? text : ""),
    },
  } as unknown as ClipboardEvent;

  let handled = false;

  view.someProp("handlePaste", (handler) => {
    if (handler(view, event, null as never)) {
      handled = true;
      return true;
    }

    return false;
  });

  return handled;
}

function findTextRange(editor: Editor, text: string) {
  let range: { from: number; to: number } | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return true;
    }

    const index = node.text.indexOf(text);

    if (index === -1) {
      return true;
    }

    range = {
      from: pos + index,
      to: pos + index + text.length,
    };

    return false;
  });

  if (!range) {
    throw new Error(`Unable to find text range for "${text}".`);
  }

  return range;
}

describe("P9 rich parity smoke", () => {
  it("supports emoji commands, input rules, and paste rules", () => {
    const { editor } = createEditor([Emoji]);

    expect(editor.commands.setEmoji("rocket")).toBe(true);
    expect(editor.getHTML()).toContain('data-type="emoji"');
    expect(editor.getHTML()).toContain('data-name="rocket"');

    expect(editor.commands.setContent("<p></p>")).toBe(true);
    editor.commands.setTextSelection(1);
    typeText(editor, ":smile:");

    expect(editor.getHTML()).toContain('data-name="smile"');

    expect(editor.commands.setContent("<p></p>")).toBe(true);
    editor.commands.setTextSelection(1);

    expect(pastePlainText(editor, "Hello :wave:")).toBe(true);
    expect(editor.getHTML()).toContain("Hello");
    expect(editor.getHTML()).toContain('data-name="wave"');
  });

  it("decorates code blocks with lowlight classes", () => {
    const lowlight = {
      listLanguages: () => ["ts"],
      highlight: (_language: string, value: string) => ({
        children: [
          {
            type: "element",
            properties: {
              className: ["hljs-keyword"],
            },
            children: [
              {
                type: "text",
                value: "const",
              },
            ],
          },
          {
            type: "text",
            value: value.slice(5),
          },
        ],
      }),
      highlightAuto: (value: string) => ({
        children: [
          {
            type: "text",
            value,
          },
        ],
      }),
    };
    const { editor, element } = createEditor(
      [
        CodeBlockLowlight.configure({
          lowlight,
        }),
      ],
      {
        codeBlock: false,
      },
      "<pre><code class=\"language-ts\">const answer = 42;</code></pre>",
    );

    expect(editor.getHTML()).toContain('class="language-ts"');
    expect(element.querySelector(".hljs-keyword")).not.toBeNull();
  });

  it("aligns link paste behavior and protocol validation", () => {
    const { editor } = createEditor([
      Link.configure({
        linkOnPaste: true,
        defaultProtocol: "https",
        protocols: ["foo"],
      }),
    ], {
      link: false,
    }, "<p>Label</p>");
    const range = findTextRange(editor, "Label");

    editor.commands.setTextSelection(range);

    expect(pastePlainText(editor, "example.com")).toBe(true);
    expect(editor.getHTML()).toContain('href="https://example.com"');

    expect(editor.commands.unsetLink()).toBe(true);
    editor.commands.setTextSelection(range);

    expect(editor.commands.setLink({ href: "foo:bar" })).toBe(true);
    expect(editor.getHTML()).toContain('href="foo:bar"');

    expect(editor.commands.unsetLink()).toBe(true);
    editor.commands.setTextSelection(range);

    expect(
      editor.commands.setLink({ href: "javascript:alert(1)" }),
    ).toBe(false);
  });
});
