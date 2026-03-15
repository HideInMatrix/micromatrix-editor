import { Extension } from "@mxm-editor/core";
import type { EditorState, Node as ProseMirrorNode } from "@mxm-editor/pm";
import {
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
} from "@mxm-editor/pm";

export type FocusMode = "all" | "deepest" | "shallowest";

export interface FocusOptions {
  className: string;
  mode: FocusMode;
}

interface FocusedNode {
  depth: number;
  node: ProseMirrorNode;
  pos: number;
}

const focusPluginKey = new PluginKey("focus");

function resolveNodeDepth(
  doc: ProseMirrorNode,
  pos: number,
  node: ProseMirrorNode,
) {
  const $pos = doc.resolve(Math.min(pos + 1, doc.content.size));

  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.before(depth) === pos && $pos.node(depth) === node) {
      return depth;
    }
  }

  return $pos.depth;
}

function collectFocusedNodes(state: EditorState) {
  const nodes = new Map<number, FocusedNode>();
  const { selection } = state;

  const addNode = (node: ProseMirrorNode, pos: number, depth?: number) => {
    if (pos < 0 || node.isText || node.type.name === "doc") {
      return;
    }

    nodes.set(pos, {
      depth: depth ?? resolveNodeDepth(state.doc, pos, node),
      node,
      pos,
    });
  };

  if (selection.empty) {
    for (let depth = 1; depth <= selection.$from.depth; depth += 1) {
      addNode(selection.$from.node(depth), selection.$from.before(depth), depth);
    }

    return [...nodes.values()];
  }

  state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    addNode(node, pos);
    return true;
  });

  for (let depth = 1; depth <= selection.$from.depth; depth += 1) {
    addNode(selection.$from.node(depth), selection.$from.before(depth), depth);
  }

  for (let depth = 1; depth <= selection.$to.depth; depth += 1) {
    addNode(selection.$to.node(depth), selection.$to.before(depth), depth);
  }

  return [...nodes.values()];
}

function filterByMode(nodes: FocusedNode[], mode: FocusMode) {
  if (mode === "all" || nodes.length <= 1) {
    return nodes;
  }

  const targetDepth = mode === "deepest"
    ? Math.max(...nodes.map((node) => node.depth))
    : Math.min(...nodes.map((node) => node.depth));

  return nodes.filter((node) => node.depth === targetDepth);
}

export const Focus = Extension.create<FocusOptions>({
  name: "focus",

  addOptions() {
    return {
      className: "has-focus",
      mode: "all",
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: focusPluginKey,
        props: {
          decorations: (state) => {
            const focusedNodes = filterByMode(
              collectFocusedNodes(state),
              this.options.mode,
            );

            if (!focusedNodes.length) {
              return null;
            }

            return DecorationSet.create(
              state.doc,
              focusedNodes.map(({ pos, node }) =>
                Decoration.node(pos, pos + node.nodeSize, {
                  class: this.options.className,
                })),
            );
          },
        },
      }),
    ];
  },
});
