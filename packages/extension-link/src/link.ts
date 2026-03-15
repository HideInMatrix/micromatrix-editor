import type { CommandProps } from "@mxm-editor/core";
import { Mark, mergeAttributes } from "@mxm-editor/core";
import { toggleMark } from "@mxm-editor/pm";

export interface LinkOptions {
  HTMLAttributes: Record<string, string>;
  openOnClick: boolean;
  autolink: boolean;
}

export interface LinkAttributes {
  href: string | null;
  target: string | null;
  rel: string | null;
}

function setMarkWithAttrs(
  props: Pick<CommandProps, "state" | "dispatch">,
  markName: string,
  attrs: LinkAttributes,
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
    dispatch(state.tr.addStoredMark(markType.create(attrs)));
    return true;
  }

  const tr = state.tr.removeMark(from, to, markType).addMark(from, to, markType.create(attrs));

  dispatch(tr);
  return true;
}

function unsetMark(
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

export const Link = Mark.create<LinkOptions>({
  name: "link",

  addOptions() {
    return {
      HTMLAttributes: {},
      openOnClick: true,
      autolink: false,
    };
  },

  inclusive: false,

  addAttributes() {
    return {
      href: {
        default: null,
      },
      target: {
        default: "_blank",
      },
      rel: {
        default: "noopener noreferrer nofollow",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[href]",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          return {
            href: node.getAttribute("href"),
            target: node.getAttribute("target"),
            rel: node.getAttribute("rel"),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  renderMarkdown({ node, children }) {
    const href = node.attrs?.href;

    if (!href) {
      return children;
    }

    return `[${children}](${href})`;
  },

  addCommands() {
    return {
      setLink:
        (attributes: Partial<LinkAttributes>) =>
        (props: Pick<CommandProps, "state" | "dispatch">) =>
          setMarkWithAttrs(props, this.name, {
            href: attributes.href ?? null,
            target: attributes.target ?? "_blank",
            rel: attributes.rel ?? "noopener noreferrer nofollow",
          }),
      toggleLink:
        (attributes: Partial<LinkAttributes>) =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) => {
          const markType = this.editor.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          return toggleMark(markType, {
            href: attributes.href ?? null,
            target: attributes.target ?? "_blank",
            rel: attributes.rel ?? "noopener noreferrer nofollow",
          })(state, dispatch);
        },
      unsetLink:
        () =>
        (props: Pick<CommandProps, "state" | "dispatch">) =>
          unsetMark(props, this.name),
    };
  },
});
