import type { CommandProps } from "@mxm-editor/core";
import { Mark, mergeAttributes } from "@mxm-editor/core";
import {
  Fragment,
  InputRule,
  Plugin,
  PluginKey,
  Slice,
  TextSelection,
  toggleMark,
  type MarkType,
} from "@mxm-editor/pm";
import {
  find as findLinks,
  registerCustomProtocol,
  reset,
  tokenize,
} from "linkifyjs";

export interface LinkProtocol {
  scheme: string;
  optionalSlashes?: boolean;
}

export interface LinkAttributes {
  href: string | null;
  target: string | null;
  rel: string | null;
  class: string | null;
  title: string | null;
}

export interface AllowedUriContext {
  defaultProtocol: string;
  protocols: Array<string | LinkProtocol>;
  defaultValidate: (url: string) => boolean;
}

export interface LinkOptions {
  HTMLAttributes: Record<string, string>;
  openOnClick: boolean | "whenNotEditable";
  enableClickSelection: boolean;
  autolink: boolean;
  linkOnPaste: boolean;
  protocols: Array<string | LinkProtocol>;
  defaultProtocol: string;
  validate: (url: string) => boolean;
  isAllowedUri: (url: string, context: AllowedUriContext) => boolean;
  shouldAutoLink: (url: string) => boolean;
}

const pasteRegex =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,}\b(?:[-a-zA-Z0-9@:%._+~#=?!&/]*)(?:[-a-zA-Z0-9@:%._+~#=?!&/]*)/gi;

const UNICODE_WHITESPACE_PATTERN = "[\0- \xA0\u1680\u180E\u2000-\u2029\u205F\u3000]";
const UNICODE_WHITESPACE_REGEX_GLOBAL = new RegExp(
  UNICODE_WHITESPACE_PATTERN,
  "g",
);

const defaultValidate = (url: string) => !!url;

const defaultShouldAutoLink = (url: string) => {
  const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(url);
  const hasMaybeProtocol = /^[a-z][a-z0-9+.-]*:/i.test(url);

  if (hasProtocol || (hasMaybeProtocol && !url.includes("@"))) {
    return true;
  }

  const urlWithoutUserinfo = url.includes("@") ? url.split("@").pop() : url;
  const hostname = (urlWithoutUserinfo ?? "").split(/[/?#:]/)[0];

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return false;
  }

  return /\./.test(hostname);
};

function isAllowedUriByProtocol(
  uri: string | null | undefined,
  protocols: Array<string | LinkProtocol>,
) {
  const allowedProtocols = [
    "http",
    "https",
    "ftp",
    "ftps",
    "mailto",
    "tel",
    "callto",
    "sms",
    "cid",
    "xmpp",
  ];

  protocols.forEach((protocol) => {
    const scheme =
      typeof protocol === "string"
        ? protocol
        : protocol.scheme;

    if (scheme) {
      allowedProtocols.push(scheme);
    }
  });

  return !!uri?.replace(UNICODE_WHITESPACE_REGEX_GLOBAL, "").match(
    new RegExp(
      `^(?:(?:${allowedProtocols.join("|")}):|[^a-z]|[a-z0-9+.-]+(?:[^a-z+.-:]|$))`,
      "i",
    ),
  );
}

function getAllowedUriContext(options: LinkOptions): AllowedUriContext {
  return {
    defaultValidate: (url) => isAllowedUriByProtocol(url, options.protocols),
    protocols: options.protocols,
    defaultProtocol: options.defaultProtocol,
  };
}

function getDefaultLinkAttributes(options: LinkOptions): LinkAttributes {
  return {
    href: null,
    target: options.HTMLAttributes.target ?? "_blank",
    rel: options.HTMLAttributes.rel ?? "noopener noreferrer nofollow",
    class: options.HTMLAttributes.class ?? null,
    title: null,
  };
}

function isValidLinkStructure(tokens: Array<{ isLink?: boolean; value?: string }>) {
  if (tokens.length === 1) {
    return Boolean(tokens[0]?.isLink);
  }

  if (tokens.length === 3 && tokens[1]?.isLink) {
    return ["()", "[]"].includes(`${tokens[0]?.value ?? ""}${tokens[2]?.value ?? ""}`);
  }

  return false;
}

function findLinkMatches(text: string, options: LinkOptions) {
  const context = getAllowedUriContext(options);

  return findLinks(text, {
    defaultProtocol: options.defaultProtocol,
  }).filter((item) =>
    item.isLink
    && options.isAllowedUri(item.value, context)
    && options.shouldAutoLink(item.value),
  );
}

function findSingleLink(url: string, options: LinkOptions) {
  const matches = findLinkMatches(url, options)
    .filter((item) => item.value === url);
  const link = matches[0];

  if (!link) {
    return null;
  }

  return {
    ...link,
    href: link.href,
  };
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
    const range = getLinkRange(state, from, markName);

    if (range) {
      dispatch(
        state.tr
          .removeMark(range.from, range.to, markType)
          .addMark(range.from, range.to, markType.create(attrs)),
      );
      return true;
    }

    dispatch(state.tr.addStoredMark(markType.create(attrs)));
    return true;
  }

  dispatch(
    state.tr
      .removeMark(from, to, markType)
      .addMark(from, to, markType.create(attrs)),
  );

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
    const range = getLinkRange(state, from, markName);

    if (range) {
      dispatch(state.tr.removeMark(range.from, range.to, markType));
      return true;
    }

    dispatch(state.tr.removeStoredMark(markType));
    return true;
  }

  dispatch(state.tr.removeMark(from, to, markType));
  return true;
}

function getLinkRange(state: CommandProps["state"], pos: number, markName: string) {
  const markType = state.schema.marks[markName];

  if (!markType) {
    return null;
  }

  const $pos = state.doc.resolve(pos);
  const parent = $pos.parent;
  const parentStart = $pos.start();
  let seedIndex = -1;
  let seedOffset = 0;

  parent.forEach((child, offset, index) => {
    if (seedIndex !== -1) {
      return;
    }

    if (offset <= $pos.parentOffset && offset + child.nodeSize >= $pos.parentOffset) {
      seedIndex = index;
      seedOffset = offset;
    }
  });

  if (seedIndex < 0) {
    return null;
  }

  const seedNode = parent.child(seedIndex);

  if (!markType.isInSet(seedNode.marks)) {
    return null;
  }

  let from = parentStart + seedOffset;
  let to = from + seedNode.nodeSize;

  for (let index = seedIndex - 1; index >= 0; index -= 1) {
    const node = parent.child(index);

    if (!markType.isInSet(node.marks)) {
      break;
    }

    from -= node.nodeSize;
  }

  for (let index = seedIndex + 1; index < parent.childCount; index += 1) {
    const node = parent.child(index);

    if (!markType.isInSet(node.marks)) {
      break;
    }

    to += node.nodeSize;
  }

  return { from, to };
}

function createClickHandler(
  editor: CommandProps["editor"],
  options: LinkOptions,
  markName: string,
) {
  return new Plugin({
    key: new PluginKey("handleClickLink"),
    props: {
      handleClick(view, pos, event) {
        if (event.button !== 0 || !view.editable) {
          return false;
        }

        const target = event.target;

        if (!(target instanceof Element)) {
          return false;
        }

        const link = target.closest("a");

        if (!link || !view.dom.contains(link)) {
          return false;
        }

        let handled = false;

        if (options.enableClickSelection) {
          const range = getLinkRange(view.state, pos, markName);

          if (range) {
            view.dispatch(
              view.state.tr.setSelection(
                TextSelection.create(view.state.doc, range.from, range.to),
              ),
            );
            handled = true;
          }
        }

        if (options.openOnClick) {
          const attributes = editor.getAttributes(markName);
          const href = link.getAttribute("href") ?? attributes.href;
          const targetName = link.getAttribute("target") ?? attributes.target ?? "_blank";

          if (href) {
            window.open(href, targetName);
            handled = true;
          }
        }

        return handled;
      },
    },
  });
}

function createPasteHandler(
  editor: CommandProps["editor"],
  options: LinkOptions,
) {
  return new Plugin({
    key: new PluginKey("handlePasteLink"),
    props: {
      handlePaste(view, event) {
        if (view.state.selection.empty) {
          return false;
        }

        const text =
          event.clipboardData?.getData("text/plain").trim()
          ?? "";
        const link = findSingleLink(text, options);

        if (!link) {
          return false;
        }

        return editor.commands.setLink({
          href: link.href,
        });
      },
    },
  });
}

function buildPasteNodes(
  text: string,
  options: LinkOptions,
  markType: MarkType,
  state: CommandProps["state"],
) {
  const links = findLinkMatches(text, options);

  if (!links.length) {
    return null;
  }

  const defaults = getDefaultLinkAttributes(options);
  const nodes = [];
  let lastIndex = 0;

  for (const link of links) {
    if (link.start > lastIndex) {
      nodes.push(state.schema.text(text.slice(lastIndex, link.start)));
    }

    nodes.push(
      state.schema.text(link.value, [
        markType.create({
          ...defaults,
          href: link.href,
        }),
      ]),
    );

    lastIndex = link.end;
  }

  if (lastIndex < text.length) {
    nodes.push(state.schema.text(text.slice(lastIndex)));
  }

  return nodes.length ? nodes : null;
}

function createPasteLinkifier(
  options: LinkOptions,
  markName: string,
) {
  return new Plugin({
    key: new PluginKey("linkPasteRule"),
    props: {
      handlePaste(view, event) {
        const text = event.clipboardData?.getData("text/plain");
        const markType = view.state.schema.marks[markName];

        if (!text || !markType) {
          return false;
        }

        const nodes = buildPasteNodes(text, options, markType, view.state);

        if (!nodes) {
          return false;
        }

        view.dispatch(
          view.state.tr.replaceSelection(
            new Slice(Fragment.fromArray(nodes), 0, 0),
          ),
        );

        return true;
      },
    },
  });
}

export const Link = Mark.create<LinkOptions>({
  name: "link",
  priority: 1000,
  keepOnSplit: false,

  inclusive() {
    return this.options.autolink;
  },

  addOptions() {
    return {
      HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
      openOnClick: true,
      enableClickSelection: false,
      autolink: true,
      linkOnPaste: true,
      protocols: [],
      defaultProtocol: "http",
      validate: defaultValidate,
      isAllowedUri: (url, context) =>
        !!url && isAllowedUriByProtocol(url, context.protocols),
      shouldAutoLink: defaultShouldAutoLink,
    };
  },

  onCreate() {
    if (
      this.options.validate !== defaultValidate
      && this.options.shouldAutoLink === defaultShouldAutoLink
    ) {
      this.options.shouldAutoLink = this.options.validate;
      console.warn(
        "The `validate` option is deprecated. Rename to the `shouldAutoLink` option instead.",
      );
    }

    this.options.protocols.forEach((protocol) => {
      if (typeof protocol === "string") {
        registerCustomProtocol(protocol);
        return;
      }

      registerCustomProtocol(protocol.scheme, protocol.optionalSlashes);
    });
  },

  onDestroy() {
    reset();
  },

  addAttributes() {
    const defaults = getDefaultLinkAttributes(this.options);

    return {
      href: {
        default: defaults.href,
      },
      target: {
        default: defaults.target,
      },
      rel: {
        default: defaults.rel,
      },
      class: {
        default: defaults.class,
      },
      title: {
        default: defaults.title,
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

          const href = node.getAttribute("href");

          if (
            !href
            || !this.options.isAllowedUri(href, getAllowedUriContext(this.options))
          ) {
            return false;
          }

          return {
            href,
            target: node.getAttribute("target"),
            rel: node.getAttribute("rel"),
            class: node.getAttribute("class"),
            title: node.getAttribute("title"),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const href = HTMLAttributes.href;
    const isAllowed = this.options.isAllowedUri(
      href,
      getAllowedUriContext(this.options),
    );

    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, {
        ...HTMLAttributes,
        href: isAllowed ? href : "",
      }),
      0,
    ];
  },

  renderMarkdown({ node, children }) {
    const href = node.attrs?.href;
    const title = node.attrs?.title;

    if (!href) {
      return children;
    }

    return title
      ? `[${children}](${href} "${title}")`
      : `[${children}](${href})`;
  },

  addCommands() {
    return {
      setLink:
        (attributes: Partial<LinkAttributes>) =>
        (props: Pick<CommandProps, "state" | "dispatch">) => {
          const defaults = getDefaultLinkAttributes(this.options);
          const href = attributes.href ?? null;

          if (
            href
            && !this.options.isAllowedUri(href, getAllowedUriContext(this.options))
          ) {
            return false;
          }

          return setMarkWithAttrs(props, this.name, {
            ...defaults,
            ...attributes,
            href,
          });
        },
      toggleLink:
        (attributes: Partial<LinkAttributes>) =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) => {
          const href = attributes.href ?? null;

          if (
            href
            && !this.options.isAllowedUri(href, getAllowedUriContext(this.options))
          ) {
            return false;
          }

          const defaults = getDefaultLinkAttributes(this.options);
          const markType = this.editor.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          if (state.selection.empty) {
            const range = getLinkRange(state, state.selection.from, this.name);

            if (range) {
              if (!dispatch) {
                return true;
              }

              dispatch(state.tr.removeMark(range.from, range.to, markType));
              return true;
            }
          }

          return toggleMark(markType, {
            ...defaults,
            ...attributes,
            href,
          })(state, dispatch);
        },
      unsetLink:
        () =>
        (props: Pick<CommandProps, "state" | "dispatch">) =>
          unsetMark(props, this.name),
    };
  },

  addInputRules() {
    const type = this.editor.schema.marks[this.name];

    if (!type || !this.options.autolink) {
      return [];
    }

    return [
      new InputRule(/(?:^|\s)([^\s]+)\s$/, (state, match, _start, end) => {
        const text = match[1] ?? "";

        if (!text.length) {
          return null;
        }

        const tokens = tokenize(text)
          .map((token) => token.toObject(this.options.defaultProtocol));

        if (!isValidLinkStructure(tokens)) {
          return null;
        }

        const links = tokens
          .filter((token) => token.isLink)
          .filter((token) =>
            this.options.isAllowedUri(token.value, getAllowedUriContext(this.options))
            && this.options.shouldAutoLink(token.value),
          );

        if (!links.length) {
          return null;
        }

        const codeMark = state.schema.marks.code;
        const linkStart = end - 1 - text.length;
        const defaults = getDefaultLinkAttributes(this.options);
        const tr = state.tr;

        links.forEach((link) => {
          const from = linkStart + link.start;
          const to = linkStart + link.end;

          if (
            (codeMark && state.doc.rangeHasMark(from, to, codeMark))
            || state.doc.rangeHasMark(from, to, type)
          ) {
            return;
          }

          tr.addMark(from, to, type.create({
            ...defaults,
            href: link.href,
          }));
        });

        return tr.steps.length ? tr : null;
      }),
    ];
  },

  addPasteRules() {
    return [];
  },

  addProseMirrorPlugins() {
    const plugins = [
      createClickHandler(this.editor, this.options, this.name),
    ];

    if (this.options.linkOnPaste) {
      plugins.push(createPasteHandler(this.editor, this.options));
    }

    plugins.push(createPasteLinkifier(this.options, this.name));

    return plugins;
  },
});

export { isAllowedUriByProtocol as isAllowedUri, pasteRegex };
