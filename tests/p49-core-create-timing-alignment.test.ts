import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Editor } from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

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

describe("P49 core create timing alignment", () => {
  it("defers create and autofocus until the next timer tick", async () => {
    vi.useFakeTimers();

    const records: string[] = [];
    const editor = new Editor({
      element: createElement(),
      extensions: createExtensions(),
      content: "<p>Hello</p>",
      autofocus: "start",
      onCreate: () => {
        records.push("option:create");
      },
    });
    const focusSpy = vi.spyOn(editor, "focus");

    editor.on("create", () => {
      records.push("event:create");
    });

    expect(editor.isInitialized).toBe(false);
    expect(records).toEqual([]);

    await vi.runAllTimersAsync();

    expect(focusSpy).toHaveBeenCalledWith("start");
    expect(editor.isInitialized).toBe(true);
    expect(records).toEqual([
      "option:create",
      "event:create",
    ]);

    editor.destroy();
  });

  it("precomputes initial selection and cancels stale create callbacks", async () => {
    vi.useFakeTimers();

    const records: string[] = [];
    const editor = new Editor({
      extensions: createExtensions(),
      content: "<p>Hello</p>",
      autofocus: "end",
      onCreate: () => {
        records.push("option:create");
      },
    });
    const focusSpy = vi.spyOn(editor, "focus");

    editor.on("create", () => {
      records.push("event:create");
    });

    expect(editor.state.selection.from).toBeGreaterThan(1);
    expect(editor.state.selection.from).toBe(editor.state.selection.to);

    editor.mount(createElement());
    editor.unmount();

    await vi.runAllTimersAsync();

    expect(focusSpy).not.toHaveBeenCalled();
    expect(editor.isInitialized).toBe(false);
    expect(records).toEqual([]);

    editor.destroy();
  });

  it("does not focus editors that keep autofocus disabled", async () => {
    vi.useFakeTimers();

    const editor = new Editor({
      element: createElement(),
      extensions: createExtensions(),
      content: "<p>Hello</p>",
      autofocus: false,
    });
    const focusSpy = vi.spyOn(editor, "focus");

    await vi.runAllTimersAsync();

    expect(focusSpy).not.toHaveBeenCalled();
    expect(editor.isInitialized).toBe(true);

    editor.destroy();
  });
});
