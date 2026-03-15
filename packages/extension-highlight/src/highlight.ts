import type { CommandProps } from "@mxm-editor/core";
import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
} from "@mxm-editor/core";
import { toggleMark } from "@mxm-editor/pm";

export interface HighlightOptions {
  multicolor: boolean;
  HTMLAttributes: Record<string, string>;
}

export interface HighlightAttributes {
  color?: string | null;
}

const highlightInputRegex = /(?:^|\s)(==(?!\s+==)((?:[^=]+))==(?!\s+==))$/;
const highlightPasteRegex = /(?:^|\s)(==(?!\s+==)((?:[^=]+))==(?!\s+==))/g;

function normalizeHighlightAttributes(
  multicolor: boolean,
  attributes: HighlightAttributes = {},
) {
  if (!multicolor) {
    return {};
  }

  return {
    color: attributes.color ?? null,
  };
}

function setHighlightMark(
  props: Pick<CommandProps, "state" | "dispatch">,
  markName: string,
  attributes: HighlightAttributes,
) {
  const { state, dispatch } = props;
  const markType = state.schema.marks[markName];

  if (!markType) {
    return false;
  }

  const { empty, from, to } = state.selection;

  if (!dispatch) {
    return true;
  }

  if (empty) {
    dispatch(state.tr.addStoredMark(markType.create(attributes)));
    return true;
  }

  dispatch(
    state.tr
      .removeMark(from, to, markType)
      .addMark(from, to, markType.create(attributes)),
  );
  return true;
}

function unsetHighlightMark(
  props: Pick<CommandProps, "state" | "dispatch">,
  markName: string,
) {
  const { state, dispatch } = props;
  const markType = state.schema.marks[markName];

  if (!markType) {
    return false;
  }

  const { empty, from, to } = state.selection;

  if (!dispatch) {
    return true;
  }

  if (empty) {
    dispatch(state.tr.removeStoredMark(markType));
    return true;
  }

  dispatch(state.tr.removeMark(from, to, markType));
  return true;
}

export const Highlight = Mark.create<HighlightOptions>({
  name: "highlight",

  addOptions() {
    return {
      multicolor: false,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    if (!this.options.multicolor) {
      return {} as Record<string, any>;
    }

    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-color") || element.style.backgroundColor || null,
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.color) {
            return {};
          }

          return {
            "data-color": String(attributes.color),
            style: `background-color: ${attributes.color}; color: inherit`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "mark" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  renderMarkdown({ node, children }) {
    if (node.attrs?.color) {
      return `<mark style="background-color: ${node.attrs.color}; color: inherit">${children}</mark>`;
    }

    return `==${children}==`;
  },

  addCommands() {
    return {
      setHighlight:
        (attributes?: HighlightAttributes) =>
        (props: Pick<CommandProps, "state" | "dispatch">) =>
          setHighlightMark(
            props,
            this.name,
            normalizeHighlightAttributes(this.options.multicolor, attributes),
          ),
      toggleHighlight:
        (attributes?: HighlightAttributes) =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) => {
          const markType = this.editor.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          return toggleMark(
            markType,
            normalizeHighlightAttributes(this.options.multicolor, attributes),
          )(state, dispatch);
        },
      unsetHighlight:
        () =>
        (props: Pick<CommandProps, "state" | "dispatch">) =>
          unsetHighlightMark(props, this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-h": () => this.editor.commands.toggleHighlight(),
    };
  },

  addInputRules() {
    const type = this.editor.schema.marks[this.name];

    if (!type) {
      return [];
    }

    return [
      markInputRule({
        find: highlightInputRegex,
        type,
      }),
    ];
  },

  addPasteRules() {
    const type = this.editor.schema.marks[this.name];

    if (!type) {
      return [];
    }

    return [
      markPasteRule({
        find: highlightPasteRegex,
        type,
      }),
    ];
  },
});
