import { Node, mergeAttributes } from "@mxm-editor/core";
import { setBlockType, textblockTypeInputRule } from "@mxm-editor/pm";

export interface HeadingOptions {
  HTMLAttributes: Record<string, string>;
  levels: number[];
}

export interface HeadingAttributes {
  level: number;
}

export const Heading = Node.create<HeadingOptions>({
  name: "heading",

  group: "block",
  content: "inline*",

  addOptions() {
    return {
      HTMLAttributes: {},
      levels: [1, 2, 3, 4, 5, 6],
    };
  },

  addAttributes() {
    return {
      level: {
        default: 1,
      },
    };
  },

  parseHTML() {
    return this.options.levels.map((level) => ({
      tag: `h${level}`,
      attrs: {
        level,
      },
    }));
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = this.options.levels.includes(node.attrs.level)
      ? node.attrs.level
      : this.options.levels[0];

    return [
      `h${level}`,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  renderMarkdown({ node, children }) {
    const level = Math.max(1, Math.min(6, Number(node.attrs?.level ?? 1)));

    if (node.attrs?.textAlign) {
      return `<h${level} style="text-align: ${node.attrs.textAlign}">${children}</h${level}>\n\n`;
    }

    return `${"#".repeat(level)} ${children}\n\n`;
  },

  addCommands() {
    return {
      setHeading:
        (attributes: HeadingAttributes) =>
        ({ state, dispatch }) => {
          const type = state.schema.nodes[this.name];

          if (!type || !this.options.levels.includes(attributes.level)) {
            return false;
          }

          return setBlockType(type, {
            level: attributes.level,
          })(state, dispatch);
        },
      toggleHeading:
        (attributes: HeadingAttributes) =>
        ({ state, dispatch, commands }) => {
          const level = attributes.level;
          const type = state.schema.nodes[this.name];

          if (!type || !this.options.levels.includes(level)) {
            return false;
          }

          if (state.selection.$from.parent.type === type
            && state.selection.$from.parent.attrs.level === level) {
            return commands.setParagraph();
          }

          return commands.setHeading({
            level,
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return Object.fromEntries(
      this.options.levels.map((level) => [
        `Mod-Alt-${level}`,
        () => this.editor.commands.setHeading({ level }),
      ]),
    );
  },

  addInputRules() {
    const type = this.editor.schema.nodes[this.name];

    if (!type) {
      return [];
    }

    return this.options.levels.map((level) =>
      textblockTypeInputRule(
        new RegExp(`^(#{${level}})\\s$`),
        type,
        () => ({ level }),
      ),
    );
  },
});
