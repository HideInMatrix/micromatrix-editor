import {
  TextSelection,
  toggleMark as toggleMarkCommand,
  type MarkType,
} from "@mxm-editor/pm";
import type {
  RawCommands,
} from "../types";
import type { Editor } from "../Editor";
import { getMarkRange, getMarkType } from "../helpers";

function resolveMarkType(nameOrType: string | MarkType, editor: Editor) {
  try {
    return getMarkType(nameOrType, editor.schema);
  } catch {
    return null;
  }
}

type MarkCommands = Pick<
  RawCommands,
  "setMark" | "toggleMark" | "unsetMark" | "unsetAllMarks" | "extendMarkRange"
>;

export function createMarkCommands(editor: Editor): MarkCommands {
  return {
    setMark:
      (name: string, attributes: Record<string, any> = {}) =>
      ({ state, dispatch }) => {
        const markType = resolveMarkType(name, editor);

        if (!markType) {
          return false;
        }

        const nextAttributes = {
          ...editor.getAttributes(name),
          ...attributes,
        };
        const { empty, from, to } = state.selection;

        if (!dispatch) {
          return true;
        }

        if (empty) {
          dispatch(state.tr.addStoredMark(markType.create(nextAttributes)));
          return true;
        }

        dispatch(state.tr.addMark(from, to, markType.create(nextAttributes)));
        return true;
      },
    toggleMark:
      (name: string, attributes: Record<string, any> = {}) =>
      ({ state, dispatch }) => {
        const markType = resolveMarkType(name, editor);

        if (!markType) {
          return false;
        }

        return toggleMarkCommand(markType, attributes)(state, dispatch);
      },
    unsetMark:
      (name: string) =>
      ({ state, dispatch }) => {
        const markType = resolveMarkType(name, editor);

        if (!markType) {
          return false;
        }

        const { empty, from, to } = state.selection;

        if (!dispatch) {
          return true;
        }

        if (empty) {
          dispatch(state.tr.removeStoredMark(markType));
          return true;
        }

        dispatch(state.tr.removeMark(from, to, markType));
        return true;
      },
    unsetAllMarks:
      () =>
      ({ state, dispatch }) => {
        const markTypes = Object.values(state.schema.marks);

        if (!markTypes.length) {
          return true;
        }

        if (!dispatch) {
          return true;
        }

        const { empty, from, to } = state.selection;
        const transaction = state.tr;

        markTypes.forEach((markType) => {
          if (empty) {
            transaction.removeStoredMark(markType);
            return;
          }

          transaction.removeMark(from, to, markType);
        });

        dispatch(transaction);
        return true;
      },
    extendMarkRange:
      (nameOrType: string | MarkType, attributes = {}) =>
      ({ tr, state, dispatch }) => {
        const markType = resolveMarkType(nameOrType, editor);

        if (!markType) {
          return false;
        }

        if (!dispatch) {
          return true;
        }

        const range = getMarkRange(tr.selection.$from, markType, attributes);

        if (
          range
          && range.from <= tr.selection.from
          && range.to >= tr.selection.to
        ) {
          tr.setSelection(TextSelection.create(tr.doc, range.from, range.to));
        }

        return true;
      },
  };
}
