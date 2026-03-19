import { afterEach, describe, expect, it } from "vitest";
import {
  Editor,
  Extension,
  Node,
  nodeInputRule,
  textInputRule,
  textPasteRule,
} from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

const InlineToken = Node.create({
  name: "inlineToken",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      label: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-inline-token]" }];
  },

  renderHTML({ node }) {
    return [
      "span",
      {
        "data-inline-token": node.attrs.label,
      },
      node.attrs.label,
    ];
  },
});

const TextPaste = Extension.create({
  name: "textPasteProbe",

  addPasteRules() {
    return [
      textPasteRule({
        find: /--/g,
        replace: "—",
      }),
    ];
  },
});

function createEditor(extensions: any[] = []) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
      }),
      ...extensions,
    ],
    content: "<p></p>",
  });
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
  } as ClipboardEvent;

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

describe("P21 core rule builders", () => {
  it("replaces typed text with textInputRule", () => {
    const editor = createEditor();
    const rule = textInputRule({
      find: /--$/,
      replace: "—",
    });

    editor.commands.setContent("<p>--</p>");

    const transaction = (rule as any).handler(
      editor.state,
      /--$/.exec("--"),
      1,
      3,
    );

    if (!transaction) {
      throw new Error("Expected text input rule transaction.");
    }

    expect(transaction.doc.textContent).toBe("—");

    editor.destroy();
  });

  it("replaces typed text with inline nodes via nodeInputRule", () => {
    const editor = createEditor([InlineToken]);
    const type = editor.schema.nodes.inlineToken;
    const rule = nodeInputRule({
      find: /@\[[^\]]+\]$/,
      type,
      getAttributes: (match) => ({
        label: match[0].slice(2, -1),
      }),
    });

    editor.commands.setContent("<p>@[Ada]</p>");

    const transaction = (rule as any).handler(
      editor.state,
      /@\[[^\]]+\]$/.exec("@[Ada]"),
      1,
      7,
    );

    if (!transaction) {
      throw new Error("Expected node input rule transaction.");
    }

    expect(transaction.doc.toJSON()).toMatchObject({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "inlineToken",
              attrs: {
                label: "Ada",
              },
            },
          ],
        },
      ],
    });

    editor.destroy();
  });

  it("replaces pasted text with textPasteRule", () => {
    const editor = createEditor([TextPaste]);

    editor.commands.setTextSelection(1);

    expect(pastePlainText(editor, "alpha -- beta")).toBe(true);
    expect(editor.getText()).toBe("alpha — beta");

    editor.destroy();
  });
});
