import type { HTMLAttributes } from "react";
import { forwardRef, useContext } from "react";
import { ReactNodeViewContext } from "./nodeviews/ReactNodeViewContext";

export interface NodeViewContentProps
  extends HTMLAttributes<HTMLElement> {
  as?: "div" | "span";
}

export const NodeViewContent = forwardRef<HTMLElement, NodeViewContentProps>(
  function NodeViewContent({ as = "div", ...props }, ref) {
    const context = useContext(ReactNodeViewContext);
    const Component = as;

    return (
      <Component
        {...props}
        data-node-view-content=""
        ref={(element) => {
          context?.nodeViewContentRef(element);

          if (typeof ref === "function") {
            ref(element);
            return;
          }

          if (ref) {
            ref.current = element;
          }
        }}
      />
    );
  },
);
