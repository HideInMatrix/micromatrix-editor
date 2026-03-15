import { createContext } from "react";

export interface ReactNodeViewContextValue {
  nodeViewContentRef: (element: HTMLElement | null) => void;
}

export const ReactNodeViewContext =
  createContext<ReactNodeViewContextValue | null>(null);
