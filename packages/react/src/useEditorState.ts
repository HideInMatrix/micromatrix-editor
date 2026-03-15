import type { Editor } from "@mxm-editor/core";
import { useCallback, useContext, useRef, useSyncExternalStore } from "react";
import { EditorContext } from "./EditorContext";

export interface UseEditorStateOptions<T> {
  editor?: Editor | null;
  selector: (context: { editor: Editor | null }) => T;
}

export function useEditorState<T>({
  editor: providedEditor,
  selector,
}: UseEditorStateOptions<T>) {
  const currentEditor = useContext(EditorContext).editor;
  const editor = providedEditor ?? currentEditor;
  const selectorRef = useRef(selector);
  const selectorVersionRef = useRef(0);
  const storeVersionRef = useRef(0);
  const cacheRef = useRef<{
    destroyed: boolean;
    editable: boolean | null;
    editor: Editor | null;
    selectorVersion: number;
    state: Editor["state"] | null;
    storeVersion: number;
    value: T;
    view: Editor["view"];
  } | null>(null);

  if (selectorRef.current !== selector) {
    selectorRef.current = selector;
    selectorVersionRef.current += 1;
  }

  const subscribe = useCallback(
    (callback: () => void) => {
      if (!editor) {
        return () => undefined;
      }

      const notify = () => {
        storeVersionRef.current += 1;
        callback();
      };
      const removeCreate = editor.on("create", notify);
      const removeUpdate = editor.on("update", notify);
      const removeSelectionUpdate = editor.on("selectionUpdate", notify);
      const removeDestroy = editor.on("destroy", notify);

      return () => {
        removeCreate();
        removeUpdate();
        removeSelectionUpdate();
        removeDestroy();
      };
    },
    [editor],
  );
  const getSnapshot = useCallback(
    () => {
      const selectorVersion = selectorVersionRef.current;
      const storeVersion = storeVersionRef.current;
      const state = editor?.state ?? null;
      const view = editor?.view ?? null;
      const editable = editor?.isEditable ?? null;
      const destroyed = editor?.isDestroyed ?? true;
      const cachedValue = cacheRef.current;

      if (
        cachedValue
        && cachedValue.editor === editor
        && cachedValue.state === state
        && cachedValue.view === view
        && cachedValue.editable === editable
        && cachedValue.destroyed === destroyed
        && cachedValue.selectorVersion === selectorVersion
        && cachedValue.storeVersion === storeVersion
      ) {
        return cachedValue.value;
      }

      const value = selectorRef.current({ editor });

      cacheRef.current = {
        destroyed,
        editable,
        editor,
        selectorVersion,
        state,
        storeVersion,
        value,
        view,
      };

      return value;
    },
    [editor],
  );

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );
}
