import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  Editor,
  Extension,
  Mark,
  mergeAttributes,
} from "@mxm-editor/core";
import { Document } from "@mxm-editor/extension-document";
import { Paragraph } from "@mxm-editor/extension-paragraph";
import { Text } from "@mxm-editor/extension-text";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor({
  content = "<p></p>",
  extensions = [],
  editorProps,
  enableExtensionDispatchTransaction,
}: {
  content?: any;
  extensions?: any[];
  editorProps?: any;
  enableExtensionDispatchTransaction?: boolean;
} = {}) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    content,
    editorProps,
    enableExtensionDispatchTransaction,
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

describe("P33 core pipeline alignment", () => {
  it("composes extension dispatchTransaction hooks around the base editor dispatch", () => {
    const records: string[] = [];
    const First = Extension.create({
      name: "firstDispatchProbe",

      dispatchTransaction({ transaction, next }) {
        records.push("first:before");
        next(transaction);
        records.push("first:after");
      },
    });
    const Second = Extension.create({
      name: "secondDispatchProbe",

      dispatchTransaction({ transaction, next }) {
        records.push("second:before");
        next(transaction);
        records.push("second:after");
      },
    });
    const editor = createEditor({
      extensions: [
        First,
        Second,
      ],
    });

    records.length = 0;

    expect(editor.commands.insertContent("A")).toBe(true);
    expect(records).toEqual([
      "second:before",
      "first:before",
      "first:after",
      "second:after",
    ]);

    editor.destroy();
  });

  it("chains transformPastedHTML from editor props through extensions", () => {
    const records: string[] = [];
    const First = Extension.create({
      name: "firstTransformProbe",

      transformPastedHTML(html) {
        records.push("first");
        return html.replace("Base", "Base-First");
      },
    });
    const Second = Extension.create({
      name: "secondTransformProbe",

      transformPastedHTML(html) {
        records.push("second");
        return html.replace("Base-First", "Base-First-Second");
      },
    });
    const editor = createEditor({
      extensions: [
        First,
        Second,
      ],
      editorProps: {
        transformPastedHTML: (html: string) => {
          records.push("base");
          return html.replace("Alpha", "Base");
        },
      },
    });
    const transform = getViewProp<(html: string, view?: any) => string>(
      editor,
      "transformPastedHTML",
    );

    expect(transform?.("<p>Alpha</p>", editor.view ?? undefined)).toBe(
      "<p>Base-First-Second</p>",
    );
    expect(records).toEqual([
      "base",
      "first",
      "second",
    ]);

    editor.destroy();
  });

  it("wires custom mark views with rendered attributes and updateAttributes support", () => {
    const seenAttributes: Array<Record<string, string>> = [];
    const ProbeMark = Mark.create({
      name: "probeMarkView",

      addAttributes() {
        return {
          label: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-label"),
            renderHTML: (attributes: Record<string, any>) =>
              attributes.label
                ? { "data-label": String(attributes.label) }
                : {},
          },
        };
      },

      parseHTML() {
        return [{ tag: "span[data-probe-mark-view]" }];
      },

      renderHTML({ HTMLAttributes }) {
        return [
          "span",
          mergeAttributes(
            { "data-probe-mark-view": "" },
            HTMLAttributes,
          ),
          0,
        ];
      },

      addMarkView() {
        return (props) => {
          seenAttributes.push(props.HTMLAttributes);

          return {
            dom: document.createElement("span"),
            ignoreMutation: () => true,
            update: () => true,
            applyUpdate: () => props.updateAttributes({ label: "next" }),
          } as any;
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
                    type: "probeMarkView",
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
    const markViews = getViewProp<Record<string, any>>(editor, "markViews");
    const mark = getFirstMark(editor, "probeMarkView");
    const instance = markViews?.probeMarkView?.(mark, editor.view, true) as any;

    expect(typeof markViews?.probeMarkView).toBe("function");
    expect(seenAttributes.length).toBeGreaterThan(0);
    expect(seenAttributes.at(-1)).toEqual({ "data-label": "start" });

    instance.applyUpdate();

    expect(editor.getHTML()).toContain('data-label="next"');

    editor.destroy();
  });
});
