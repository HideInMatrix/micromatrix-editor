import type { CommandProps } from "@mxm-editor/core";
import { Mark, mergeAttributes } from "@mxm-editor/core";
import { toggleMark } from "@mxm-editor/pm";

export interface TextStyleOptions {
  HTMLAttributes: Record<string, string>;
  mergeNestedSpanStyles: boolean;
}

export interface TextStyleAttributes {
  [key: string]: string | null | undefined;
}

const MAX_FIND_CHILD_SPAN_DEPTH = 20;

function toCssProperty(name: string) {
  return name.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function createStyleString(attributes: Record<string, any> | undefined) {
  return Object.entries(attributes ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([name, value]) => `${toCssProperty(name)}: ${String(value)}`)
    .join("; ");
}

function findChildSpans(element: HTMLElement, depth = 0): HTMLElement[] {
  const childSpans: HTMLElement[] = [];

  if (!element.children.length || depth > MAX_FIND_CHILD_SPAN_DEPTH) {
    return childSpans;
  }

  Array.from(element.children).forEach((child) => {
    if (child.tagName === "SPAN") {
      childSpans.push(child as HTMLElement);
      return;
    }

    if (child.children.length) {
      childSpans.push(...findChildSpans(child as HTMLElement, depth + 1));
    }
  });

  return childSpans;
}

function mergeNestedSpanStyles(element: HTMLElement) {
  if (!element.children.length) {
    return;
  }

  findChildSpans(element).forEach((childSpan) => {
    const childStyle = childSpan.getAttribute("style");
    const parentStyle =
      childSpan.parentElement?.closest("span")?.getAttribute("style");

    childSpan.setAttribute("style", `${parentStyle ?? ""};${childStyle ?? ""}`);
  });
}

function setTextStyleMark(
  props: Pick<CommandProps, "editor" | "state" | "dispatch">,
  markName: string,
  attributes: TextStyleAttributes = {},
) {
  const { editor, state, dispatch } = props;
  const markType = state.schema.marks[markName];

  if (!markType) {
    return false;
  }

  const nextAttributes = {
    ...editor.getAttributes(markName),
    ...attributes,
  };
  const { empty, from, to } = state.selection;

  if (!dispatch) {
    return true;
  }

  if (empty) {
    dispatch(state.tr.addStoredMark(markType.create(nextAttributes)));
    return true;
  }

  dispatch(
    state.tr
      .removeMark(from, to, markType)
      .addMark(from, to, markType.create(nextAttributes)),
  );

  return true;
}

function unsetTextStyleMark(
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

export const TextStyle = Mark.create<TextStyleOptions>({
  name: "textStyle",

  priority: 101,

  addOptions() {
    return {
      HTMLAttributes: {},
      mergeNestedSpanStyles: true,
    };
  },

  parseHTML() {
    return [
      {
        tag: "span",
        consuming: false,
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          if (!node.hasAttribute("style")) {
            return false;
          }

          if (this.options.mergeNestedSpanStyles) {
            mergeNestedSpanStyles(node);
          }

          return {};
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  renderMarkdown({ node, children }) {
    const style = createStyleString(node.attrs);

    if (!style) {
      return children;
    }

    return `<span style="${style}">${children}</span>`;
  },

  addCommands() {
    return {
      setTextStyle:
        (attributes: TextStyleAttributes = {}) =>
        (props: Pick<CommandProps, "editor" | "state" | "dispatch">) =>
          setTextStyleMark(props, this.name, attributes),
      toggleTextStyle:
        (attributes: TextStyleAttributes = {}) =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) => {
          const markType = this.editor.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          return toggleMark(markType, attributes)(state, dispatch);
        },
      unsetTextStyle:
        () =>
        (props: Pick<CommandProps, "state" | "dispatch">) =>
          unsetTextStyleMark(props, this.name),
      removeEmptyTextStyle:
        () =>
        ({ tr }) => {
          const { selection } = tr;
          const markType = tr.doc.type.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          tr.doc.nodesBetween(selection.from, selection.to, (node, position) => {
            if (node.isTextblock) {
              return true;
            }

            const hasAttributes = node.marks
              .filter((mark) => mark.type === markType)
              .some((mark) =>
                Object.values(mark.attrs).some(
                  (value) => value !== null && value !== undefined && value !== "",
                ),
              );

            if (!hasAttributes) {
              tr.removeMark(position, position + node.nodeSize, markType);
            }

            return true;
          });

          return true;
        },
    };
  },
});
