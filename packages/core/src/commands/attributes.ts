import {
  NodeSelection,
  TextSelection,
  type MarkType,
  type NodeType,
  type Transaction,
} from "@mxm-editor/pm";
import type { Editor } from "../Editor";
import type {
  Range,
  RawCommands,
} from "../types";
import { getMarkRange } from "../helpers";
import { clamp } from "../utilities";

function normalizeAttributeNames(attributes: string | string[]) {
  return Array.isArray(attributes) ? attributes : [attributes];
}

function getDefaultAttributes(
  type: MarkType | NodeType,
  attributes: string | string[],
) {
  const names = normalizeAttributeNames(attributes);
  const nextAttributes: Record<string, any> = {};

  names.forEach((name) => {
    const spec = type.spec.attrs?.[name];

    if (spec && "default" in spec) {
      nextAttributes[name] = spec.default;
    }
  });

  return nextAttributes;
}

function mergeResetAttributes(
  attrs: Record<string, any>,
  defaults: Record<string, any>,
  attributes: string | string[],
) {
  const names = normalizeAttributeNames(attributes);
  const nextAttrs = {
    ...attrs,
  };

  names.forEach((name) => {
    if (name in defaults) {
      nextAttrs[name] = defaults[name];
      return;
    }

    delete nextAttrs[name];
  });

  return nextAttrs;
}

function updateMarkAttributes(
  editor: Editor,
  transaction: Transaction,
  markType: MarkType,
  attributes: Record<string, any>,
) {
  const { selection } = transaction;

  if (selection.empty) {
    transaction.addStoredMark(
      markType.create({
        ...editor.getAttributes(markType.name),
        ...attributes,
      }),
    );

    return true;
  }

  const ranges: Array<{ from: number; to: number; attrs: Record<string, any> }> = [];

  transaction.doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (!node.isText) {
      return true;
    }

    const mark = markType.isInSet(node.marks);

    if (!mark) {
      return true;
    }

    ranges.push({
      from: position,
      to: position + node.nodeSize,
      attrs: {
        ...mark.attrs,
        ...attributes,
      },
    });

    return true;
  });

  if (!ranges.length) {
    return false;
  }

  ranges.forEach((range) => {
    transaction.removeMark(range.from, range.to, markType);
    transaction.addMark(range.from, range.to, markType.create(range.attrs));
  });

  return true;
}

function updateNodeAttributes(
  transaction: Transaction,
  nodeType: NodeType,
  attributes: Record<string, any>,
) {
  const { selection } = transaction;
  const positions = new Set<number>();

  if (
    selection instanceof NodeSelection
    && selection.node.type === nodeType
  ) {
    positions.add(selection.from);
  }

  transaction.doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (node.type === nodeType) {
      positions.add(position);
    }

    return true;
  });

  if (!positions.size) {
    for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
      const node = selection.$from.node(depth);

      if (node.type !== nodeType) {
        continue;
      }

      positions.add(selection.$from.before(depth));
      break;
    }
  }

  if (!positions.size) {
    return false;
  }

  positions.forEach((position) => {
    const node = transaction.doc.nodeAt(position);

    if (!node) {
      return;
    }

    transaction.setNodeMarkup(position, undefined, {
      ...node.attrs,
      ...attributes,
    });
  });

  return true;
}

function resetMarkAttributes(
  editor: Editor,
  transaction: Transaction,
  markType: MarkType,
  attributes: string | string[],
) {
  const { selection, storedMarks } = transaction;
  const defaults = getDefaultAttributes(markType, attributes);

  if (selection.empty) {
    const range = getMarkRange(selection.$from, markType);

    if (range) {
      let reset = false;

      transaction.doc.nodesBetween(range.from, range.to, (node, position) => {
        if (!node.isText) {
          return true;
        }

        const mark = markType.isInSet(node.marks);

        if (!mark) {
          return true;
        }

        reset = true;
        transaction.removeMark(position, position + node.nodeSize, markType);
        transaction.addMark(
          position,
          position + node.nodeSize,
          markType.create(mergeResetAttributes(mark.attrs, defaults, attributes)),
        );

        return true;
      });

      if (reset) {
        transaction.setSelection(
          TextSelection.create(transaction.doc, selection.from, selection.to),
        );
      }

      return reset;
    }

    const activeMark = markType.isInSet(storedMarks ?? selection.$from.marks());

    if (!activeMark) {
      return false;
    }

    transaction.removeStoredMark(markType);
    transaction.addStoredMark(
      markType.create(mergeResetAttributes(activeMark.attrs, defaults, attributes)),
    );

    return true;
  }

  let reset = false;

  transaction.doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (!node.isText) {
      return true;
    }

    const mark = markType.isInSet(node.marks);

    if (!mark) {
      return true;
    }

    reset = true;
    transaction.removeMark(position, position + node.nodeSize, markType);
    transaction.addMark(
      position,
      position + node.nodeSize,
      markType.create(mergeResetAttributes(mark.attrs, defaults, attributes)),
    );

    return true;
  });

  return reset;
}

function resetNodeAttributes(
  transaction: Transaction,
  nodeType: NodeType,
  attributes: string | string[],
) {
  const { selection } = transaction;
  const defaults = getDefaultAttributes(nodeType, attributes);
  const positions = new Set<number>();

  if (selection instanceof NodeSelection && selection.node.type === nodeType) {
    positions.add(selection.from);
  }

  transaction.doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (node.type === nodeType) {
      positions.add(position);
    }

    return true;
  });

  if (!positions.size) {
    for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
      const node = selection.$from.node(depth);

      if (node.type !== nodeType) {
        continue;
      }

      positions.add(selection.$from.before(depth));
      break;
    }
  }

  if (!positions.size) {
    return false;
  }

  positions.forEach((position) => {
    const node = transaction.doc.nodeAt(position);

    if (!node) {
      return;
    }

    transaction.setNodeMarkup(
      position,
      undefined,
      mergeResetAttributes(node.attrs, defaults, attributes),
    );
  });

  return true;
}

function resolveRange(
  transaction: Transaction,
  position?: number | Range,
) {
  if (typeof position === "number") {
    const nextPosition = clamp(position, 0, transaction.doc.content.size);

    return {
      from: nextPosition,
      to: nextPosition,
    };
  }

  if (position) {
    const from = clamp(position.from, 0, transaction.doc.content.size);
    const to = clamp(position.to, from, transaction.doc.content.size);

    return {
      from,
      to,
    };
  }

  return {
    from: transaction.selection.from,
    to: transaction.selection.to,
  };
}

type AttributeCommands = Pick<
  RawCommands,
  | "updateAttributes"
  | "resetAttributes"
  | "setTextDirection"
  | "unsetTextDirection"
>;

export function createAttributeCommands(editor: Editor): AttributeCommands {
  return {
    updateAttributes:
      (name: string, attributes: Record<string, any> = {}) =>
      ({ state, tr }) => {
        const markType = state.schema.marks[name];

        if (markType) {
          return updateMarkAttributes(editor, tr, markType, attributes);
        }

        const nodeType = state.schema.nodes[name];

        if (nodeType) {
          return updateNodeAttributes(tr, nodeType, attributes);
        }

        return false;
      },
    resetAttributes:
      (
        nameOrType: string | NodeType | MarkType,
        attributes: string | string[],
      ) =>
      ({ state, tr }) => {
        const markType = typeof nameOrType === "string"
          ? state.schema.marks[nameOrType] ?? null
          : state.schema.marks[nameOrType.name] === nameOrType
            ? nameOrType
            : null;

        if (markType) {
          return resetMarkAttributes(editor, tr, markType, attributes);
        }

        const nodeType = typeof nameOrType === "string"
          ? state.schema.nodes[nameOrType] ?? null
          : state.schema.nodes[nameOrType.name] === nameOrType
            ? nameOrType
            : null;

        if (nodeType) {
          return resetNodeAttributes(tr, nodeType, attributes);
        }

        return false;
      },
    setTextDirection:
      (
        direction: "ltr" | "rtl" | "auto",
        position?: number | Range,
      ) =>
      ({ tr, dispatch }) => {
        const range = resolveRange(tr, position);

        if (!dispatch) {
          return true;
        }

        tr.doc.nodesBetween(range.from, range.to, (node, pos) => {
          if (node.isText || !node.type.spec.attrs?.dir) {
            return true;
          }

          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            dir: direction,
          });

          return true;
        });

        return true;
      },
    unsetTextDirection:
      (position?: number | Range) =>
      ({ tr, dispatch }) => {
        const range = resolveRange(tr, position);

        if (!dispatch) {
          return true;
        }

        tr.doc.nodesBetween(range.from, range.to, (node, pos) => {
          if (node.isText || !node.type.spec.attrs?.dir) {
            return true;
          }

          const nextAttributes = {
            ...node.attrs,
          };

          delete nextAttributes.dir;
          tr.setNodeMarkup(pos, undefined, nextAttributes);

          return true;
        });

        return true;
      },
  };
}
