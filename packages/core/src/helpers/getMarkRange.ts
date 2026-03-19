import type {
  Mark as ProseMirrorMark,
  MarkType,
  ResolvedPos,
} from "@mxm-editor/pm";
import { matchesAttributes } from "../utilities";

function findMatchingMark(
  marks: readonly ProseMirrorMark[],
  type: MarkType,
  attributes: Record<string, any>,
) {
  return marks.find((mark) =>
    mark.type === type
    && matchesAttributes(mark.attrs, attributes),
  );
}

function hasMatchingMark(
  marks: readonly ProseMirrorMark[],
  type: MarkType,
  attributes: Record<string, any>,
) {
  return Boolean(findMatchingMark(marks, type, attributes));
}

export function getMarkRange(
  $pos: ResolvedPos,
  type: MarkType,
  attributes?: Record<string, any>,
) {
  if (!$pos || !type) {
    return undefined;
  }

  let start = $pos.parent.childAfter($pos.parentOffset);

  if (!start.node || !start.node.marks.some((mark) => mark.type === type)) {
    start = $pos.parent.childBefore($pos.parentOffset);
  }

  if (!start.node || !start.node.marks.some((mark) => mark.type === type)) {
    return undefined;
  }

  const attrs = attributes ?? start.node.marks.find((mark) => mark.type === type)?.attrs ?? {};
  const mark = findMatchingMark(start.node.marks, type, attrs);

  if (!mark) {
    return undefined;
  }

  let startIndex = start.index;
  let startPos = $pos.start() + start.offset;
  let endIndex = startIndex + 1;
  let endPos = startPos + start.node.nodeSize;

  while (
    startIndex > 0
    && hasMatchingMark($pos.parent.child(startIndex - 1).marks, type, attrs)
  ) {
    startIndex -= 1;
    startPos -= $pos.parent.child(startIndex).nodeSize;
  }

  while (
    endIndex < $pos.parent.childCount
    && hasMatchingMark($pos.parent.child(endIndex).marks, type, attrs)
  ) {
    endPos += $pos.parent.child(endIndex).nodeSize;
    endIndex += 1;
  }

  return {
    from: startPos,
    to: endPos,
  };
}
