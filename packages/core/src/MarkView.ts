import type {
  Mark as ProseMirrorMark,
  MarkView as ProseMirrorMarkView,
  ViewMutationRecord,
} from "@mxm-editor/pm";
import type {
  MarkViewProps,
  MarkViewRendererOptions,
} from "./types";

export function updateMarkViewAttributes(
  checkMark: ProseMirrorMark,
  editor: MarkViewProps["editor"],
  attributes: Record<string, any> = {},
) {
  const { state } = editor;
  const { doc, tr } = state;

  doc.descendants((node, pos) => {
    const from = tr.mapping.map(pos);
    const to = tr.mapping.map(pos) + node.nodeSize;
    let foundMark: ProseMirrorMark | null = null;

    node.marks.forEach((mark) => {
      if (mark === checkMark) {
        foundMark = mark;
      }
    });

    if (!foundMark) {
      return;
    }

    const needsUpdate = Object.keys(attributes).some(
      (name) => attributes[name] !== foundMark?.attrs[name],
    );

    if (!needsUpdate) {
      return;
    }

    const updatedMark = checkMark.type.create({
      ...checkMark.attrs,
      ...attributes,
    });

    tr.removeMark(from, to, checkMark.type);
    tr.addMark(from, to, updatedMark);
  });

  if (tr.docChanged) {
    editor.view?.dispatch(tr);
  }
}

export class MarkView<
  Component = unknown,
  Options extends MarkViewRendererOptions = MarkViewRendererOptions,
> implements ProseMirrorMarkView
{
  component: Component;

  editor: MarkViewProps["editor"];

  options: Options;

  mark: MarkViewProps["mark"];

  HTMLAttributes: MarkViewProps["HTMLAttributes"];

  constructor(
    component: Component,
    props: MarkViewProps,
    options: Partial<Options> = {},
  ) {
    this.component = component;
    this.editor = props.editor;
    this.options = { ...options } as Options;
    this.mark = props.mark;
    this.HTMLAttributes = props.HTMLAttributes;
  }

  get dom(): HTMLElement {
    const view = this.editor.view;

    if (!view) {
      throw new Error("Mark views require a mounted editor view.");
    }

    return view.dom;
  }

  get contentDOM(): HTMLElement | null {
    return null;
  }

  update(mark: ProseMirrorMark) {
    if (mark.type !== this.mark.type) {
      return false;
    }

    this.mark = mark;

    return true;
  }

  destroy() {
    return;
  }

  updateAttributes(attributes: Record<string, any>, checkMark?: ProseMirrorMark) {
    updateMarkViewAttributes(checkMark ?? this.mark, this.editor, attributes);
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    if (typeof this.options.ignoreMutation === "function") {
      return this.options.ignoreMutation({ mutation });
    }

    if (mutation.type === "selection") {
      return false;
    }

    if (!this.contentDOM) {
      return true;
    }

    if (mutation.target === this.contentDOM && mutation.type === "attributes") {
      return true;
    }

    return !this.contentDOM.contains(mutation.target);
  }
}
