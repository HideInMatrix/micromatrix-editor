import { Extension, type Editor } from "@mxm-editor/core";
import {
  Plugin,
  PluginKey,
  type EditorView,
  type Node as ProseMirrorNode,
  type Transaction,
} from "@mxm-editor/pm";

export interface TableOfContentsAnchor {
  active: boolean;
  content: string;
  dom: HTMLElement | null;
  editor: Editor;
  id: string;
  isActive: boolean;
  isScrolledOver: boolean;
  itemIndex: number;
  level: number;
  node: ProseMirrorNode;
  originalLevel: number;
  pos: number;
  scrolled: boolean;
  textContent: string;
}

export interface TableOfContentsStorage {
  anchors: HTMLElement[];
  content: TableOfContentsAnchor[];
  scrollHandler: () => void;
  scrollPosition: number;
}

type ScrollParent = Window | HTMLElement;
type TableOfContentsAnchorBase = Omit<
  TableOfContentsAnchor,
  "active" | "isActive" | "isScrolledOver" | "itemIndex" | "scrolled"
>;

interface TableOfContentsIDUpdate {
  attrs: Record<string, any>;
  pos: number;
}

export interface TableOfContentsOptions {
  anchorTypes: string[];
  getIndex: (
    anchor: TableOfContentsAnchorBase,
    previousAnchors: TableOfContentsAnchor[],
    level: number,
  ) => number;
  getLevel: (
    anchor: TableOfContentsAnchorBase,
    previousAnchors: TableOfContentsAnchor[],
  ) => number;
  getId: (content: string) => string;
  scrollParent: () => ScrollParent | null;
  onUpdate?: (anchors: TableOfContentsAnchor[], isCreate: boolean) => void;
}

const tableOfContentsPluginKey = new PluginKey("tableOfContents");

function createFallbackID() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `mxm-toc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isWindowScrollParent(
  scrollParent: ScrollParent | null,
): scrollParent is Window {
  return typeof Window !== "undefined" && scrollParent instanceof Window;
}

function getScrollPosition(scrollParent: ScrollParent | null) {
  if (!scrollParent) {
    return 0;
  }

  return isWindowScrollParent(scrollParent)
    ? scrollParent.scrollY
    : scrollParent.scrollTop;
}

function getActiveAnchorId(anchors: TableOfContentsAnchor[]) {
  const activeAnchor = [...anchors]
    .reverse()
    .find((anchor) => anchor.dom && anchor.isScrolledOver);

  return activeAnchor?.id ?? anchors[0]?.id ?? null;
}

function ensureUniqueID(
  seen: Set<string>,
  candidate: string,
) {
  const baseCandidate = candidate.trim() || createFallbackID();
  let nextCandidate = baseCandidate;
  let suffix = 2;

  while (seen.has(nextCandidate)) {
    nextCandidate = `${baseCandidate}-${suffix}`;
    suffix += 1;
  }

  seen.add(nextCandidate);

  return nextCandidate;
}

function getHeadingLevel(node: ProseMirrorNode) {
  const level = Number(node.attrs.level ?? 1);

  return Number.isFinite(level) && level > 0 ? level : 1;
}

function isTableOfContentsAnchor(
  node: ProseMirrorNode,
  options: TableOfContentsOptions,
) {
  return options.anchorTypes.includes(node.type.name) && node.textContent.length > 0;
}

function getAnchorElement(view: EditorView, pos: number) {
  const dom = view.nodeDOM(pos);

  return dom instanceof HTMLElement ? dom : null;
}

function getAnchorID(node: ProseMirrorNode, options: TableOfContentsOptions) {
  const tocID =
    typeof node.attrs["data-toc-id"] === "string"
      ? node.attrs["data-toc-id"]
      : "";
  const id =
    typeof node.attrs.id === "string"
      ? node.attrs.id
      : "";

  return tocID || id || options.getId(node.textContent) || createFallbackID();
}

function collectIDUpdates(
  doc: ProseMirrorNode,
  options: TableOfContentsOptions,
) {
  const seen = new Set<string>();
  const updates: TableOfContentsIDUpdate[] = [];

  doc.descendants((node, pos) => {
    if (!isTableOfContentsAnchor(node, options)) {
      return true;
    }

    const nextID = ensureUniqueID(seen, getAnchorID(node, options));
    const currentID =
      typeof node.attrs["data-toc-id"] === "string"
        ? node.attrs["data-toc-id"]
        : null;
    const currentElementID =
      typeof node.attrs.id === "string"
        ? node.attrs.id
        : null;

    if (currentID === nextID && currentElementID === nextID) {
      return true;
    }

    updates.push({
      pos,
      attrs: {
        ...node.attrs,
        id: nextID,
        "data-toc-id": nextID,
      },
    });

    return true;
  });

  return updates;
}

function applyIDUpdates(tr: Transaction, updates: TableOfContentsIDUpdate[]) {
  updates.forEach(({ pos, attrs }) => {
    tr.setNodeMarkup(pos, undefined, attrs);
  });

  return tr;
}

function withActiveStates(
  anchors: TableOfContentsAnchor[],
  scrollPosition: number,
) {
  const withScrollState = anchors.map((anchor) => {
    const isScrolledOver = anchor.dom
      ? scrollPosition >= anchor.dom.offsetTop
      : false;

    return {
      ...anchor,
      isScrolledOver,
      scrolled: isScrolledOver,
    };
  });
  const activeID = getActiveAnchorId(withScrollState);

  return withScrollState.map((anchor) => ({
    ...anchor,
    active: anchor.id === activeID,
    isActive: anchor.id === activeID,
  }));
}

export function getLastHeadingOnLevel(
  headings: TableOfContentsAnchor[],
  level: number,
): TableOfContentsAnchor | undefined {
  let heading = headings
    .filter((currentHeading) => currentHeading.level === level)
    .at(-1);

  if (level === 0) {
    return undefined;
  }

  if (!heading) {
    heading = getLastHeadingOnLevel(headings, level - 1);
  }

  return heading;
}

export function getHeadlineLevel(
  anchor: TableOfContentsAnchorBase,
  previousAnchors: TableOfContentsAnchor[],
) {
  let level = 1;
  const previousAnchor = previousAnchors.at(-1);
  const highestAnchorAbove = [...previousAnchors]
    .reverse()
    .find((currentAnchor) => currentAnchor.originalLevel <= anchor.originalLevel);
  const highestLevelAbove = highestAnchorAbove?.level || 1;

  if (anchor.originalLevel > (previousAnchor?.originalLevel || 1)) {
    level = (previousAnchor?.level || 1) + 1;
  } else if (anchor.originalLevel < (previousAnchor?.originalLevel || 1)) {
    level = highestLevelAbove;
  } else {
    level = previousAnchor?.level || 1;
  }

  return level;
}

export function getLinearIndexes(
  _anchor: TableOfContentsAnchorBase,
  previousAnchors: TableOfContentsAnchor[],
) {
  const previousAnchor = previousAnchors.at(-1);

  if (!previousAnchor) {
    return 1;
  }

  return previousAnchor.itemIndex + 1;
}

export function getHierarchicalIndexes(
  anchor: TableOfContentsAnchorBase,
  previousAnchors: TableOfContentsAnchor[],
  currentLevel?: number,
) {
  const level = currentLevel || anchor.level || anchor.originalLevel || 1;
  const previousAnchorsOnLevelOrBelow = previousAnchors.filter(
    (previousAnchor) => previousAnchor.level <= level,
  );
  const previousAnchor = previousAnchorsOnLevelOrBelow.at(-1);

  if (previousAnchor?.level === level) {
    return previousAnchor.itemIndex + 1;
  }

  return 1;
}

export function debounce<Args extends unknown[]>(
  func: (...args: Args) => void,
  wait: number,
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Args) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

function setTableOfContentsData(
  editor: Editor,
  options: TableOfContentsOptions,
  storage: TableOfContentsStorage,
  isCreate: boolean,
) {
  if (editor.isDestroyed || !editor.view) {
    return;
  }

  const anchors: TableOfContentsAnchor[] = [];
  const anchorElements: HTMLElement[] = [];
  const seen = new Set<string>();
  const scrollParent = options.scrollParent();

  storage.scrollPosition = getScrollPosition(scrollParent);

  editor.state.doc.descendants((node, pos) => {
    if (!isTableOfContentsAnchor(node, options)) {
      return true;
    }

    const element = getAnchorElement(editor.view!, pos);
    const id = ensureUniqueID(seen, getAnchorID(node, options));
    const baseAnchor: TableOfContentsAnchorBase = {
      content: element?.innerHTML ?? node.textContent,
      dom: element,
      editor,
      id,
      level: 1,
      node,
      originalLevel: getHeadingLevel(node),
      pos,
      textContent: node.textContent,
    };
    const level = Math.max(1, options.getLevel(baseAnchor, anchors));
    const indexedAnchor: TableOfContentsAnchorBase = {
      ...baseAnchor,
      level,
    };
    const anchor: TableOfContentsAnchor = {
      ...indexedAnchor,
      itemIndex: Math.max(1, options.getIndex(indexedAnchor, anchors, level)),
      active: false,
      isActive: false,
      isScrolledOver: false,
      scrolled: false,
    };

    if (element) {
      element.id = id;
      anchorElements.push(element);
    }

    anchors.push(anchor);

    return true;
  });

  storage.anchors = anchorElements;
  storage.content = withActiveStates(anchors, storage.scrollPosition);
  options.onUpdate?.(storage.content, isCreate);
}

export const TableOfContents = Extension.create<
  TableOfContentsOptions,
  TableOfContentsStorage
>({
  name: "tableOfContents",

  addOptions() {
    return {
      anchorTypes: ["heading"],
      getIndex: getLinearIndexes,
      getLevel: getHeadlineLevel,
      getId: (content) => {
        const base = content
          .trim()
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-");

        return base || createFallbackID();
      },
      scrollParent: () =>
        typeof window === "undefined" ? null : window,
      onUpdate: undefined,
    };
  },

  addStorage() {
    return {
      anchors: [],
      content: [],
      scrollHandler: () => undefined,
      scrollPosition: 0,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.anchorTypes,
        attributes: {
          id: {
            default: null,
            parseHTML: (element: HTMLElement) => element.id || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.id) {
                return {} as Record<string, string>;
              }

              return {
                id: String(attributes.id),
              };
            },
          },
          "data-toc-id": {
            default: null,
            parseHTML: (element: HTMLElement) => element.dataset.tocId || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes["data-toc-id"]) {
                return {} as Record<string, string>;
              }

              return {
                "data-toc-id": String(attributes["data-toc-id"]),
              };
            },
          },
        },
      },
    ];
  },

  onCreate() {
    if (!this.editor.view) {
      return;
    }

    const updates = collectIDUpdates(this.editor.state.doc, this.options);

    if (updates.length) {
      this.editor.view.dispatch(
        applyIDUpdates(this.editor.state.tr, updates)
          .setMeta(tableOfContentsPluginKey, true)
          .setMeta("preventUpdate", true),
      );
    }

    setTableOfContentsData(this.editor, this.options, this.storage, true);

    this.storage.scrollHandler = () => {
      this.storage.scrollPosition = getScrollPosition(this.options.scrollParent());
      this.storage.content = withActiveStates(
        this.storage.content,
        this.storage.scrollPosition,
      );
      this.options.onUpdate?.(this.storage.content, false);
    };

    const scrollParent = this.options.scrollParent();

    scrollParent?.addEventListener("scroll", this.storage.scrollHandler, {
      passive: true,
    });
  },

  onUpdate({ transaction }) {
    if (!transaction.docChanged || transaction.getMeta(tableOfContentsPluginKey)) {
      return;
    }

    setTableOfContentsData(this.editor, this.options, this.storage, false);
  },

  onDestroy() {
    const scrollParent = this.options.scrollParent();

    scrollParent?.removeEventListener("scroll", this.storage.scrollHandler);
  },

  addCommands() {
    return {
      updateTableOfContents:
        () =>
        ({ dispatch }) => {
          if (dispatch) {
            setTableOfContentsData(this.editor, this.options, this.storage, false);
          }

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tableOfContentsPluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (transactions.some((transaction) => transaction.getMeta(tableOfContentsPluginKey))) {
            return null;
          }

          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          const updates = collectIDUpdates(newState.doc, this.options);

          if (!updates.length) {
            return null;
          }

          return applyIDUpdates(newState.tr, updates).setMeta(
            tableOfContentsPluginKey,
            true,
          );
        },
      }),
    ];
  },
});
