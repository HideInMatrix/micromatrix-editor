import { computePosition, type ComputePositionConfig, type VirtualElement } from "@floating-ui/dom";
import type { Editor } from "@mxm-editor/core";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  type EditorState,
  type EditorView,
  type Node as ProseMirrorNode,
  type ResolvedPos,
} from "@mxm-editor/pm";

export interface RuleContext {
  node: ProseMirrorNode;
  pos: number;
  depth: number;
  parent: ProseMirrorNode | null;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  $pos: ResolvedPos;
  view: EditorView;
}

export interface DragHandleRule {
  id: string;
  evaluate: (context: RuleContext) => number;
}

export type EdgeDetectionPreset = "left" | "right" | "both" | "none";

export interface EdgeDetectionConfig {
  edges: Array<"left" | "right" | "top" | "bottom">;
  threshold: number;
  strength: number;
}

export interface NestedOptions {
  rules?: DragHandleRule[];
  defaultRules?: boolean;
  allowedContainers?: string[];
  edgeDetection?: EdgeDetectionPreset | Partial<EdgeDetectionConfig>;
}

export interface NormalizedNestedOptions {
  enabled: boolean;
  rules: DragHandleRule[];
  defaultRules: boolean;
  allowedContainers: string[] | undefined;
  edgeDetection: EdgeDetectionConfig;
}

export interface DragHandlePluginProps {
  pluginKey?: PluginKey | string;
  editor: Editor;
  element: HTMLElement;
  onNodeChange?: (data: {
    editor: Editor;
    node: ProseMirrorNode | null;
    pos: number;
  }) => void;
  onElementDragStart?: (e: DragEvent) => void;
  onElementDragEnd?: (e: DragEvent) => void;
  computePositionConfig?: ComputePositionConfig;
  getReferencedVirtualElement?: () => VirtualElement | null;
  nestedOptions: NormalizedNestedOptions;
  initialLocked?: boolean;
}

interface DragTarget {
  node: ProseMirrorNode;
  pos: number;
  depth: number;
  dom: HTMLElement;
}

const DEFAULT_EDGE_CONFIG: EdgeDetectionConfig = {
  edges: ["left", "top"],
  threshold: 12,
  strength: 500,
};

export const dragHandlePluginDefaultKey = new PluginKey("dragHandle");

export const defaultRules: DragHandleRule[] = [
  {
    id: "listItemFirstChild",
    evaluate: ({ parent, isFirst }) => {
      if (!isFirst) {
        return 0;
      }

      return parent && ["listItem", "taskItem"].includes(parent.type.name)
        ? 1000
        : 0;
    },
  },
  {
    id: "listWrapperDeprioritize",
    evaluate: ({ node }) => {
      const firstChild = node.firstChild;

      return firstChild && ["listItem", "taskItem"].includes(firstChild.type.name)
        ? 1000
        : 0;
    },
  },
  {
    id: "tableStructure",
    evaluate: ({ node, parent }) => {
      if (["tableRow", "tableCell", "tableHeader"].includes(node.type.name)) {
        return 1000;
      }

      return parent?.type.name === "tableHeader" ? 1000 : 0;
    },
  },
  {
    id: "inlineContent",
    evaluate: ({ node }) => (node.isInline || node.isText ? 1000 : 0),
  },
];

function normalizeEdgeDetection(
  input: EdgeDetectionPreset | Partial<EdgeDetectionConfig> | undefined,
): EdgeDetectionConfig {
  if (input === undefined || input === "left") {
    return { ...DEFAULT_EDGE_CONFIG };
  }

  if (input === "right") {
    return {
      edges: ["right", "top"],
      threshold: DEFAULT_EDGE_CONFIG.threshold,
      strength: DEFAULT_EDGE_CONFIG.strength,
    };
  }

  if (input === "both") {
    return {
      edges: ["left", "right", "top"],
      threshold: DEFAULT_EDGE_CONFIG.threshold,
      strength: DEFAULT_EDGE_CONFIG.strength,
    };
  }

  if (input === "none") {
    return {
      edges: [],
      threshold: 0,
      strength: 0,
    };
  }

  return {
    ...DEFAULT_EDGE_CONFIG,
    ...input,
  };
}

export function normalizeNestedOptions(
  input: boolean | NestedOptions | undefined,
): NormalizedNestedOptions {
  if (input === false || input === undefined) {
    return {
      enabled: false,
      rules: [],
      defaultRules: true,
      allowedContainers: undefined,
      edgeDetection: normalizeEdgeDetection("none"),
    };
  }

  if (input === true) {
    return {
      enabled: true,
      rules: [],
      defaultRules: true,
      allowedContainers: undefined,
      edgeDetection: normalizeEdgeDetection("left"),
    };
  }

  return {
    enabled: true,
    rules: input.rules ?? [],
    defaultRules: input.defaultRules ?? true,
    allowedContainers: input.allowedContainers,
    edgeDetection: normalizeEdgeDetection(input.edgeDetection),
  };
}

function hideHandle(element: HTMLElement) {
  element.style.visibility = "hidden";
  element.style.pointerEvents = "none";
}

function showHandle(element: HTMLElement, editor: Editor) {
  if (!editor.isEditable) {
    hideHandle(element);
    return;
  }

  element.style.visibility = "visible";
  element.style.pointerEvents = "auto";
}

function getNodeDom(view: EditorView, pos: number) {
  const domNode = view.nodeDOM(pos);

  if (domNode instanceof HTMLElement) {
    return domNode;
  }

  return domNode instanceof Text ? domNode.parentElement : null;
}

function resolvePosAtCoords(
  view: EditorView,
  coords: { x: number; y: number },
) {
  const position = view.posAtCoords({
    left: coords.x,
    top: coords.y,
  });

  if (!position) {
    return null;
  }

  const resolvedPos = view.state.doc.resolve(
    position.inside >= 0 ? position.inside : position.pos,
  );

  return {
    position,
    $pos: resolvedPos,
  };
}

function isAllowedInContainer(
  $pos: ResolvedPos,
  depth: number,
  allowedContainers: string[] | undefined,
) {
  if (!allowedContainers?.length) {
    return true;
  }

  for (let currentDepth = depth - 1; currentDepth > 0; currentDepth -= 1) {
    if (allowedContainers.includes($pos.node(currentDepth).type.name)) {
      return true;
    }
  }

  return false;
}

function calculateEdgeDeduction(
  coords: { x: number; y: number },
  element: HTMLElement,
  config: EdgeDetectionConfig,
  depth: number,
) {
  if (!config.edges.length) {
    return 0;
  }

  const rect = element.getBoundingClientRect();
  const nearEdge = config.edges.some((edge) => {
    if (edge === "left") {
      return coords.x - rect.left < config.threshold;
    }

    if (edge === "right") {
      return rect.right - coords.x < config.threshold;
    }

    if (edge === "top") {
      return coords.y - rect.top < config.threshold;
    }

    if (edge === "bottom") {
      return rect.bottom - coords.y < config.threshold;
    }

    return false;
  });

  return nearEdge ? config.strength * depth : 0;
}

function calculateScore(
  context: RuleContext,
  rules: DragHandleRule[],
  edgeConfig: EdgeDetectionConfig,
  coords: { x: number; y: number },
  element: HTMLElement,
) {
  let score = 1000;

  for (const rule of rules) {
    score -= rule.evaluate(context);

    if (score <= 0) {
      return -1;
    }
  }

  score -= calculateEdgeDeduction(coords, element, edgeConfig, context.depth);

  return score > 0 ? score : -1;
}

function findRootTarget(view: EditorView, coords: { x: number; y: number }) {
  const resolved = resolvePosAtCoords(view, coords);

  if (!resolved || resolved.$pos.depth < 1) {
    return null;
  }

  const node = resolved.$pos.node(1);
  const pos = resolved.$pos.before(1);
  const dom = getNodeDom(view, pos);

  if (!dom || !node.isBlock || node.isText || node.isInline) {
    return null;
  }

  return {
    node,
    pos,
    depth: 1,
    dom,
  } satisfies DragTarget;
}

function findBestDragTarget(
  view: EditorView,
  coords: { x: number; y: number },
  nestedOptions: NormalizedNestedOptions,
) {
  const resolved = resolvePosAtCoords(view, coords);

  if (!resolved) {
    return null;
  }

  const rules = [
    ...(nestedOptions.defaultRules ? defaultRules : []),
    ...nestedOptions.rules,
  ];

  const candidates: DragTarget[] = [];

  for (let depth = resolved.$pos.depth; depth > 0; depth -= 1) {
    const node = resolved.$pos.node(depth);

    if (!node.isBlock || node.isText || node.isInline) {
      continue;
    }

    if (!isAllowedInContainer(resolved.$pos, depth, nestedOptions.allowedContainers)) {
      continue;
    }

    const pos = resolved.$pos.before(depth);
    const dom = getNodeDom(view, pos);

    if (!dom) {
      continue;
    }

    const parent = depth > 0 ? resolved.$pos.node(depth - 1) : null;
    const index = depth > 0 ? resolved.$pos.index(depth - 1) : 0;
    const siblingCount = parent?.childCount ?? 1;
    const context: RuleContext = {
      node,
      pos,
      depth,
      parent,
      index,
      isFirst: index === 0,
      isLast: index === siblingCount - 1,
      $pos: resolved.$pos,
      view,
    };
    const score = calculateScore(
      context,
      rules,
      nestedOptions.edgeDetection,
      coords,
      dom,
    );

    if (score < 0) {
      continue;
    }

    candidates.push({
      node,
      pos,
      depth: depth * 1000 + score,
      dom,
    });
  }

  if (!candidates.length) {
    return null;
  }

  candidates.sort((left, right) => right.depth - left.depth);

  return candidates[0];
}

function findDragTarget(
  view: EditorView,
  coords: { x: number; y: number },
  nestedOptions: NormalizedNestedOptions,
) {
  return nestedOptions.enabled
    ? findBestDragTarget(view, coords, nestedOptions)
    : findRootTarget(view, coords);
}

export const DragHandlePlugin = ({
  pluginKey = dragHandlePluginDefaultKey,
  element,
  editor,
  computePositionConfig,
  getReferencedVirtualElement,
  onNodeChange,
  onElementDragStart,
  onElementDragEnd,
  nestedOptions,
  initialLocked = false,
}: DragHandlePluginProps) => {
  const wrapper = document.createElement("div");
  let locked = initialLocked;
  let currentNode: ProseMirrorNode | null = null;
  let currentNodePos = -1;
  let rafId: number | null = null;
  let pendingMouseCoords: { x: number; y: number } | null = null;

  const resetCurrentNode = () => {
    currentNode = null;
    currentNodePos = -1;
    onNodeChange?.({
      editor,
      node: null,
      pos: -1,
    });
  };

  const repositionDragHandle = (dom: HTMLElement) => {
    const virtualElement = getReferencedVirtualElement?.() ?? {
      getBoundingClientRect: () => dom.getBoundingClientRect(),
    };

    void computePosition(
      virtualElement,
      element,
      computePositionConfig,
    ).then(({ x, y, strategy }) => {
      Object.assign(element.style, {
        position: strategy,
        left: `${x}px`,
        top: `${y}px`,
      });
    });
  };

  const stopTracking = () => {
    hideHandle(element);
    resetCurrentNode();
  };

  const onDragStart = (event: DragEvent) => {
    onElementDragStart?.(event);
    let nodeSelection: NodeSelection | null = null;

    if (currentNodePos >= 0) {
      try {
        nodeSelection = NodeSelection.create(editor.state.doc, currentNodePos);
        editor.view?.dispatch(
          editor.state.tr.setSelection(nodeSelection),
        );
      } catch {
        // Ignore invalid node selections and keep drag behavior best-effort.
      }
    }

    const dom = currentNodePos >= 0 && editor.view
      ? getNodeDom(editor.view, currentNodePos)
      : null;

    if (dom && event.dataTransfer) {
      event.dataTransfer.effectAllowed = "copyMove";
      event.dataTransfer.setData("text/plain", currentNode?.textContent ?? "");
      event.dataTransfer.setData("text/html", dom.outerHTML);

      if (event.dataTransfer.setDragImage) {
        event.dataTransfer.setDragImage(dom, 0, 0);
      }
    }

    if (editor.view && nodeSelection) {
      editor.view.dragging = {
        slice: nodeSelection.content(),
        move: true,
        node: nodeSelection,
      } as typeof editor.view.dragging & {
        node: NodeSelection;
      };
    }

    element.dataset.dragging = "true";
    window.setTimeout(() => {
      element.style.pointerEvents = "none";
    }, 0);
  };

  const onDragEnd = (event: DragEvent) => {
    onElementDragEnd?.(event);
    if (editor.view?.dragging) {
      editor.view.dragging = null;
    }
    hideHandle(element);
    element.style.pointerEvents = "auto";
    element.dataset.dragging = "false";
  };

  const cancelPendingFrame = () => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
      pendingMouseCoords = null;
    }
  };

  const cleanup = () => {
    cancelPendingFrame();
    element.removeEventListener("dragstart", onDragStart);
    element.removeEventListener("dragend", onDragEnd);
  };

  return {
    unbind() {
      cleanup();
    },
    plugin: new Plugin({
      key: typeof pluginKey === "string" ? new PluginKey(pluginKey) : pluginKey,
      state: {
        init() {
          return {
            locked: initialLocked,
          };
        },
        apply(tr, value, _oldState, state) {
          const nextLocked = tr.getMeta("lockDragHandle");
          const shouldHide = tr.getMeta("hideDragHandle");

          if (typeof nextLocked === "boolean") {
            locked = nextLocked;
          }

          if (shouldHide) {
            hideHandle(element);
            resetCurrentNode();
          }

          if (tr.docChanged && currentNodePos >= 0) {
            const mapped = tr.mapping.mapResult(currentNodePos);

            if (mapped.deleted) {
              resetCurrentNode();
            } else {
              currentNodePos = mapped.pos;
              currentNode = state.doc.nodeAt(currentNodePos) ?? currentNode;
            }
          }

          return {
            ...value,
            locked,
          };
        },
      },
      view: (view) => {
        element.draggable = !locked;
        element.dataset.dragging = "false";
        wrapper.style.pointerEvents = "none";
        wrapper.style.position = "absolute";
        wrapper.style.top = "0";
        wrapper.style.left = "0";
        wrapper.appendChild(element);
        view.dom.parentElement?.appendChild(wrapper);
        hideHandle(element);
        element.addEventListener("dragstart", onDragStart);
        element.addEventListener("dragend", onDragEnd);

        return {
          update(updatedView, oldState) {
            element.draggable = !locked;

            if (!editor.isEditable) {
              hideHandle(element);
              return;
            }

            if (updatedView.state.doc.eq(oldState.doc) || currentNodePos < 0) {
              return;
            }

            const dom = getNodeDom(updatedView, currentNodePos);

            if (!dom) {
              stopTracking();
              return;
            }

            repositionDragHandle(dom);
          },
          destroy() {
            cleanup();
            wrapper.remove();
          },
        };
      },
      props: {
        handleDOMEvents: {
          keydown() {
            if (locked) {
              return false;
            }

            stopTracking();
            return false;
          },
          mouseleave(_view, event) {
            if (locked) {
              return false;
            }

            const relatedTarget = event.relatedTarget;

            if (relatedTarget instanceof Node && wrapper.contains(relatedTarget)) {
              return false;
            }

            stopTracking();
            return false;
          },
          mousemove(view, event) {
            if (locked || !editor.isEditable) {
              return false;
            }

            pendingMouseCoords = {
              x: event.clientX,
              y: event.clientY,
            };

            if (rafId !== null) {
              return false;
            }

            rafId = window.requestAnimationFrame(() => {
              rafId = null;

              if (!pendingMouseCoords) {
                return;
              }

              const coords = pendingMouseCoords;

              pendingMouseCoords = null;

              const target = findDragTarget(view, coords, nestedOptions);

              if (!target) {
                stopTracking();
                return;
              }

              const changed = currentNodePos !== target.pos;

              currentNode = target.node;
              currentNodePos = target.pos;

              if (changed) {
                onNodeChange?.({
                  editor,
                  node: target.node,
                  pos: target.pos,
                });
              }

              repositionDragHandle(target.dom);
              showHandle(element, editor);
            });

            return false;
          },
        },
      },
    }),
  };
};
