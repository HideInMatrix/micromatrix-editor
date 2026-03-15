import type { Editor } from "@mxm-editor/core";
import type { EditorState } from "@mxm-editor/pm";

export interface MenuVisibilityContext {
  editor: Editor;
  view: Editor["view"];
  state: Editor["state"];
  oldState: EditorState | null;
  from: number;
  to: number;
}

export type MenuVisibilityContextWithEditor =
  MenuVisibilityContext & Editor;

export function createMenuVisibilityContext(
  editor: Editor,
  oldState: EditorState | null = null,
): MenuVisibilityContextWithEditor {
  const state = editor.state;

  return Object.assign(Object.create(editor), {
    editor,
    oldState,
    from: state.selection.from,
    to: state.selection.to,
  });
}
