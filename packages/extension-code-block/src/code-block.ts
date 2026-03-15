import { Node, mergeAttributes } from "@mxm-editor/core";
import { newlineInCode, setBlockType, textblockTypeInputRule } from "@mxm-editor/pm";

export interface CodeBlockOptions {
  HTMLAttributes: Record<string, string>;
}

export const CodeBlock = Node.create<CodeBlockOptions>({
  name: "codeBlock",

  group: "block",
  content: "text*",
  marks: "",
  code: true,
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      language: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "pre",
        preserveWhitespace: "full",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          const codeElement = node.querySelector("code");
          const languageClass = codeElement?.className
            .split(/\s+/)
            .find((className) => className.startsWith("language-"));

          return {
            language: languageClass?.replace("language-", "") ?? null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const language = node.attrs.language;

    return [
      "pre",
      mergeAttributes(this.options.HTMLAttributes),
      [
        "code",
        language ? { class: `language-${language}` } : {},
        0,
      ],
    ];
  },

  renderMarkdown({ node }) {
    const language = node.attrs?.language ?? "";
    const content = (node.content ?? [])
      .map((child) => child.text ?? "")
      .join("");

    return `\`\`\`${language}\n${content}\n\`\`\`\n\n`;
  },

  addCommands() {
    return {
      setCodeBlock:
        (attributes: { language?: string | null } = {}) =>
        ({ state, dispatch }) => {
          const type = state.schema.nodes[this.name];

          if (!type) {
            return false;
          }

          return setBlockType(type, {
            language: attributes.language ?? null,
          })(state, dispatch);
        },
      toggleCodeBlock:
        (attributes: { language?: string | null } = {}) =>
        ({ state, commands }) => {
          const type = state.schema.nodes[this.name];

          if (!type) {
            return false;
          }

          if (state.selection.$from.parent.type === type) {
            return commands.setParagraph();
          }

          return commands.setCodeBlock(attributes);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-c": () => this.editor.commands.toggleCodeBlock(),
      Enter: () =>
        this.editor.isActive(this.name)
          ? newlineInCode(this.editor.state, this.editor.view?.dispatch)
          : false,
    };
  },

  addInputRules() {
    const type = this.editor.schema.nodes[this.name];

    if (!type) {
      return [];
    }

    return [
      textblockTypeInputRule(
        /^```([a-z0-9_-]+)?\s$/i,
        type,
        (match) => ({
          language: match[1] ?? null,
        }),
      ),
    ];
  },
});
