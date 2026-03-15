import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

export interface NodeViewWrapperProps
  extends HTMLAttributes<HTMLElement> {
  as?: "div" | "span";
}

export const NodeViewWrapper = forwardRef<HTMLElement, NodeViewWrapperProps>(
  function NodeViewWrapper({ as = "div", ...props }, ref) {
    const Component = as;

    return (
      <Component
        {...props}
        data-node-view-wrapper=""
        ref={ref as never}
      />
    );
  },
);
