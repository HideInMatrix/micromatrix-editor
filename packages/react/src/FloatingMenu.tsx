import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@mxm-editor/core";
import { createPortal } from "react-dom";
import {
  createMenuVisibilityContext,
  type MenuVisibilityContextWithEditor,
} from "./menuContext";

export interface FloatingMenuOptions {
  offset?: number;
}

export interface FloatingMenuProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  editor: Editor | null;
  children: ReactNode;
  offset?: number;
  options?: FloatingMenuOptions;
  shouldShow?: (props: MenuVisibilityContextWithEditor) => boolean;
  onShow?: (props: MenuVisibilityContextWithEditor) => void;
  onHide?: (props: MenuVisibilityContextWithEditor) => void;
}

interface FloatingPosition {
  left: number;
  top: number;
  visible: boolean;
}

function getCursorRect(editor: Editor) {
  const view = editor.view;

  if (!view) {
    return null;
  }

  const { selection } = view.state;

  if (!selection.empty) {
    return null;
  }

  const start = view.coordsAtPos(selection.from);

  return new DOMRect(
    (start.left + start.right) / 2,
    start.top,
    Math.max(start.right - start.left, 1),
    Math.max(start.bottom - start.top, 1),
  );
}

export function FloatingMenu({
  editor,
  children,
  offset = 12,
  options,
  shouldShow,
  onShow,
  onHide,
  style,
  ...props
}: FloatingMenuProps) {
  const previousVisibleRef = useRef(false);
  const lastStateRef = useRef(editor?.state ?? null);
  const [position, setPosition] = useState<FloatingPosition>({
    left: 0,
    top: 0,
    visible: false,
  });
  const resolvedOffset = options?.offset ?? offset;

  useEffect(() => {
    if (!editor?.view || typeof document === "undefined") {
      return;
    }

    lastStateRef.current = editor.state;

    const update = (oldState = lastStateRef.current) => {
      if (!editor.view) {
        setPosition((current) =>
          current.visible
            ? { left: 0, top: 0, visible: false }
            : current,
        );
        return;
      }

      const context = createMenuVisibilityContext(editor, oldState);

      if (!editor.view.hasFocus() || !editor.state.selection.empty) {
        setPosition((current) =>
          current.visible
            ? { left: 0, top: 0, visible: false }
            : current,
        );
        return;
      }

      if (shouldShow && !shouldShow(context)) {
        setPosition((current) =>
          current.visible
            ? { left: 0, top: 0, visible: false }
            : current,
        );
        return;
      }

      const rect = getCursorRect(editor);

      if (!rect) {
        setPosition((current) =>
          current.visible
            ? { left: 0, top: 0, visible: false }
            : current,
        );
        return;
      }

      setPosition({
        left: rect.left + rect.width / 2,
        top: rect.top - resolvedOffset,
        visible: true,
      });
    };

    update();

    const handleEditorUpdate = () => {
      const previousState = lastStateRef.current;

      update(previousState);
      lastStateRef.current = editor.state;
    };
    const removeSelectionUpdate = editor.on("selectionUpdate", handleEditorUpdate);
    const removeUpdate = editor.on("update", handleEditorUpdate);
    const onScroll = () => update();
    const onResize = () => update();
    const onFocus = () => update();
    const onBlur = () => {
      requestAnimationFrame(() => update());
    };

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("selectionchange", onSelectionChange);
    editor.view.dom.addEventListener("focus", onFocus, true);
    editor.view.dom.addEventListener("blur", onBlur, true);

    function onSelectionChange() {
      requestAnimationFrame(() => update());
    }

    return () => {
      removeSelectionUpdate();
      removeUpdate();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("selectionchange", onSelectionChange);
      editor.view?.dom.removeEventListener("focus", onFocus, true);
      editor.view?.dom.removeEventListener("blur", onBlur, true);
    };
  }, [editor, resolvedOffset, shouldShow]);

  useEffect(() => {
    if (!editor || position.visible === previousVisibleRef.current) {
      return;
    }

    previousVisibleRef.current = position.visible;
    const context = createMenuVisibilityContext(editor, lastStateRef.current);

    if (position.visible) {
      onShow?.(context);
      return;
    }

    onHide?.(context);
  }, [editor, onHide, onShow, position.visible]);

  if (!editor?.view || typeof document === "undefined" || !position.visible) {
    return null;
  }

  return createPortal(
    <div
      {...props}
      style={{
        position: "fixed",
        left: position.left,
        top: position.top,
        transform: "translate(-50%, -100%)",
        ...style,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
