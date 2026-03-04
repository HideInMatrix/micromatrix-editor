import type { WritingStudioEditorRef } from "./useWritingStudioActionTypes";
import { useWritingStudioBlockActions } from "./useWritingStudioBlockActions";
import { useWritingStudioListActions } from "./useWritingStudioListActions";
import { useWritingStudioOtherActions } from "./useWritingStudioOtherActions";

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
