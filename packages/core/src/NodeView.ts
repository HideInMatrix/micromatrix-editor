import type {
  Decoration,
  DecorationSource,
  Node as ProseMirrorNode,
  NodeView as ProseMirrorNodeView,
  ViewMutationRecord,
} from "@mxm-editor/pm";
import type { AnyExtension, NodeViewRendererProps } from "./types";

export abstract class NodeView<
  Component = unknown,
  Options = Record<string, never>,
> implements ProseMirrorNodeView
{
  component: Component;

  editor: NodeViewRendererProps["editor"];

  extension: AnyExtension;

  node: ProseMirrorNode;

  view: NodeViewRendererProps["view"];

  getPos: NodeViewRendererProps["getPos"];

  decorations: readonly Decoration[];

  innerDecorations: DecorationSource;

  HTMLAttributes: Record<string, string>;

  options: Partial<Options>;

  constructor(
    component: Component,
    props: NodeViewRendererProps,
    options: Partial<Options> = {},
  ) {
    this.component = component;
    this.editor = props.editor;
    this.extension = props.extension;
    this.node = props.node;
    this.view = props.view;
    this.getPos = props.getPos;
    this.decorations = props.decorations;
    this.innerDecorations = props.innerDecorations;
    this.HTMLAttributes = props.HTMLAttributes;
    this.options = options;
  }

  abstract mount(): void;

  abstract get dom(): HTMLElement;

  get contentDOM(): HTMLElement | null {
    return null;
  }

  update(
    node: ProseMirrorNode,
    decorations: readonly Decoration[],
    innerDecorations: DecorationSource,
  ) {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;
    this.decorations = decorations;
    this.innerDecorations = innerDecorations;

    return true;
  }

  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode");
  }

  deselectNode() {
    this.dom.classList.remove("ProseMirror-selectednode");
  }

  destroy() {
    return;
  }

  stopEvent(event: Event) {
    const target = event.target;

    if (!(target instanceof Node)) {
      return false;
    }

    if (!this.dom.contains(target)) {
      return false;
    }

    if (this.contentDOM?.contains(target)) {
      return false;
    }

    return true;
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    if (mutation.type === "selection") {
      if (!this.contentDOM) {
        return false;
      }

      return !this.contentDOM.contains(mutation.target);
    }

    if (!(mutation.target instanceof Node)) {
      return true;
    }

    if (!this.contentDOM) {
      return true;
    }

    if (mutation.target === this.contentDOM) {
      return mutation.type === "attributes";
    }

    return !this.contentDOM.contains(mutation.target);
  }

  updateAttributes(attributes: Record<string, any> = {}) {
    const position = this.resolvePosition();

    if (typeof position !== "number") {
      return;
    }

    const currentNode = this.view.state.doc.nodeAt(position);

    if (!currentNode) {
      return;
    }

    this.view.dispatch(
      this.view.state.tr.setNodeMarkup(position, undefined, {
        ...currentNode.attrs,
        ...attributes,
      }),
    );
  }

  deleteNode() {
    const position = this.resolvePosition();

    if (typeof position !== "number") {
      return;
    }

    const currentNode = this.view.state.doc.nodeAt(position);

    if (!currentNode) {
      return;
    }

    this.view.dispatch(
      this.view.state.tr.delete(position, position + currentNode.nodeSize),
    );
  }

  protected resolvePosition() {
    return typeof this.getPos === "function" ? this.getPos() : undefined;
  }
}
