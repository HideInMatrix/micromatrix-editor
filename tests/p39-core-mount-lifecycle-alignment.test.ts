import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import { Editor } from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";
import { flushEditorCreate } from "./helpers/flushEditorCreate";

function createExtensions() {
  return [
    StarterKit.configure({
      undoRedo: false,
      trailingNode: false,
    }),
  ];
}

function createElement() {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return element;
}

function getStyleTags() {
  return Array.from(document.head.querySelectorAll("style[data-tiptap-style]"));
}

afterEach(() => {
  document.body.innerHTML = "";
  getStyleTags().forEach((styleTag) => styleTag.remove());
});

describe("P39 core mount lifecycle alignment", () => {
  it("injects a shared style tag and removes it after the last editor unmounts", () => {
    const first = new Editor({
      element: createElement(),
      content: "<p>One</p>",
      extensions: createExtensions(),
    });
    const second = new Editor({
      element: createElement(),
      content: "<p>Two</p>",
      extensions: createExtensions(),
    });

    expect(first.view?.dom.classList.contains("tiptap")).toBe(true);
    expect(second.view?.dom.classList.contains("tiptap")).toBe(true);
    expect(getStyleTags()).toHaveLength(1);

    first.unmount();
    expect(getStyleTags()).toHaveLength(1);

    second.unmount();
    expect(getStyleTags()).toHaveLength(0);
  });

  it("skips CSS injection when injectCSS is disabled", () => {
    const editor = new Editor({
      element: createElement(),
      content: "<p>No CSS</p>",
      injectCSS: false,
      extensions: createExtensions(),
    });

    expect(getStyleTags()).toHaveLength(0);

    editor.destroy();
  });

  it("emits mount and unmount callbacks and stores the mounted editor on the DOM node", async () => {
    const records: string[] = [];
    const editor = new Editor({
      content: "<p>Lifecycle</p>",
      extensions: createExtensions(),
      onMount: () => {
        records.push("option:mount");
      },
      onUnmount: () => {
        records.push("option:unmount");
      },
    });

    editor.on("mount", () => {
      records.push("event:mount");
    });
    editor.on("unmount", () => {
      records.push("event:unmount");
    });

    editor.mount(createElement());

    const dom = editor.view?.dom as (HTMLElement & { editor?: Editor }) | undefined;

    expect(dom?.classList.contains("tiptap")).toBe(true);
    expect(dom?.editor).toBe(editor);
    expect(editor.isInitialized).toBe(false);

    await flushEditorCreate();

    expect(editor.isInitialized).toBe(true);

    editor.unmount();

    expect(dom?.editor).toBeUndefined();
    expect(editor.isInitialized).toBe(false);
    expect(records).toEqual([
      "option:mount",
      "event:mount",
      "option:unmount",
      "event:unmount",
    ]);
  });
});
