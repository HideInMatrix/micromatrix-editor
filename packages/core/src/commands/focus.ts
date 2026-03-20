import {
  AllSelection,
  Selection,
} from "@mxm-editor/pm";
import type {
  FocusOptions,
  FocusPosition,
  RawCommands,
} from "../types";
import { clamp } from "../utilities";
import type { Editor } from "../Editor";

function createSelectionInTransaction(
  doc: Editor["state"]["doc"],
  position: FocusPosition,
) {
  if (position === "all") {
    return new AllSelection(doc);
  }

  if (position === "start" || position === true) {
    return Selection.atStart(doc);
  }

  if (position === "end") {
    return Selection.atEnd(doc);
  }

  if (typeof position === "number") {
    return Selection.near(
      doc.resolve(clamp(position, 0, doc.content.size)),
      1,
    );
  }

  return null;
}

export function resolveFocusSelection(
  editor: Editor,
  position: FocusPosition | undefined,
) {
  const doc = editor.state.doc;

  if (
    position === undefined
    || position === null
    || position === false
    || position === true
  ) {
    return editor.state.selection;
  }

  if (position === "all") {
    return new AllSelection(doc);
  }

  if (position === "start") {
    return Selection.atStart(doc);
  }

  if (position === "end") {
    return Selection.atEnd(doc);
  }

  return Selection.near(
    doc.resolve(clamp(position, 0, doc.content.size)),
    1,
  );
}

type FocusCommands = Pick<RawCommands, "focus" | "blur">;

export function createFocusCommands(editor: Editor): FocusCommands {
  return {
    focus:
      (position?: FocusPosition, options?: FocusOptions) =>
      ({ tr, dispatch }) => {
        const selection = createSelectionInTransaction(
          tr.doc,
          position ?? null,
        );

        if (selection) {
          tr.setSelection(selection);
        }

        if (options?.scrollIntoView !== false) {
          tr.scrollIntoView();
        }

        if (dispatch) {
          editor.view?.focus();
        }

        return true;
      },
    blur:
      () =>
      ({ view }) => {
        const run = () => {
          if (!view || editor.isDestroyed) {
            return;
          }

          (view.dom as HTMLElement).blur();

          if (typeof window !== "undefined") {
            window.getSelection()?.removeAllRanges();
          }
        };

        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(run);
        } else {
          run();
        }

        return true;
      },
  };
}
