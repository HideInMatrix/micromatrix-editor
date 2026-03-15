import type { NodeViewRendererProps } from "@mxm-editor/core";
import type { Editor } from "@mxm-editor/core";
import type { ReactNode, ReactPortal } from "react";

export interface ContentRenderer {
  id: string;
  element: HTMLElement;
  reactElement: ReactNode;
}

export interface ContentComponent {
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => Record<string, ReactPortal>;
  getServerSnapshot: () => Record<string, ReactPortal>;
  setRenderer: (id: string, renderer: ContentRenderer) => void;
  removeRenderer: (id: string) => void;
}

export type EditorWithContentComponent = Editor & {
  contentComponent?: ContentComponent | null;
};

export type ReactNodeViewProps = NodeViewRendererProps;

export interface ReactNodeViewRendererOptions {
  as?: "div" | "span";
  className?: string;
  update?:
    | ((props: {
        oldNode: NodeViewRendererProps["node"];
        oldDecorations: NodeViewRendererProps["decorations"];
        oldInnerDecorations: NodeViewRendererProps["innerDecorations"];
        newNode: NodeViewRendererProps["node"];
        newDecorations: NodeViewRendererProps["decorations"];
        innerDecorations: NodeViewRendererProps["innerDecorations"];
        updateProps: () => void;
      }) => boolean)
    | null;
}
