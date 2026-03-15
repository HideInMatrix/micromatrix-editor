import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";
import type { Editor } from "@mxm-editor/core";
import {
  BubbleMenuPlugin,
  bubbleMenuPluginKey,
  type BubbleMenuAppendTo,
  type BubbleMenuPluginOptions,
  type BubbleMenuVirtualElement,
} from "@mxm-editor/extension-bubble-menu";
import { PluginKey } from "@mxm-editor/pm";
import { createPortal } from "react-dom";
import type { MenuVisibilityContextWithEditor } from "./menuContext";
import { useCurrentEditor } from "./useCurrentEditor";

export interface BubbleMenuProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  editor?: Editor | null;
  children: ReactNode;
  pluginKey?: string | PluginKey;
  updateDelay?: number;
  resizeDelay?: number;
  appendTo?: BubbleMenuAppendTo;
  options?: BubbleMenuPluginOptions;
  shouldShow?: (props: MenuVisibilityContextWithEditor) => boolean;
  getReferencedVirtualElement?: () => BubbleMenuVirtualElement | null;
  onShow?: (props: MenuVisibilityContextWithEditor) => void;
  onHide?: (props: MenuVisibilityContextWithEditor) => void;
  onUpdate?: (props: MenuVisibilityContextWithEditor) => void;
  onDestroy?: (props: MenuVisibilityContextWithEditor) => void;
}

export function BubbleMenu({
  editor,
  children,
  pluginKey,
  updateDelay,
  resizeDelay,
  appendTo,
  options,
  shouldShow,
  getReferencedVirtualElement,
  onShow,
  onHide,
  onUpdate,
  onDestroy,
  ...props
}: BubbleMenuProps) {
  const currentEditor = useCurrentEditor();
  const resolvedEditor = editor ?? currentEditor.editor;
  const targetElementRef = useRef<HTMLDivElement | null>(null);
  const pluginKeyRef = useRef<PluginKey>(bubbleMenuPluginKey);
  const pluginKeySourceRef = useRef<string | PluginKey | undefined>(undefined);
  const pluginPropsRef = useRef({
    appendTo,
    editor: resolvedEditor,
    element: targetElementRef.current,
    getReferencedVirtualElement,
    onDestroy,
    onHide,
    onShow,
    onUpdate,
    options,
    pluginKey: pluginKeyRef.current,
    resizeDelay,
    shouldShow,
    updateDelay,
  });

  if (
    !targetElementRef.current
    && typeof document !== "undefined"
  ) {
    targetElementRef.current = document.createElement("div");
  }

  const resolvedPluginKey = (() => {
    const nextSource = pluginKey ?? bubbleMenuPluginKey;

    if (pluginKeySourceRef.current !== nextSource) {
      pluginKeySourceRef.current = nextSource;
      pluginKeyRef.current = typeof nextSource === "string"
        ? new PluginKey(nextSource)
        : nextSource;
    }

    return pluginKeyRef.current;
  })();

  pluginPropsRef.current = {
    appendTo,
    editor: resolvedEditor,
    element: targetElementRef.current,
    getReferencedVirtualElement,
    onDestroy,
    onHide,
    onShow,
    onUpdate,
    options,
    pluginKey: resolvedPluginKey,
    resizeDelay,
    shouldShow,
    updateDelay,
  };

  useEffect(() => {
    if (!resolvedEditor?.view || !targetElementRef.current) {
      return;
    }

    const plugin = BubbleMenuPlugin({
      ...pluginPropsRef.current,
      editor: resolvedEditor,
      element: targetElementRef.current,
      getProps: () => ({
        ...pluginPropsRef.current,
        editor: resolvedEditor,
        element: targetElementRef.current!,
        pluginKey: resolvedPluginKey,
      }),
      pluginKey: resolvedPluginKey,
    });

    resolvedEditor.registerPlugin(plugin);

    return () => {
      resolvedEditor.unregisterPlugin(resolvedPluginKey);
    };
  }, [resolvedEditor, resolvedPluginKey]);

  useEffect(() => {
    if (!resolvedEditor?.view) {
      return;
    }

    resolvedEditor.view.dispatch(
      resolvedEditor.state.tr
        .setMeta(resolvedPluginKey, { refresh: true })
        .setMeta("preventUpdate", true),
    );
  }, [
    appendTo,
    getReferencedVirtualElement,
    onDestroy,
    onHide,
    onShow,
    onUpdate,
    options,
    resolvedEditor,
    resolvedPluginKey,
    resizeDelay,
    shouldShow,
    updateDelay,
  ]);

  if (!targetElementRef.current) {
    return null;
  }

  return createPortal(
    <div {...props}>
      {children}
    </div>,
    targetElementRef.current,
  );
}
