import { Node, mergeAttributes } from "@mxm-editor/core";
import {
  newlineInCode,
  setBlockType,
  textblockTypeInputRule,
} from "@mxm-editor/pm";
import { LowlightPlugin } from "./lowlight-plugin";

export interface LowlightLike {
  highlight: (language: string, value: string) => any;
  highlightAuto: (value: string) => any;
  listLanguages: () => string[];
}

export interface CodeBlockLowlightOptions {
  lowlight: LowlightLike;
  defaultLanguage?: string | null;
  languageClassPrefix: string;
  HTMLAttributes: Record<string, string>;
}

export const CodeBlockLowlight = Node.create<CodeBlockLowlightOptions>({
  name: "codeBlock",

  group: "block",
  content: "text*",
  marks: "",
  code: true,
  defining: true,

  addOptions() {
    return {
      lowlight: {} as LowlightLike,
      defaultLanguage: null,
      languageClassPrefix: "language-",
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      language: {
        default: this.options.defaultLanguage,
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
            .find((className) =>
              className.startsWith(this.options.languageClassPrefix),
            );

          return {
            language:
              languageClass?.replace(this.options.languageClassPrefix, "")
              ?? this.options.defaultLanguage,
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
        language
          ? { class: `${this.options.languageClassPrefix}${language}` }
          : {},
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
            language: attributes.language ?? this.options.defaultLanguage ?? null,
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
          language: match[1] ?? this.options.defaultLanguage ?? null,
        }),
      ),
    ];
  },

  addProseMirrorPlugins() {
    return [
      LowlightPlugin({
        name: this.name,
        lowlight: this.options.lowlight,
        defaultLanguage: this.options.defaultLanguage,
      }),
    ];
  },
});
