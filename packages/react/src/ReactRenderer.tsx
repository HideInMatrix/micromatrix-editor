import type { ComponentType } from "react";
import { createElement } from "react";
import type {
  ContentRenderer,
  EditorWithContentComponent,
} from "./nodeviews/types";

export interface ReactRendererOptions<P extends Record<string, any>> {
  editor: EditorWithContentComponent;
  props?: P;
  as?: string;
  className?: string;
}

export class ReactRenderer<P extends Record<string, any> = Record<string, any>> {
  id: string;

  editor: EditorWithContentComponent;

  component: ComponentType<P>;

  element: HTMLElement;

  props: P;

  reactElement = null as ContentRenderer["reactElement"];

  private destroyed = false;

  private renderScheduled = false;

  constructor(
    component: ComponentType<P>,
    {
      editor,
      props = {} as P,
      as = "div",
      className = "",
    }: ReactRendererOptions<P>,
  ) {
    this.id = Math.floor(Math.random() * 0xffffffff).toString(36);
    this.editor = editor;
    this.component = component;
    this.props = props;
    this.element = document.createElement(as);
    this.element.classList.add("react-renderer");

    if (className) {
      this.element.classList.add(...className.split(" "));
    }

    this.render();
  }

  render() {
    this.reactElement = createElement(this.component, this.props);
    if (!this.editor.contentComponent) {
      return;
    }

    if (this.renderScheduled) {
      return;
    }

    this.renderScheduled = true;

    queueMicrotask(() => {
      this.renderScheduled = false;

      if (this.destroyed || !this.editor.contentComponent) {
        return;
      }

      this.editor.contentComponent.setRenderer(this.id, {
        id: this.id,
        element: this.element,
        reactElement: this.reactElement,
      });
    });
  }

  updateProps(props: Partial<P> = {}) {
    this.props = {
      ...this.props,
      ...props,
    };

    this.render();
  }

  destroy() {
    this.destroyed = true;
    this.editor.contentComponent?.removeRenderer(this.id);
  }
}
