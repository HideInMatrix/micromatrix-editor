import type { HTMLAttributes, ReactNode } from "react";
import { EditorContext } from "./EditorContext";
import { EditorContent } from "./EditorContent";
import { useEditor } from "./useEditor";
import type { EditorOptions } from "@mxm-editor/core";

export interface EditorProviderProps extends EditorOptions {
  children?: ReactNode;
  slotBefore?: ReactNode;
  slotAfter?: ReactNode;
  editorContainerProps?: Omit<HTMLAttributes<HTMLDivElement>, "content">;
}

export function EditorProvider({
  children,
  slotBefore,
  slotAfter,
  editorContainerProps,
  ...editorOptions
}: EditorProviderProps) {
  const editor = useEditor(editorOptions);

  return (
    <EditorContext.Provider value={{ editor }}>
      {slotBefore}
      <EditorContent editor={editor} {...editorContainerProps} />
      {children}
      {slotAfter}
    </EditorContext.Provider>
  );
}
