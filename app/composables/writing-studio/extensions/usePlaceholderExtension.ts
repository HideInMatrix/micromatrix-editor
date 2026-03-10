import Placeholder from "@tiptap/extension-placeholder";

export const useWritingStudioPlaceholderExtension = () => {
  const { t } = useI18n();

  return Placeholder.configure({
    emptyEditorClass: "ws-editor-empty",
    emptyNodeClass: "ws-empty-node",
    showOnlyCurrent: true,
    includeChildren: false,
    placeholder: ({ editor, node, pos, hasAnchor }) => {
      if (!hasAnchor || node.type.name !== "paragraph") {
        return "";
      }

      const resolvedPos = editor.state.doc.resolve(pos);
      if (resolvedPos.parent.type.name !== "doc") {
        return "";
      }

      return t("writingStudio.toolbar.slash.placeholder");
    },
  });
};
