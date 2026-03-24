import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  Editor,
  Mark,
  Node,
  mergeAttributes,
} from "@mxm-editor/core";
import { Document } from "@mxm-editor/extension-document";
import { Paragraph } from "@mxm-editor/extension-paragraph";
import { Text } from "@mxm-editor/extension-text";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor({
  content,
  extensions = [],
}: {
  content: any;
  extensions?: any[];
}) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    content,
    extensions: [
      Document,
      Paragraph,
      Text,
      ...extensions,
    ],
  });
}

function getViewProp<T>(editor: Editor, name: string): T | undefined {
  let value: T | undefined;

  editor.view?.someProp(name as never, (prop: T) => {
    value = prop;
    return true;
  });

  return value;
}

function getFirstMark(editor: Editor, name: string) {
  let mark: any = null;

  editor.state.doc.descendants((node) => {
    if (!node.isText) {
      return true;
    }

    const found = node.marks.find((item) => item.type.name === name);

    if (!found) {
      return true;
    }

    mark = found;
    return false;
  });

  if (!mark) {
    throw new Error(`Expected mark "${name}" in document.`);
  }

  return mark;
}

describe("P51 core view context alignment", () => {
  it("rebuilds node views with stable extension options and storage", () => {
    const ProbeNode = Node.create({
      name: "probeNodeViewContext",
      group: "block",
      atom: true,

      addOptions() {
        return {
          labelPrefix: "base",
        };
      },

      addStorage() {
        return {
          count: 0,
        };
      },

      addAttributes() {
        return {
          label: {
            default: null,
            renderHTML: (attributes: Record<string, any>) =>
              attributes.label
                ? { "data-label": `${this.options.labelPrefix}-${attributes.label}` }
                : {},
          },
        };
      },

      parseHTML() {
        return [{ tag: "div[data-probe-node-view-context]" }];
      },

      renderHTML({ HTMLAttributes }) {
        return [
          "div",
          mergeAttributes(
            { "data-probe-node-view-context": "" },
            HTMLAttributes,
          ),
        ];
      },

      addNodeView() {
        return ({ HTMLAttributes }) => {
          const dom = document.createElement("div");

          dom.setAttribute(
            "data-rendered-context",
            `${this.options.labelPrefix}:${this.storage.count}`,
          );
          Object.entries(HTMLAttributes).forEach(([key, value]) => {
            dom.setAttribute(key, value);
          });

          return {
            dom,
            update: () => true,
            ignoreMutation: () => true,
          } as any;
        };
      },

      addCommands() {
        return {
          configureProbeNodeView:
            (labelPrefix: string) =>
            ({ dispatch }) => {
              if (!dispatch) {
                return true;
              }

              this.options.labelPrefix = labelPrefix;
              this.storage.count += 1;
              return true;
            },
        };
      },
    });
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "probeNodeViewContext",
            attrs: {
              label: "node",
            },
          },
        ],
      },
      extensions: [ProbeNode],
    });

    expect((editor.commands as Record<string, any>).configureProbeNodeView("next")).toBe(true);

    editor.createNodeViews();

    const nodeViews = getViewProp<Record<string, any>>(editor, "nodeViews");
    const node = editor.state.doc.firstChild;
    const instance = nodeViews?.probeNodeViewContext?.(
      node,
      editor.view,
      () => 0,
      [],
      null,
    ) as any;

    expect(instance?.dom.getAttribute("data-rendered-context")).toBe("next:1");
    expect(instance?.dom.getAttribute("data-label")).toBe("next-node");

    editor.destroy();
  });

  it("rebuilds mark views with stable extension options and storage", () => {
    const ProbeMark = Mark.create({
      name: "probeMarkViewContext",

      addOptions() {
        return {
          renderedAttribute: "data-label",
        };
      },

      addStorage() {
        return {
          suffix: "base",
        };
      },

      addAttributes() {
        return {
          label: {
            default: null,
            renderHTML: (attributes: Record<string, any>) =>
              attributes.label
                ? {
                  [this.options.renderedAttribute]:
                    `${attributes.label}-${this.storage.suffix}`,
                }
                : {},
          },
        };
      },

      parseHTML() {
        return [{ tag: "span[data-probe-mark-view-context]" }];
      },

      renderHTML({ HTMLAttributes }) {
        return [
          "span",
          mergeAttributes(
            { "data-probe-mark-view-context": "" },
            HTMLAttributes,
          ),
          0,
        ];
      },

      addMarkView() {
        return ({ HTMLAttributes }) => {
          const dom = document.createElement("span");

          dom.setAttribute(
            "data-rendered-context",
            `${this.options.renderedAttribute}:${this.storage.suffix}`,
          );
          Object.entries(HTMLAttributes).forEach(([key, value]) => {
            dom.setAttribute(key, value);
          });

          return {
            dom,
            ignoreMutation: () => true,
            update: () => true,
          } as any;
        };
      },

      addCommands() {
        return {
          configureProbeMarkView:
            (renderedAttribute: string, suffix: string) =>
            ({ dispatch }) => {
              if (!dispatch) {
                return true;
              }

              this.options.renderedAttribute = renderedAttribute;
              this.storage.suffix = suffix;
              return true;
            },
        };
      },
    });
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Hello",
                marks: [
                  {
                    type: "probeMarkViewContext",
                    attrs: {
                      label: "start",
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      extensions: [ProbeMark],
    });

    expect((editor.commands as Record<string, any>).configureProbeMarkView("data-next", "live"))
      .toBe(true);

    editor.createNodeViews();

    const markViews = getViewProp<Record<string, any>>(editor, "markViews");
    const mark = getFirstMark(editor, "probeMarkViewContext");
    const instance = markViews?.probeMarkViewContext?.(mark, editor.view, true) as any;

    expect(instance?.dom.getAttribute("data-rendered-context")).toBe("data-next:live");
    expect(instance?.dom.getAttribute("data-next")).toBe("start-live");

    editor.destroy();
  });
});
