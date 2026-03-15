import {
  NodeView,
  type NodeViewRenderer,
  type NodeViewRendererProps,
} from "@mxm-editor/core";
import type {
  Decoration,
  DecorationSource,
  Node as ProseMirrorNode,
} from "@mxm-editor/pm";
import type { ComponentType } from "react";
import { createElement } from "react";
import { ReactRenderer } from "./ReactRenderer";
import { ReactNodeViewContext } from "./nodeviews/ReactNodeViewContext";
import type {
  EditorWithContentComponent,
  ReactNodeViewProps,
  ReactNodeViewRendererOptions,
} from "./nodeviews/types";

class ReactNodeView extends NodeView<
  ComponentType<ReactNodeViewProps>,
  ReactNodeViewRendererOptions
> {
  renderer!: ReactRenderer<ReactNodeViewProps>;

  contentDOMElement: HTMLElement | null = null;

  constructor(
    component: ComponentType<ReactNodeViewProps>,
    props: NodeViewRendererProps,
    options: Partial<ReactNodeViewRendererOptions> = {},
  ) {
    super(component, props, options);

    if (!this.node.isLeaf) {
      this.contentDOMElement = document.createElement(
        this.node.isInline ? "span" : "div",
      );
      this.contentDOMElement.dataset.nodeViewContentReact = "";
      this.contentDOMElement.style.whiteSpace = "inherit";
    }

    this.mount();
  }

  mount() {
    const Component = this.component;
    const nodeViewContentRef = (element: HTMLElement | null) => {
      if (
        element
        && this.contentDOMElement
        && element.firstChild !== this.contentDOMElement
      ) {
        element.appendChild(this.contentDOMElement);
      }
    };
    const WrappedComponent = (props: ReactNodeViewProps) =>
      createElement(
        ReactNodeViewContext.Provider,
        {
          value: {
            nodeViewContentRef,
          },
        },
        createElement(Component, props),
      );
    const as = this.options.as ?? (this.node.isInline ? "span" : "div");
    const className = [
      `node-${this.node.type.name}`,
      this.options.className ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    this.renderer = new ReactRenderer(WrappedComponent, {
      editor: this.editor as EditorWithContentComponent,
      props: this.createProps(false),
      as,
      className,
    });
  }

  get dom() {
    return this.renderer.element;
  }

  get contentDOM() {
    return this.contentDOMElement;
  }

  update(
    node: ProseMirrorNode,
    decorations: readonly Decoration[],
    innerDecorations: DecorationSource,
  ) {
    if (node.type !== this.node.type) {
      return false;
    }

    const oldNode = this.node;
    const oldDecorations = this.decorations;
    const oldInnerDecorations = this.innerDecorations;

    this.node = node;
    this.decorations = decorations;
    this.innerDecorations = innerDecorations;

    const rerender = () => {
      this.renderer.updateProps(
        this.createProps(
          this.renderer.props.selected ?? false,
        ),
      );
    };

    if (typeof this.options.update === "function") {
      return this.options.update({
        oldNode,
        oldDecorations,
        oldInnerDecorations,
        newNode: node,
        newDecorations: decorations,
        innerDecorations,
        updateProps: rerender,
      });
    }

    rerender();

    return true;
  }

  selectNode() {
    super.selectNode();
    this.renderer.updateProps({
      selected: true,
    });
  }

  deselectNode() {
    super.deselectNode();
    this.renderer.updateProps({
      selected: false,
    });
  }

  destroy() {
    this.renderer.destroy();
  }

  private createProps(selected: boolean): ReactNodeViewProps {
    return {
      node: this.node,
      view: this.view,
      getPos: this.getPos,
      decorations: this.decorations,
      innerDecorations: this.innerDecorations,
      editor: this.editor,
      extension: this.extension,
      HTMLAttributes: this.HTMLAttributes,
      selected,
      updateAttributes: (attributes) => this.updateAttributes(attributes),
      deleteNode: () => this.deleteNode(),
    };
  }
}

export function ReactNodeViewRenderer(
  component: ComponentType<ReactNodeViewProps>,
  options: Partial<ReactNodeViewRendererOptions> = {},
): NodeViewRenderer {
  return (props) => new ReactNodeView(component, props, options);
}
