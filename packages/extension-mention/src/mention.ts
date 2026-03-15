import type { SuggestionOptions } from "@mxm-editor/suggestion";
import { Node, mergeAttributes } from "@mxm-editor/core";
import { PluginKey } from "@mxm-editor/pm";
import { Suggestion } from "@mxm-editor/suggestion";

export interface MentionAttributes {
  id: string | null;
  label: string | null;
}

export interface MentionItem {
  id: string;
  label: string;
}

export interface MentionOptions {
  HTMLAttributes: Record<string, string>;
  suggestion: Omit<
    SuggestionOptions<MentionItem, MentionItem>,
    "editor" | "command"
  >;
}

export const Mention = Node.create<MentionOptions>({
  name: "mention",

  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: {
        char: "@",
        pluginKey: new PluginKey("mention"),
        items: () => [],
        render: () => ({}),
        allowSpaces: false,
        allowToIncludeChar: false,
        allowedPrefixes: [" "],
        startOfLine: false,
        decorationTag: "span",
        decorationClass: "mention-suggestion",
        decorationEmptyClass: "is-empty",
        allow: () => true,
      },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
      },
      label: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-mention]",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          return {
            id: node.getAttribute("data-id"),
            label: node.getAttribute("data-label") ?? node.textContent?.replace(/^@/, "") ?? null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const label = node.attrs.label ?? node.attrs.id ?? "";

    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-mention": "",
        "data-id": node.attrs.id ?? "",
        "data-label": label,
      }),
      `@${label}`,
    ];
  },

  renderMarkdown({ node }) {
    const label = node.attrs?.label ?? node.attrs?.id ?? "";

    return `@${label}`;
  },

  addCommands() {
    return {
      insertMention:
        (attributes: MentionItem, range?: { from: number; to: number }) =>
        ({ state, dispatch }) => {
          const type = state.schema.nodes[this.name];

          if (!type) {
            return false;
          }

          const mentionNode = type.create({
            id: attributes.id,
            label: attributes.label,
          });
          const spaceNode = state.schema.text(" ");
          const from = range?.from ?? state.selection.from;
          const to = range?.to ?? state.selection.to;

          if (!dispatch) {
            return true;
          }

          dispatch(
            state.tr
              .replaceWith(from, to, [mentionNode, spaceNode])
              .scrollIntoView(),
          );

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        ...this.options.suggestion,
        editor: this.editor,
        command: ({ range, props }) => {
          this.editor.commands.insertMention(props, range);
        },
      }),
    ];
  },
});
