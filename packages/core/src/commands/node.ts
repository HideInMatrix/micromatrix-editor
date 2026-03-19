import {
  canJoin,
  lift as liftCommand,
  liftListItem as liftListItemCommand,
  liftTarget,
  sinkListItem as sinkListItemCommand,
  splitListItem as splitListItemCommand,
  setBlockType,
  splitBlock as splitBlockCommand,
  type Transaction,
  type NodeType,
  wrapInList as wrapInListCommand,
  wrapIn as wrapInCommand,
} from "@mxm-editor/pm";
import type { Editor } from "../Editor";
import type { RawCommands } from "../types";
import {
  findParentNode,
  getNodeType,
  isList,
} from "../helpers";

function resolveNodeType(
  nameOrType: string | NodeType,
  editor: Editor,
) {
  try {
    return getNodeType(nameOrType, editor.schema);
  } catch {
    return null;
  }
}

function joinListBackwards(
  transaction: Transaction,
  listType: NodeType,
) {
  const list = findParentNode((node) => node.type === listType)(transaction.selection);

  if (!list) {
    return true;
  }

  const before = transaction.doc.resolve(Math.max(0, list.pos - 1)).before(list.depth);

  if (before === undefined) {
    return true;
  }

  const nodeBefore = transaction.doc.nodeAt(before);
  const canJoinBackwards = list.node.type === nodeBefore?.type
    && canJoin(transaction.doc, list.pos);

  if (!canJoinBackwards) {
    return true;
  }

  transaction.join(list.pos);

  return true;
}

function joinListForwards(
  transaction: Transaction,
  listType: NodeType,
) {
  const list = findParentNode((node) => node.type === listType)(transaction.selection);

  if (!list) {
    return true;
  }

  const after = transaction.doc.resolve(list.start).after(list.depth);

  if (after === undefined) {
    return true;
  }

  const nodeAfter = transaction.doc.nodeAt(after);
  const canJoinForwards = list.node.type === nodeAfter?.type
    && canJoin(transaction.doc, after);

  if (!canJoinForwards) {
    return true;
  }

  transaction.join(after);

  return true;
}

type NodeCommands = Pick<
  RawCommands,
  | "deleteNode"
  | "clearNodes"
  | "wrapInList"
  | "toggleList"
  | "liftListItem"
  | "sinkListItem"
  | "splitListItem"
  | "setNode"
  | "toggleNode"
  | "wrapIn"
  | "toggleWrap"
  | "lift"
  | "splitBlock"
>;

export function createNodeCommands(editor: Editor): NodeCommands {
  return {
    deleteNode:
      (nameOrType: string | NodeType) =>
      ({ tr, dispatch }) => {
        const nodeType = resolveNodeType(nameOrType, editor);

        if (!nodeType) {
          return false;
        }

        const $position = tr.selection.$anchor;

        for (let depth = $position.depth; depth > 0; depth -= 1) {
          const node = $position.node(depth);

          if (node.type !== nodeType) {
            continue;
          }

          if (dispatch) {
            const from = $position.before(depth);
            const to = $position.after(depth);

            tr.delete(from, to).scrollIntoView();
          }

          return true;
        }

        return false;
      },
    clearNodes:
      () =>
      ({ state, tr, dispatch }) => {
        if (!dispatch) {
          return true;
        }

        tr.selection.ranges.forEach(({ $from, $to }) => {
          state.doc.nodesBetween($from.pos, $to.pos, (node, position) => {
            if (node.isText) {
              return;
            }

            const { doc, mapping } = tr;
            const $mappedFrom = doc.resolve(mapping.map(position));
            const $mappedTo = doc.resolve(mapping.map(position + node.nodeSize));
            const nodeRange = $mappedFrom.blockRange($mappedTo);

            if (!nodeRange) {
              return;
            }

            const targetLiftDepth = liftTarget(nodeRange);

            if (node.isTextblock) {
              const defaultType =
                $mappedFrom.parent.contentMatchAt($mappedFrom.index()).defaultType;

              if (defaultType) {
                tr.setNodeMarkup(nodeRange.start, defaultType);
              }
            }

            if (targetLiftDepth !== null) {
              tr.lift(nodeRange, targetLiftDepth);
            }
          });
        });

        return true;
      },
    wrapInList:
      (
        nameOrType: string | NodeType,
        attributes: Record<string, any> = {},
      ) =>
      ({ state, dispatch }) => {
        const nodeType = resolveNodeType(nameOrType, editor);

        if (!nodeType) {
          return false;
        }

        return wrapInListCommand(nodeType, attributes)(state, dispatch);
      },
    toggleList:
      (
        listTypeOrName: string | NodeType,
        itemTypeOrName: string | NodeType,
        keepMarks = false,
        attributes: Record<string, any> = {},
      ) =>
      ({ state, tr, dispatch, commands }) => {
        const listType = resolveNodeType(listTypeOrName, editor);
        const itemType = resolveNodeType(itemTypeOrName, editor);

        if (!listType || !itemType) {
          return false;
        }

        const { selection, storedMarks } = state;
        const { $from, $to } = selection;
        const range = $from.blockRange($to);
        const marks = storedMarks ?? ($to.parentOffset ? $from.marks() : []);
        const splittableMarks = keepMarks
          ? marks.filter((mark) =>
            editor.extensionManager.splittableMarks.includes(mark.type.name),
          )
          : [];

        if (!range) {
          return false;
        }

        const parentList = findParentNode((node) => isList(node.type))(selection);

        if (
          range.depth >= 1
          && parentList
          && range.depth - parentList.depth <= 1
        ) {
          if (parentList.node.type === listType) {
            return commands.liftListItem(itemType);
          }

          if (
            isList(parentList.node.type)
            && listType.validContent(parentList.node.content)
          ) {
            if (!dispatch) {
              return true;
            }

            tr.setNodeMarkup(parentList.pos, listType, attributes);
            joinListBackwards(tr, listType);
            joinListForwards(tr, listType);

            return true;
          }
        }

        if (keepMarks && splittableMarks.length && dispatch) {
          tr.ensureMarks(splittableMarks);
        }

        if (!commands.clearNodes()) {
          return false;
        }

        if (!commands.wrapInList(listType, attributes)) {
          return false;
        }

        joinListBackwards(tr, listType);
        joinListForwards(tr, listType);

        if (keepMarks && splittableMarks.length && dispatch) {
          tr.ensureMarks(splittableMarks);
        }

        return true;
      },
    liftListItem:
      (nameOrType: string | NodeType) =>
      ({ state, dispatch }) => {
        const nodeType = resolveNodeType(nameOrType, editor);

        if (!nodeType) {
          return false;
        }

        return liftListItemCommand(nodeType)(state, dispatch);
      },
    sinkListItem:
      (nameOrType: string | NodeType) =>
      ({ state, dispatch }) => {
        const nodeType = resolveNodeType(nameOrType, editor);

        if (!nodeType) {
          return false;
        }

        return sinkListItemCommand(nodeType)(state, dispatch);
      },
    splitListItem:
      (nameOrType: string | NodeType) =>
      ({ state, dispatch }) => {
        const nodeType = resolveNodeType(nameOrType, editor);

        if (!nodeType) {
          return false;
        }

        return splitListItemCommand(nodeType)(state, dispatch);
      },
    setNode:
      (name: string, attributes: Record<string, any> = {}) =>
      ({ state, dispatch }) => {
        const nodeType = resolveNodeType(name, editor);

        if (!nodeType || !nodeType.isTextblock) {
          return false;
        }

        return setBlockType(nodeType, attributes)(state, dispatch);
      },
    toggleNode:
      (
        name: string,
        fallbackName: string,
        attributes: Record<string, any> = {},
      ) =>
      ({ commands }) =>
        (
          editor.isActive(name)
            ? commands.setNode(fallbackName)
            : commands.setNode(name, attributes)
        ),
    wrapIn:
      (name: string, attributes: Record<string, any> = {}) =>
      ({ state, dispatch }) => {
        const nodeType = resolveNodeType(name, editor);

        if (!nodeType) {
          return false;
        }

        return wrapInCommand(nodeType, attributes)(state, dispatch);
      },
    toggleWrap:
      (name: string, attributes: Record<string, any> = {}) =>
      ({ state, dispatch }) => {
        const nodeType = resolveNodeType(name, editor);

        if (!nodeType) {
          return false;
        }

        if (editor.isActive(name)) {
          return liftCommand(state, dispatch);
        }

        return wrapInCommand(nodeType, attributes)(state, dispatch);
      },
    lift:
      (name?: string) =>
      ({ state, dispatch }) => {
        if (name && !editor.isActive(name)) {
          return false;
        }

        return liftCommand(state, dispatch);
      },
    splitBlock:
      () =>
      ({ state, dispatch }) =>
        splitBlockCommand(state, dispatch),
  };
}
