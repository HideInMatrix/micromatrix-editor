import {
  AllSelection,
  NodeSelection,
  Selection,
  TextSelection,
} from "@mxm-editor/pm";
import type {
  RawCommands,
  TextSelectionPosition,
} from "../types";
import { clamp } from "../utilities";

function normalizeTextSelection(position: TextSelectionPosition) {
  if (typeof position === "number") {
    return {
      from: position,
      to: position,
    };
  }

  return position;
}

type SelectionCommands = Pick<
  RawCommands,
  | "setTextSelection"
  | "setNodeSelection"
  | "selectAll"
  | "deleteSelection"
  | "deleteRange"
  | "scrollIntoView"
>;

export function createSelectionCommands(): SelectionCommands {
  return {
    setTextSelection:
      (position: TextSelectionPosition) =>
      ({ tr }) => {
        const range = normalizeTextSelection(position);
        const from = clamp(range.from, 0, tr.doc.content.size);
        const to = clamp(range.to, from, tr.doc.content.size);

        tr.setSelection(TextSelection.create(tr.doc, from, to));
        return true;
      },
    setNodeSelection:
      (position: number) =>
      ({ tr }) => {
        const resolvedPosition = clamp(position, 0, tr.doc.content.size);

        try {
          tr.setSelection(NodeSelection.create(tr.doc, resolvedPosition));
          return true;
        } catch {
          return false;
        }
      },
    selectAll:
      () =>
      ({ tr }) => {
        tr.setSelection(new AllSelection(tr.doc));
        return true;
      },
    deleteSelection:
      () =>
      ({ tr }) => {
        tr.deleteSelection();
        return true;
      },
    deleteRange:
      (range: { from: number; to: number }) =>
      ({ tr }) => {
        const from = clamp(range.from, 0, tr.doc.content.size);
        const to = clamp(range.to, from, tr.doc.content.size);

        tr.delete(from, to);
        return true;
      },
    scrollIntoView:
      () =>
      ({ tr }) => {
        tr.scrollIntoView();
        return true;
      },
  };
}
