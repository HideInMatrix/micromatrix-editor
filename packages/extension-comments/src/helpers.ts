import type { Editor } from "@mxm-editor/core";
import type {
  EditorState,
  Mark as ProseMirrorMark,
  MarkType,
  Node as ProseMirrorNode,
  Transaction,
} from "@mxm-editor/pm";
import {
  NodeSelection,
  TextSelection,
} from "@mxm-editor/pm";
import type {
  CommentsProvider,
  CommentsStorage,
  CommentsThread,
  FindThreadsOptions,
  FoundThread,
  GetThreadsOptions,
  InlineThreadSegment,
  SelectThreadOptions,
} from "./types";

export function normalizeThreadIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function areThreadIdsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => item === right[index]);
}

export function getThreadIdsFromMark(mark: ProseMirrorMark | null | undefined) {
  return normalizeThreadIds(mark?.attrs.threadIds);
}

function getMarkAtCursor(state: EditorState, markType: MarkType) {
  if (!state.selection.empty) {
    return null;
  }

  const directMark = markType.isInSet(
    state.storedMarks ?? state.selection.$from.marks(),
  );

  if (directMark) {
    return directMark;
  }

  const { $from } = state.selection;
  const after = $from.parent.childAfter($from.parentOffset).node;
  const afterMark = after ? markType.isInSet(after.marks) : null;

  if (afterMark) {
    return afterMark;
  }

  const before = $from.parent.childBefore($from.parentOffset).node;

  return before ? markType.isInSet(before.marks) : null;
}

export function getThreadIdsAtSelection(
  state: EditorState,
  markType: MarkType,
) {
  if (state.selection.empty) {
    return getThreadIdsFromMark(getMarkAtCursor(state, markType));
  }

  const threadIds = new Set<string>();

  state.doc.nodesBetween(state.selection.from, state.selection.to, (node) => {
    if (!node.isInline) {
      return true;
    }

    getThreadIdsFromMark(markType.isInSet(node.marks)).forEach((threadId) => {
      threadIds.add(threadId);
    });

    return !node.isLeaf;
  });

  return Array.from(threadIds);
}

export function getThreadIdsAtPos(
  state: EditorState,
  pos: number,
  markType: MarkType,
) {
  const resolvedPos = state.doc.resolve(
    Math.max(0, Math.min(pos, state.doc.content.size)),
  );
  const directMark = markType.isInSet(resolvedPos.marks());

  if (directMark) {
    return getThreadIdsFromMark(directMark);
  }

  const after = resolvedPos.parent.childAfter(resolvedPos.parentOffset).node;
  const afterMark = after ? markType.isInSet(after.marks) : null;

  if (afterMark) {
    return getThreadIdsFromMark(afterMark);
  }

  const before = resolvedPos.parent.childBefore(resolvedPos.parentOffset).node;

  return getThreadIdsFromMark(before ? markType.isInSet(before.marks) : null);
}

export function chooseThreadId(
  threadIds: string[],
  preferredId?: string | null,
) {
  if (!threadIds.length) {
    return null;
  }

  if (preferredId && threadIds.includes(preferredId)) {
    return preferredId;
  }

  return threadIds[0] ?? null;
}

export function collectInlineThreadSegments(
  doc: ProseMirrorNode,
  markType: MarkType,
) {
  const segments: InlineThreadSegment[] = [];

  doc.descendants((node, pos) => {
    if (!node.isInline) {
      return true;
    }

    const mark = markType.isInSet(node.marks);
    const threadIds = getThreadIdsFromMark(mark);

    if (!mark || !threadIds.length) {
      return !node.isLeaf;
    }

    segments.push({
      from: pos,
      to: pos + node.nodeSize,
      pos,
      node,
      mark,
      threadIds,
    });

    return !node.isLeaf;
  });

  return segments;
}

export function collectReferencedThreadIds(
  doc: ProseMirrorNode,
  markType: MarkType,
) {
  const threadIds = new Set<string>();

  collectInlineThreadSegments(doc, markType).forEach((segment) => {
    segment.threadIds.forEach((threadId) => {
      threadIds.add(threadId);
    });
  });

  return threadIds;
}

function canApplyMarkToInlineNode(
  doc: ProseMirrorNode,
  markType: MarkType,
  pos: number,
) {
  const resolvedPos = doc.resolve(Math.min(Math.max(pos, 0), doc.content.size));

  return resolvedPos.parent.type.allowsMarkType(markType);
}

export function hasMarkableContentInRange(
  doc: ProseMirrorNode,
  markType: MarkType,
  from: number,
  to: number,
) {
  let hasMarkableContent = false;

  doc.nodesBetween(from, to, (node, pos) => {
    if (node.isInline && canApplyMarkToInlineNode(doc, markType, pos)) {
      hasMarkableContent = true;
      return false;
    }

    return true;
  });

  return hasMarkableContent;
}

export function updateInlineThreadMarks(options: {
  tr: Transaction;
  markType: MarkType;
  from: number;
  to: number;
  transform: (
    threadIds: string[],
    context: {
      from: number;
      to: number;
      node: ProseMirrorNode;
      pos: number;
    },
  ) => string[];
}) {
  const { tr, markType, from, to, transform } = options;
  const updates: Array<{ from: number; to: number; threadIds: string[] }> = [];

  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isInline || !canApplyMarkToInlineNode(tr.doc, markType, pos)) {
      return true;
    }

    const segmentFrom = Math.max(from, pos);
    const segmentTo = Math.min(to, pos + node.nodeSize);

    if (segmentFrom >= segmentTo) {
      return !node.isLeaf;
    }

    const currentThreadIds = getThreadIdsFromMark(markType.isInSet(node.marks));
    const nextThreadIds = normalizeThreadIds(
      transform(currentThreadIds, {
        from: segmentFrom,
        to: segmentTo,
        node,
        pos,
      }),
    );

    if (!areThreadIdsEqual(currentThreadIds, nextThreadIds)) {
      updates.push({
        from: segmentFrom,
        to: segmentTo,
        threadIds: nextThreadIds,
      });
    }

    return !node.isLeaf;
  });

  updates.forEach((update) => {
    tr.removeMark(update.from, update.to, markType);

    if (update.threadIds.length) {
      tr.addMark(
        update.from,
        update.to,
        markType.create({ threadIds: update.threadIds }),
      );
    }
  });

  return updates.length;
}

export function refreshCommentsStorage(
  storage: CommentsStorage,
  options?: GetThreadsOptions,
) {
  storage.threads = storage.provider?.getThreads(options) ?? [];
}

export function syncThreadReferences(options: {
  provider: CommentsProvider;
  threads: CommentsThread[];
  referencedThreadIds: Set<string>;
  deleteUnreferencedThreads: boolean;
  ignoredThreadIds?: Set<string>;
}) {
  const ignoredThreadIds = options.ignoredThreadIds ?? new Set<string>();

  options.threads.forEach((thread) => {
    if (ignoredThreadIds.has(thread.id)) {
      return;
    }

    const isReferenced = options.referencedThreadIds.has(thread.id);

    if (isReferenced && thread.archived) {
      options.provider.setThread({
        ...thread,
        archived: false,
      });
      return;
    }

    if (!isReferenced && !thread.archived) {
      if (options.deleteUnreferencedThreads) {
        options.provider.deleteThread(thread.id);
        return;
      }

      options.provider.setThread({
        ...thread,
        archived: true,
      });
    }
  });
}

export function resolveThreadClasses(options: {
  threadIds: string[];
  threads: CommentsThread[];
  selectedThreadId: string | null;
  hoveredThreadId: string | null;
  classes: {
    thread: string;
    threadInline: string;
    threadSelected: string;
    threadHovered: string;
    threadResolved: string;
    threadUnresolved: string;
  };
}) {
  const matchedThreads = options.threads.filter((thread) =>
    options.threadIds.includes(thread.id),
  );
  const classNames = [
    options.classes.thread,
    options.classes.threadInline,
  ];

  if (
    options.selectedThreadId
    && options.threadIds.includes(options.selectedThreadId)
  ) {
    classNames.push(options.classes.threadSelected);
  }

  if (
    options.hoveredThreadId
    && options.threadIds.includes(options.hoveredThreadId)
  ) {
    classNames.push(options.classes.threadHovered);
  }

  if (matchedThreads.length) {
    const hasUnresolvedThread = matchedThreads.some((thread) => !thread.resolved);

    classNames.push(
      hasUnresolvedThread
        ? options.classes.threadUnresolved
        : options.classes.threadResolved,
    );
  }

  return classNames.join(" ");
}

export function findThreadsInDocument(
  editor: Editor,
  options: FindThreadsOptions = {},
) {
  const foundThreads: FoundThread[] = [];
  const markType = editor.schema.marks[options.markTypeName ?? "inlineThread"];
  const blockType = editor.schema.nodes[options.blockTypeName ?? "blockThread"];

  if (markType) {
    collectInlineThreadSegments(editor.state.doc, markType).forEach((segment) => {
      segment.threadIds.forEach((threadId) => {
        foundThreads.push({
          id: threadId,
          type: "mark",
          pos: segment.pos,
          from: segment.from,
          to: segment.to,
          node: segment.node,
          mark: segment.mark,
        });
      });
    });
  }

  if (blockType) {
    editor.state.doc.descendants((node, pos) => {
      if (node.type !== blockType) {
        return true;
      }

      const threadId =
        typeof node.attrs.id === "string"
          ? node.attrs.id
          : typeof node.attrs.threadId === "string"
            ? node.attrs.threadId
            : null;

      if (!threadId) {
        return true;
      }

      foundThreads.push({
        id: threadId,
        type: "node",
        pos,
        node,
      });

      return true;
    });
  }

  return foundThreads;
}

export function findFirstThreadOccurrence(
  editor: Editor,
  threadId: string,
  options: FindThreadsOptions = {},
) {
  return findThreadsInDocument(editor, options).find(
    (thread) => thread.id === threadId,
  );
}

export function resolveThreadIdFromSelection(options: {
  state: EditorState;
  markType: MarkType;
  selectedThreadId?: string | null;
}) {
  return chooseThreadId(
    getThreadIdsAtSelection(options.state, options.markType),
    options.selectedThreadId,
  );
}

export function updateSelectionForThread(options: {
  tr: Transaction;
  target: FoundThread;
  selectThreadOptions: SelectThreadOptions;
}) {
  if (options.selectThreadOptions.updateSelection === false) {
    return;
  }

  if (options.target.type === "node") {
    options.tr.setSelection(
      NodeSelection.create(options.tr.doc, options.target.pos),
    );
    return;
  }

  if (typeof options.target.from !== "number" || typeof options.target.to !== "number") {
    return;
  }

  if (options.selectThreadOptions.selectAround) {
    options.tr.setSelection(
      TextSelection.create(
        options.tr.doc,
        options.target.from,
        options.target.to,
      ),
    );
    return;
  }

  options.tr.setSelection(
    TextSelection.create(options.tr.doc, options.target.from, options.target.from),
  );
}
