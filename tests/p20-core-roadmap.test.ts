import { afterEach, describe, expect, it } from "vitest";
import { Editor, Extension } from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";
import { flushEditorCreate } from "./helpers/flushEditorCreate";

afterEach(() => {
  document.body.innerHTML = "";
});

function createExtensions() {
  return [
    StarterKit.configure({
      undoRedo: false,
    }),
  ];
}

describe("P20 core roadmap", () => {
  it("supports extension inheritance through parent chaining", () => {
    const records: string[] = [];
    const Base = Extension.create<{ label: string }>({
      name: "inheritanceProbe",

      addOptions() {
        return {
          label: "base",
        };
      },

      addCommands() {
        return {
          recordBase:
            () =>
            () => {
              records.push(`base:${this.options.label}`);
              return true;
            },
        };
      },

      onBeforeCreate() {
        records.push(`before:base:${this.options.label}`);
      },
    });

    const Derived = Base.extend({
      addOptions() {
        return {
          ...this.parent?.(),
          label: "derived",
        };
      },

      addCommands() {
        return {
          ...(this.parent?.() ?? {}),
          recordDerived:
            () =>
            () => {
              records.push(`derived:${this.options.label}`);
              return true;
            },
        };
      },

      onBeforeCreate() {
        this.parent?.();
        records.push(`before:derived:${this.options.label}`);
      },
    });

    const editor = new Editor({
      extensions: [
        ...createExtensions(),
        Derived,
      ],
      content: "<p>Inheritance</p>",
    });

    expect(Derived.parent).toBe(Base);
    expect(Derived.options.label).toBe("derived");
    expect(editor.commands.recordBase()).toBe(true);
    expect(editor.commands.recordDerived()).toBe(true);
    expect(records).toEqual([
      "before:base:derived",
      "before:derived:derived",
      "base:derived",
      "derived:derived",
    ]);

    editor.destroy();
  });

  it("emits lifecycle hooks and applies core editor extensions", async () => {
    const element = document.createElement("div");
    const extensionEvents: string[] = [];
    const optionEvents: string[] = [];
    const emittedEvents: string[] = [];

    document.body.appendChild(element);

    const Lifecycle = Extension.create({
      name: "lifecycleProbe",

      onBeforeCreate() {
        extensionEvents.push("ext:beforeCreate");
      },

      onCreate() {
        extensionEvents.push("ext:create");
      },

      onTransaction() {
        extensionEvents.push("ext:transaction");
      },

      onUpdate() {
        extensionEvents.push("ext:update");
      },

      onSelectionUpdate() {
        extensionEvents.push("ext:selectionUpdate");
      },

      onFocus() {
        extensionEvents.push("ext:focus");
      },

      onBlur() {
        extensionEvents.push("ext:blur");
      },

      onDestroy() {
        extensionEvents.push("ext:destroy");
      },
    });

    const editor = new Editor({
      element,
      extensions: [
        ...createExtensions(),
        Lifecycle,
      ],
      content: "<p>Hello</p>",
      onBeforeCreate: () => optionEvents.push("option:beforeCreate"),
      onCreate: () => optionEvents.push("option:create"),
      onTransaction: () => optionEvents.push("option:transaction"),
      onUpdate: () => optionEvents.push("option:update"),
      onSelectionUpdate: () => optionEvents.push("option:selectionUpdate"),
      onFocus: () => optionEvents.push("option:focus"),
      onBlur: () => optionEvents.push("option:blur"),
      onDestroy: () => optionEvents.push("option:destroy"),
    });

    editor.on("transaction", () => emittedEvents.push("event:transaction"));
    editor.on("focus", () => emittedEvents.push("event:focus"));
    editor.on("blur", () => emittedEvents.push("event:blur"));

    await flushEditorCreate();

    expect(element.querySelector(".ProseMirror")?.getAttribute("tabindex")).toBe("0");

    expect(editor.commands.setTextSelection(3)).toBe(true);
    expect(editor.commands.insertContent(" world")).toBe(true);

    editor.view?.dom.dispatchEvent(new FocusEvent("focus"));
    editor.view?.dom.dispatchEvent(new FocusEvent("blur"));

    editor.setEditable(false, false);

    expect(editor.view?.dom.getAttribute("contenteditable")).toBe("false");
    expect(editor.view?.dom.getAttribute("tabindex")).toBeNull();

    editor.destroy();

    expect(extensionEvents).toContain("ext:beforeCreate");
    expect(extensionEvents).toContain("ext:create");
    expect(extensionEvents).toContain("ext:transaction");
    expect(extensionEvents).toContain("ext:update");
    expect(extensionEvents).toContain("ext:selectionUpdate");
    expect(extensionEvents).toContain("ext:focus");
    expect(extensionEvents).toContain("ext:blur");
    expect(extensionEvents).toContain("ext:destroy");
    expect(optionEvents).toContain("option:beforeCreate");
    expect(optionEvents).toContain("option:create");
    expect(optionEvents).toContain("option:transaction");
    expect(optionEvents).toContain("option:update");
    expect(optionEvents).toContain("option:selectionUpdate");
    expect(optionEvents).toContain("option:focus");
    expect(optionEvents).toContain("option:blur");
    expect(optionEvents).toContain("option:destroy");
    expect(emittedEvents).toContain("event:transaction");
    expect(emittedEvents).toContain("event:focus");
    expect(emittedEvents).toContain("event:blur");
  });

  it("supports the new generic core commands", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: createExtensions(),
      content: "<p>Hello world</p>",
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 6 })).toBe(true);
    expect(editor.commands.setMark("bold")).toBe(true);
    expect(editor.getHTML()).toContain("<strong>Hello</strong>");

    expect(editor.commands.unsetMark("bold")).toBe(true);
    expect(editor.getHTML()).not.toContain("<strong>");

    editor.setContent("<p>Hello world</p>");
    expect(editor.commands.selectAll()).toBe(true);
    expect(editor.commands.setNode("heading", { level: 2 })).toBe(true);
    expect(editor.getHTML()).toContain("<h2");
    expect(editor.getHTML()).toContain(">Hello world</h2>");

    expect(editor.commands.updateAttributes("heading", { level: 3 })).toBe(true);
    expect(editor.getHTML()).toContain("<h3");
    expect(editor.getHTML()).toContain(">Hello world</h3>");

    editor.setContent("<h2>Hello world</h2>");
    expect(editor.commands.setTextSelection(3)).toBe(true);
    expect(editor.commands.toggleNode("heading", "paragraph", { level: 2 })).toBe(true);
    expect(editor.getHTML()).toContain("<p>Hello world</p>");

    editor.setContent("<p>Hello world</p>");
    expect(editor.commands.selectAll()).toBe(true);
    expect(editor.commands.wrapIn("blockquote")).toBe(true);
    expect(editor.getHTML()).toContain("<blockquote>");
    expect(editor.getHTML()).toContain("<p>Hello world</p>");

    expect(editor.commands.setTextSelection(3)).toBe(true);
    expect(editor.commands.toggleWrap("blockquote")).toBe(true);
    expect(editor.getHTML()).not.toContain("<blockquote>");

    expect(editor.commands.selectAll()).toBe(true);
    expect(editor.commands.toggleWrap("blockquote")).toBe(true);
    expect(editor.getHTML()).toContain("<blockquote>");
    expect(editor.getHTML()).toContain("Hello world");

    editor.setContent("<blockquote><p>Hello world</p></blockquote>");
    expect(editor.commands.setTextSelection(3)).toBe(true);
    expect(editor.commands.lift("blockquote")).toBe(true);
    expect(editor.getHTML()).not.toContain("<blockquote>");

    editor.setContent("<p>Hello world</p>");
    expect(editor.commands.setTextSelection(7)).toBe(true);
    expect(editor.commands.splitBlock()).toBe(true);
    expect(editor.getHTML()).toContain("<p>Hello </p><p>world</p>");

    const order: string[] = [];

    expect(
      editor.commands.first([
        () => {
          order.push("first");
          return false;
        },
        ({ commands }) => {
          order.push("second");
          return commands.insertContent("!");
        },
        () => {
          order.push("third");
          return true;
        },
      ]),
    ).toBe(true);

    expect(order).toEqual(["first", "second"]);

    editor.destroy();
  });
});
