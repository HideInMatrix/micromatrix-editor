import {
  type Editor,
  Node,
  defaultBlockAt,
  findChildren,
  findParentNode,
  findParentNodeClosestToPos,
  mergeAttributes,
  type NodeWithPosition,
} from "@mxm-editor/core";
import { DetailsContent } from "@mxm-editor/extension-details-content";
import { DetailsSummary } from "@mxm-editor/extension-details-summary";
import { Plugin, PluginKey, Selection, TextSelection } from "@mxm-editor/pm";

export interface DetailsOptions {
  persist: boolean;
  openClassName: string;
  HTMLAttributes: Record<string, string>;
}

function isNodeVisible(position: number, editor: Editor) {
  if (!editor.view) {
    return true;
  }

  const dom = editor.view.domAtPos(position).node;
  const element = dom instanceof HTMLElement ? dom : dom.parentElement;

  if (!element) {
    return true;
  }

  return element.offsetParent !== null;
}

function findClosestVisibleNode(
  currentNode: NodeWithPosition,
  editor: Editor,
) {
  let match: NodeWithPosition | undefined = currentNode;

  while (match) {
    if (isNodeVisible(match.start, editor)) {
      return match;
    }

    const $pos = editor.state.doc.resolve(match.pos + 1);

    const nextMatch = findParentNodeClosestToPos(
      $pos,
      (node) => node.type === currentNode.node.type,
    );

    if (!nextMatch || nextMatch.pos === match.pos) {
      break;
    }

    match = nextMatch;
  }

  return undefined;
}

function toggleElementClass(
  element: HTMLElement,
  className: string,
  setTo?: boolean,
) {
  if (setTo === undefined) {
    element.classList.toggle(className);
    return;
  }

  element.classList.toggle(className, setTo);
}

export const Details = Node.create<DetailsOptions>({
  name: "details",

  content: "detailsSummary detailsContent",
  group: "block",
  defining: true,
  isolating: true,

  addOptions() {
    return {
      persist: false,
      openClassName: "is-open",
      HTMLAttributes: {},
    };
  },

  addExtensions() {
    return [
      DetailsSummary,
      DetailsContent,
    ];
  },

  addAttributes() {
    return {
      open: {
        default: false,
        parseHTML: (element: HTMLElement) =>
          this.options.persist ? element.hasAttribute("open") : false,
        renderHTML: (attributes: Record<string, any>) => {
          if (!this.options.persist || !attributes.open) {
            return {} as Record<string, string>;
          }

          return {
            open: "",
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "details",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  renderMarkdown({ node, children }) {
    return `<details${node.attrs?.open ? " open" : ""}>\n${children}</details>\n\n`;
  },

  addNodeView() {
    const nodeType = this.editor.schema.nodes[this.name];

    return ({ editor, getPos, node, HTMLAttributes }) => {
      const dom = document.createElement("div");
      const toggle = document.createElement("button");
      const contentDOM = document.createElement("div");
      const attributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": this.name,
      });
      const toggleDetailsContent = (setTo?: boolean) => {
        toggleElementClass(dom, this.options.openClassName, setTo);
        contentDOM
          .querySelector(':scope > div[data-type="detailsContent"]')
          ?.dispatchEvent(new Event("toggleDetailsContent"));
      };

      Object.entries(attributes).forEach(([key, value]) => {
        dom.setAttribute(key, value);
      });

      toggle.type = "button";
      toggle.setAttribute("data-details-toggle", "");
      dom.append(toggle, contentDOM);

      if (node.attrs.open) {
        queueMicrotask(() => {
          toggleDetailsContent(true);
        });
      }

      toggle.addEventListener("click", () => {
        if (!this.options.persist) {
          toggleDetailsContent();
          editor.commands.focus(undefined, {
            scrollIntoView: false,
          });
          return;
        }

        if (!editor.isEditable || typeof getPos !== "function" || !editor.view) {
          return;
        }

        const pos = getPos();

        if (typeof pos !== "number") {
          return;
        }

        const currentNode = editor.state.doc.nodeAt(pos);

        if (!currentNode || currentNode.type !== nodeType) {
          return;
        }

        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, {
            ...currentNode.attrs,
            open: !currentNode.attrs.open,
          }),
        );
        editor.commands.focus(undefined, {
          scrollIntoView: false,
        });
      });

      return {
        dom,
        contentDOM,
        ignoreMutation(mutation) {
          if (mutation.type === "selection") {
            return false;
          }

          return !dom.contains(mutation.target) || dom === mutation.target;
        },
        update: (updatedNode) => {
          if (updatedNode.type !== nodeType) {
            return false;
          }

          if (updatedNode.attrs.open !== undefined) {
            toggleDetailsContent(Boolean(updatedNode.attrs.open));
          }

          return true;
        },
      };
    };
  },

  addCommands() {
    const nodeType = this.editor.schema.nodes[this.name];

    return {
      setDetails:
        () =>
        ({ state, commands, tr }) => {
          const { schema, selection } = state;
          const { $from, $to } = selection;
          const range = $from.blockRange($to);

          if (!range) {
            return false;
          }

          const slice = state.doc.slice(range.start, range.end);
          const match = schema.nodes.detailsContent.contentMatch.matchFragment(
            slice.content,
          );

          if (!match) {
            return false;
          }

          const content = slice.toJSON().content ?? [];

          const inserted = commands.insertContentAt(
            {
              from: range.start,
              to: range.end,
            },
            {
              type: this.name,
              content: [
                {
                  type: "detailsSummary",
                },
                {
                  type: "detailsContent",
                  content,
                },
              ],
            },
          );

          if (!inserted) {
            return false;
          }

          tr.setSelection(
            Selection.near(
              tr.doc.resolve(Math.min(range.start + 2, tr.doc.content.size)),
              1,
            ),
          );

          return true;
        },
      unsetDetails:
        () =>
        ({ state, commands, tr }) => {
          const { selection, schema } = state;
          const details = findParentNode(
            (node) => node.type === nodeType,
          )(selection);

          if (!details) {
            return false;
          }

          const detailsSummaries = findChildren(
            details.node,
            (node) => node.type === schema.nodes.detailsSummary,
          );
          const detailsContents = findChildren(
            details.node,
            (node) => node.type === schema.nodes.detailsContent,
          );

          if (!detailsSummaries.length || !detailsContents.length) {
            return false;
          }

          const detailsSummary = detailsSummaries[0];
          const detailsContent = detailsContents[0];
          const from = details.pos;
          const to = from + details.node.nodeSize;
          const $from = state.doc.resolve(from);
          const defaultTypeForSummary = $from.parent.type.contentMatch.defaultType;
          const summaryContent =
            defaultTypeForSummary
              ?.create(null, detailsSummary.node.content)
              .toJSON() ?? null;
          const mergedContent = [
            ...(summaryContent ? [summaryContent] : []),
            ...detailsContent.node.content.toJSON(),
          ];

          const inserted = commands.insertContentAt(
              {
                from,
                to,
              },
              mergedContent,
            );

          if (!inserted) {
            return false;
          }

          tr.setSelection(
            Selection.near(
              tr.doc.resolve(Math.min(from + 1, tr.doc.content.size)),
              1,
            ),
          );

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    const nodeType = this.editor.schema.nodes[this.name];

    return {
      Backspace: () => {
        const { schema, selection } = this.editor.state;
        const { empty, $anchor } = selection;

        if (!empty || $anchor.parent.type !== schema.nodes.detailsSummary) {
          return false;
        }

        if ($anchor.parentOffset !== 0) {
          return this.editor.commands.deleteRange({
            from: $anchor.pos - 1,
            to: $anchor.pos,
          });
        }

        return this.editor.commands.unsetDetails();
      },

      Enter: () => {
        const { state, view } = this.editor;
        const { schema, selection } = state;
        const { $head } = selection;

        if ($head.parent.type !== schema.nodes.detailsSummary || !view) {
          return false;
        }

        const details = findParentNode(
          (node) => node.type === nodeType,
        )(selection);

        if (!details) {
          return false;
        }

        const detailsContents = findChildren(
          details.node,
          (node) => node.type === schema.nodes.detailsContent,
        );
        const detailsContent = detailsContents[0];

        if (!detailsContent) {
          return false;
        }

        const contentPos = details.start + detailsContent.pos + 1;
        const isVisible = isNodeVisible(contentPos, this.editor);
        const parentDepth = details.depth - 1;
        const above = isVisible
          ? detailsContent.node
          : $head.node(parentDepth);
        const after = isVisible ? 0 : $head.indexAfter(parentDepth);
        const type = defaultBlockAt(above.contentMatchAt(after));

        if (!type || !above.canReplaceWith(after, after, type)) {
          return false;
        }

        const node = type.createAndFill();

        if (!node) {
          return false;
        }

        const pos = isVisible
          ? contentPos
          : details.pos + details.node.nodeSize;
        const tr = state.tr.replaceWith(pos, pos, node);

        tr.setSelection(Selection.near(tr.doc.resolve(pos), 1));
        tr.scrollIntoView();
        view.dispatch(tr);

        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const nodeType = this.editor.schema.nodes[this.name];

    return [
      new Plugin({
        key: new PluginKey("detailsSelection"),
        appendTransaction: (transactions, oldState, newState) => {
          if (!this.editor.view || this.editor.view.composing) {
            return null;
          }

          if (
            !transactions.some((transaction) => transaction.selectionSet)
            || !oldState.selection.empty
            || !newState.selection.empty
          ) {
            return null;
          }

          const details = findParentNode(
            (node) => node.type === nodeType,
          )(newState.selection);

          if (!details || isNodeVisible(newState.selection.$from.pos, this.editor)) {
            return null;
          }

          const visibleDetails = findClosestVisibleNode(details, this.editor) ?? details;
          const detailsSummaries = findChildren(
            visibleDetails.node,
            (node) => node.type === newState.schema.nodes.detailsSummary,
          );
          const detailsSummary = detailsSummaries[0];

          if (!detailsSummary) {
            return null;
          }

          const selectionDirection =
            oldState.selection.from < newState.selection.from
              ? "forward"
              : "backward";
          const correctedPosition =
            selectionDirection === "forward"
              ? visibleDetails.start + detailsSummary.pos
              : visibleDetails.pos
                + detailsSummary.pos
                + detailsSummary.node.nodeSize;

          return newState.tr.setSelection(
            TextSelection.create(newState.doc, correctedPosition),
          );
        },
      }),
    ];
  },
});
