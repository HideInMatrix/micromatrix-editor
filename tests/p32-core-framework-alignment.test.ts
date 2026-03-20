import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  createElement,
  Editor,
  Extension,
  Fragment,
  h,
  style,
} from "@mxm-editor/core";
import {
  jsx,
  jsxDEV,
  jsxs,
} from "@mxm-editor/core/jsx-runtime";
import { Document } from "@mxm-editor/extension-document";
import { Paragraph } from "@mxm-editor/extension-paragraph";
import { Text } from "@mxm-editor/extension-text";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(extensions: any[] = []) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    extensions: [
      Document,
      Paragraph,
      Text,
      ...extensions,
    ],
    content: "<p></p>",
  });
}

function triggerShortcut(editor: Editor, key: string) {
  const view = editor.view;

  if (!view) {
    throw new Error("Expected mounted editor view.");
  }

  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  let handled = false;

  view.someProp("handleKeyDown", (handler) => {
    handled = handler(view, event);
    return handled;
  });

  return handled;
}

describe("P32 core framework alignment", () => {
  it("keeps configured options visible through parent chaining", () => {
    type ProbeOptions = {
      nested: {
        base: string;
        configured?: string;
        derived?: string;
      };
    };

    type ProbeStorage = {
      snapshot: string[];
    };

    const Base = Extension.create<ProbeOptions, ProbeStorage>({
      name: "configureChainProbe",

      addOptions() {
        return {
          nested: {
            base: "base",
          },
        };
      },

      addStorage() {
        return {
          snapshot: Object.values(this.options.nested),
        };
      },
    });
    const Configured = Base.configure({
      nested: {
        configured: "configured",
      },
    });
    const Derived = Configured.extend({
      addOptions() {
        return {
          ...this.parent?.(),
          nested: {
            ...this.parent?.().nested,
            derived: "derived",
          },
        };
      },

      addStorage() {
        return {
          snapshot: Object.values(this.options.nested),
        };
      },
    });

    expect(Derived.options.nested).toEqual({
      base: "base",
      configured: "configured",
      derived: "derived",
    });
    expect(Derived.storage.snapshot).toEqual([
      "base",
      "configured",
      "derived",
    ]);
  });

  it("lets later extensions override earlier keyboard shortcuts at the same priority", () => {
    const order: string[] = [];
    const FirstShortcut = Extension.create({
      name: "firstShortcut",

      addKeyboardShortcuts() {
        return {
          F8: () => {
            order.push("first");
            return true;
          },
        };
      },
    });
    const SecondShortcut = Extension.create({
      name: "secondShortcut",

      addKeyboardShortcuts() {
        return {
          F8: () => {
            order.push("second");
            return true;
          },
        };
      },
    });
    const editor = createEditor([
      FirstShortcut,
      SecondShortcut,
    ]);

    expect(triggerShortcut(editor, "F8")).toBe(true);
    expect(order).toEqual(["second"]);

    editor.destroy();
  });

  it("warns when duplicate extension names are resolved", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const DuplicateA = Extension.create({
      name: "duplicateProbe",
    });
    const DuplicateB = Extension.create({
      name: "duplicateProbe",
    });
    const editor = createEditor([
      DuplicateA,
      DuplicateB,
    ]);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Duplicate extension names found"),
    );

    editor.destroy();
    warn.mockRestore();
  });

  it("routes keyboardShortcut through the built-in keymap extension", () => {
    const editor = createEditor();

    editor.setContent("<p>Hello world</p>");

    expect(editor.commands.setTextSelection(7)).toBe(true);
    expect(editor.commands.keyboardShortcut("Enter")).toBe(true);
    expect(editor.getHTML()).toContain("<p>Hello </p><p>world</p>");

    editor.destroy();
  });

  it("exports the JSX runtime helpers and base style constant", () => {
    expect(Fragment({ children: [] })).toEqual([]);
    expect(createElement).toBe(h);
    expect(jsxDEV).toBe(jsx);
    expect(jsxs).toBe(jsx);
    expect(jsx("p", { class: "note", children: 0 })).toEqual([
      "p",
      { class: "note" },
      0,
    ]);
    expect(style).toContain(".ProseMirror-gapcursor");
  });
});
