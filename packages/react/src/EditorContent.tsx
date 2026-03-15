import type { HTMLAttributes } from "react";
import {
  Fragment,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import type { Editor } from "@mxm-editor/core";
import { createPortal } from "react-dom";
import type {
  ContentComponent,
  ContentRenderer,
  EditorWithContentComponent,
} from "./nodeviews/types";

export interface EditorContentProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  editor: Editor | null;
}

function createContentComponent(): ContentComponent {
  const subscribers = new Set<() => void>();
  let renderers: Record<string, ReturnType<typeof createPortal>> = {};

  return {
    subscribe(callback) {
      subscribers.add(callback);

      return () => {
        subscribers.delete(callback);
      };
    },

    getSnapshot() {
      return renderers;
    },

    getServerSnapshot() {
      return renderers;
    },

    setRenderer(id, renderer) {
      renderers = {
        ...renderers,
        [id]: createPortal(renderer.reactElement, renderer.element, id),
      };
      subscribers.forEach((subscriber) => subscriber());
    },

    removeRenderer(id) {
      if (!(id in renderers)) {
        return;
      }

      const nextRenderers = { ...renderers };

      delete nextRenderers[id];
      renderers = nextRenderers;
      subscribers.forEach((subscriber) => subscriber());
    },
  };
}

export function EditorContent({ editor, ...props }: EditorContentProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const contentComponentRef = useRef<ContentComponent>(createContentComponent());
  const renderers = useSyncExternalStore(
    contentComponentRef.current.subscribe,
    contentComponentRef.current.getSnapshot,
    contentComponentRef.current.getServerSnapshot,
  );

  useEffect(() => {
    if (!editor || !elementRef.current) {
      return;
    }

    (editor as EditorWithContentComponent).contentComponent =
      contentComponentRef.current;
    editor.mount(elementRef.current);

    return () => {
      (editor as EditorWithContentComponent).contentComponent = null;
      editor.unmount();
    };
  }, [editor]);

  return (
    <Fragment>
      <div ref={elementRef} {...props} />
      {Object.values(renderers)}
    </Fragment>
  );
}
