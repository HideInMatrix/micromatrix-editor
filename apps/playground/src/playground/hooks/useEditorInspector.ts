import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import type { Editor } from "@mxm-editor/core";
import { markdownManager } from "../extensions";

interface InspectorSnapshot {
  html: string;
  markdown: string;
}

const emptySnapshot: InspectorSnapshot = {
  html: "",
  markdown: "",
};

function serializeEditor(editor: Editor): InspectorSnapshot {
  return {
    html: editor.getHTML(),
    markdown: markdownManager.serialize(editor.state.doc),
  };
}

export function useEditorInspector(editor: Editor | null) {
  const frameRef = useRef<number | null>(null);
  const [snapshot, setSnapshot] = useState<InspectorSnapshot>(emptySnapshot);

  useEffect(() => {
    if (!editor) {
      setSnapshot(emptySnapshot);
      return;
    }

    const sync = () => {
      const commit = () => {
        frameRef.current = null;
        const nextSnapshot = serializeEditor(editor);

        startTransition(() => {
          setSnapshot((current) =>
            current.html === nextSnapshot.html
            && current.markdown === nextSnapshot.markdown
              ? current
              : nextSnapshot,
          );
        });
      };

      if (typeof window === "undefined") {
        commit();
        return;
      }

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(commit);
    };

    sync();

    const removeCreate = editor.on("create", sync);
    const removeUpdate = editor.on("update", sync);
    const removeDestroy = editor.on("destroy", () => {
      startTransition(() => {
        setSnapshot(emptySnapshot);
      });
    });

    return () => {
      removeCreate();
      removeUpdate();
      removeDestroy();

      if (frameRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [editor]);

  return {
    html: useDeferredValue(snapshot.html),
    markdown: useDeferredValue(snapshot.markdown),
  };
}
