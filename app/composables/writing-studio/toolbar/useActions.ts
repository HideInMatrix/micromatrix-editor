import type { WritingStudioEditorRef } from "../types/editor";
import { useWritingStudioBlockActions } from "../actions/useBlockActions";
import { useWritingStudioListActions } from "../actions/useListActions";
import { useWritingStudioOtherActions } from "../actions/useOtherActions";

export const useWritingStudioToolbarActions = (editor: WritingStudioEditorRef) => {
  const blockActions = useWritingStudioBlockActions(editor);
  const listActions = useWritingStudioListActions(editor);
  const otherActions = useWritingStudioOtherActions(editor);

  return {
    ...blockActions,
    ...listActions,
    ...otherActions,
  };
};
