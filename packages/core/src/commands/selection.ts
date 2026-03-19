import {
  AllSelection,
  NodeSelection,
  Selection,
  TextSelection,
  createParagraphNear as createParagraphNearCommand,
  joinBackward as joinBackwardCommand,
  joinDown as joinDownCommand,
  joinForward as joinForwardCommand,
  joinPoint,
  joinTextblockBackward as joinTextblockBackwardCommand,
  joinTextblockForward as joinTextblockForwardCommand,
  joinUp as joinUpCommand,
  selectNodeBackward as selectNodeBackwardCommand,
  selectNodeForward as selectNodeForwardCommand,
  selectParentNode as selectParentNodeCommand,
  selectTextblockEnd as selectTextblockEndCommand,
  selectTextblockStart as selectTextblockStartCommand,
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
  | "selectParentNode"
  | "deleteSelection"
  | "deleteRange"
  | "createParagraphNear"
  | "scrollIntoView"
  | "joinUp"
  | "joinDown"
  | "joinBackward"
  | "joinForward"
  | "joinTextblockBackward"
  | "joinTextblockForward"
  | "joinItemBackward"
  | "joinItemForward"
  | "selectNodeBackward"
  | "selectNodeForward"
  | "selectTextblockStart"
  | "selectTextblockEnd"
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
    selectParentNode:
      () =>
      ({ state, dispatch }) =>
        selectParentNodeCommand(state, dispatch),
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
    createParagraphNear:
      () =>
      ({ state, dispatch }) =>
        createParagraphNearCommand(state, dispatch),
    joinUp:
      () =>
      ({ state, dispatch, view }) =>
        joinUpCommand(state, dispatch, view ?? undefined),
    joinDown:
      () =>
      ({ state, dispatch, view }) =>
        joinDownCommand(state, dispatch, view ?? undefined),
    joinBackward:
      () =>
      ({ state, dispatch, view }) =>
        joinBackwardCommand(state, dispatch, view ?? undefined),
    joinForward:
      () =>
      ({ state, dispatch, view }) =>
        joinForwardCommand(state, dispatch, view ?? undefined),
    joinTextblockBackward:
      () =>
      ({ state, dispatch, view }) =>
        joinTextblockBackwardCommand(state, dispatch, view ?? undefined),
    joinTextblockForward:
      () =>
      ({ state, dispatch, view }) =>
        joinTextblockForwardCommand(state, dispatch, view ?? undefined),
    joinItemBackward:
      () =>
      ({ state, tr, dispatch }) => {
        try {
          const point = joinPoint(state.doc, state.selection.$from.pos, -1);

          if (point === null || point === undefined) {
            return false;
          }

          if (dispatch) {
            tr.join(point, 2);
          }

          return true;
        } catch {
          return false;
        }
      },
    joinItemForward:
      () =>
      ({ state, tr, dispatch }) => {
        try {
          const point = joinPoint(state.doc, state.selection.$from.pos, 1);

          if (point === null || point === undefined) {
            return false;
          }

          if (dispatch) {
            tr.join(point, 2);
          }

          return true;
        } catch {
          return false;
        }
      },
    selectNodeBackward:
      () =>
      ({ state, dispatch, view }) =>
        selectNodeBackwardCommand(state, dispatch, view ?? undefined),
    selectNodeForward:
      () =>
      ({ state, dispatch, view }) =>
        selectNodeForwardCommand(state, dispatch, view ?? undefined),
    selectTextblockStart:
      () =>
      ({ state, dispatch, view }) =>
        selectTextblockStartCommand(state, dispatch, view ?? undefined),
    selectTextblockEnd:
      () =>
      ({ state, dispatch, view }) =>
        selectTextblockEndCommand(state, dispatch, view ?? undefined),
  };
}
