import type { SuggestionOptions } from "@mxm-editor/suggestion";
import { Node, mergeAttributes } from "@mxm-editor/core";
import { InputRule, PluginKey } from "@mxm-editor/pm";
import { Suggestion } from "@mxm-editor/suggestion";
import { emojis as defaultEmojis } from "./data";
import { shortcodeToEmoji } from "./helpers/shortcode-to-emoji";

export interface EmojiItem {
  name: string;
  emoji?: string;
  shortcodes: string[];
  tags: string[];
  group?: string;
  emoticons?: string[];
  version?: number;
  fallbackImage?: string;
  [key: string]: any;
}

export interface EmojiStorage {
  emojis: EmojiItem[];
  isSupported: (item: EmojiItem) => boolean;
}

export interface EmojiOptions {
  HTMLAttributes: Record<string, string>;
  emojis: EmojiItem[];
  enableEmoticons: boolean;
  forceFallbackImages: boolean;
  suggestion: Omit<
    SuggestionOptions<EmojiItem, EmojiItem>,
    "editor" | "command"
  >;
}

export const EmojiSuggestionPluginKey = new PluginKey("emojiSuggestion");

export const inputRegex = /:([a-zA-Z0-9_+-]+):$/;

export const pasteRegex = /(^|\s):([a-zA-Z0-9_+-]+):/g;

function renderDataName(attributes: Record<string, any>): Record<string, string> {
  return attributes.name ? { "data-name": String(attributes.name) } : {};
}

export const Emoji = Node.create<EmojiOptions, EmojiStorage>({
  name: "emoji",

  inline: true,
  group: "inline",
  atom: true,
  selectable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      emojis: defaultEmojis,
      enableEmoticons: false,
      forceFallbackImages: false,
      suggestion: {
        char: ":",
        pluginKey: EmojiSuggestionPluginKey,
        items: ({ query }) => {
          const normalizedQuery = query.trim().toLowerCase();

          return this.options.emojis
            .filter((item) => {
              if (!normalizedQuery.length) {
                return true;
              }

              return (
                item.name.toLowerCase().includes(normalizedQuery)
                || item.shortcodes.some((shortcode) =>
                  shortcode.toLowerCase().includes(normalizedQuery),
                )
                || item.tags.some((tag) =>
                  tag.toLowerCase().includes(normalizedQuery),
                )
              );
            })
            .slice(0, 20);
        },
        render: () => ({}),
        allowSpaces: false,
        allowToIncludeChar: false,
        allowedPrefixes: [" ", "("],
        startOfLine: false,
        decorationTag: "span",
        decorationClass: "emoji-suggestion",
        decorationEmptyClass: "is-empty",
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes[this.name];

          return !!type && !!$from.parent.type.contentMatch.matchType(type);
        },
      },
    };
  },

  addStorage() {
    return {
      emojis: this.options.emojis,
      isSupported: (item) => Boolean(item.emoji),
    };
  },

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (element) => element.dataset.name ?? null,
        renderHTML: (attributes) => renderDataName(attributes),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="emoji"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const emojiItem = shortcodeToEmoji(node.attrs.name, this.options.emojis);
    const attributes = mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { "data-type": this.name },
    );

    if (!emojiItem) {
      return ["span", attributes, `:${node.attrs.name}:`];
    }

    if (this.options.forceFallbackImages && emojiItem.fallbackImage) {
      return [
        "span",
        attributes,
        [
          "img",
          {
            src: emojiItem.fallbackImage,
            draggable: "false",
            loading: "lazy",
            align: "absmiddle",
            alt: `${emojiItem.name} emoji`,
          },
        ],
      ];
    }

    return [
      "span",
      attributes,
      emojiItem.emoji ?? `:${emojiItem.shortcodes[0] ?? emojiItem.name}:`,
    ];
  },

  renderMarkdown({ node }) {
    if (!node.attrs?.name) {
      return "";
    }

    return `:${node.attrs.name}:`;
  },

  addCommands() {
    return {
      setEmoji:
        (shortcode: string) =>
        ({ commands }) => {
          const emojiItem = shortcodeToEmoji(shortcode, this.options.emojis);

          if (!emojiItem) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              name: emojiItem.name,
            },
          });
        },
    };
  },

  addInputRules() {
    const type = this.editor.schema.nodes[this.name];

    if (!type) {
      return [];
    }

    return [
      new InputRule(inputRegex, (state, match, start, end) => {
        const name = match[1];
        const emojiItem = shortcodeToEmoji(name, this.options.emojis);

        if (!emojiItem) {
          return null;
        }

        return state.tr.replaceWith(
          start,
          end,
          type.create({
            name: emojiItem.name,
          }),
        );
      }),
    ];
  },

  addPasteRules() {
    const type = this.editor.schema.nodes[this.name];

    if (!type) {
      return [];
    }

    return [
      {
        find: pasteRegex,
        replace: ({ state, match }) => {
          const prefix = match[1] ?? "";
          const name = match[2];
          const emojiItem = shortcodeToEmoji(name, this.options.emojis);

          if (!emojiItem) {
            return null;
          }

          return [
            ...(prefix ? [state.schema.text(prefix)] : []),
            type.create({
              name: emojiItem.name,
            }),
          ];
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        command: ({ editor, range, props }) => {
          const nodeAfter = editor.view?.state.selection.$to.nodeAfter;
          const nextRange = { ...range };

          if (nodeAfter?.text?.startsWith(" ")) {
            nextRange.to += 1;
          }

          editor.commands.insertContentAt(nextRange, [
            {
              type: this.name,
              attrs: {
                name: props.name,
              },
            },
            {
              type: "text",
              text: " ",
            },
          ]);
        },
      }),
    ];
  },
});
