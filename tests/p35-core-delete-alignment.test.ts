import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  Editor,
  type DeleteEvent,
} from "@mxm-editor/core";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(options: Partial<ConstructorParameters<typeof Editor>[0]> = {}) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    content: "<p></p>",
    coreExtensionOptions: {
      delete: {
        async: false,
      },
    },
    ...options,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
      }),
      ...(options.extensions ?? []),
    ],
  });
}

function findTextPosition(editor: Editor, text: string) {
  let position = 0;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return true;
    }

    const index = node.text.indexOf(text);

    if (index === -1) {
      return true;
    }

    position = pos + index + 1;
    return false;
  });

  if (!position) {
    throw new Error(`Unable to find text position for "${text}".`);
  }

  return position;
}

describe("P35 core delete alignment", () => {
  it("emits node delete events for removed empty blocks", () => {
    const optionEvents: DeleteEvent[] = [];
    const emittedEvents: DeleteEvent[] = [];
    const editor = createEditor({
      content: "<p></p><p>After</p>",
      onDelete: (payload) => optionEvents.push(payload),
    });

    editor.on("delete", (payload) => {
      emittedEvents.push(payload);
    });

    expect(editor.commands.setTextSelection(1)).toBe(true);
    expect(editor.commands.deleteCurrentNode()).toBe(true);

    expect(optionEvents).toHaveLength(1);
    expect(emittedEvents).toHaveLength(1);
    expect(optionEvents[0]?.type).toBe("node");
    expect(emittedEvents[0]?.type).toBe("node");
    expect(optionEvents[0]?.partial).toBe(false);
    expect(emittedEvents[0]?.partial).toBe(false);
    expect(optionEvents[0] && optionEvents[0].type === "node"
      ? optionEvents[0].node.type.name
      : null).toBe("paragraph");
    expect(emittedEvents[0] && emittedEvents[0].type === "node"
      ? emittedEvents[0].node.type.name
      : null).toBe("paragraph");

    editor.destroy();
  });

  it("emits mark delete events when a mark is fully removed", () => {
    const optionEvents: DeleteEvent[] = [];
    const emittedEvents: DeleteEvent[] = [];
    const editor = createEditor({
      content: "<p><strong>Hello</strong> world</p>",
      onDelete: (payload) => optionEvents.push(payload),
    });

    editor.on("delete", (payload) => {
      emittedEvents.push(payload);
    });

    expect(editor.commands.setTextSelection({
      from: findTextPosition(editor, "Hello"),
      to: findTextPosition(editor, "Hello") + "Hello".length,
    })).toBe(true);
    expect(editor.commands.unsetMark("bold")).toBe(true);

    expect(optionEvents.some((event) => event.type === "mark")).toBe(true);
    expect(emittedEvents.some((event) => event.type === "mark")).toBe(true);

    const optionMarkEvent = optionEvents.find((event) => event.type === "mark");
    const emittedMarkEvent = emittedEvents.find((event) => event.type === "mark");

    expect(typeof optionMarkEvent?.partial).toBe("boolean");
    expect(typeof emittedMarkEvent?.partial).toBe("boolean");
    expect((optionMarkEvent?.deletedRange.to ?? 0) > (optionMarkEvent?.deletedRange.from ?? 0)).toBe(true);
    expect((emittedMarkEvent?.deletedRange.to ?? 0) > (emittedMarkEvent?.deletedRange.from ?? 0)).toBe(true);
    expect(optionMarkEvent && optionMarkEvent.type === "mark"
      ? optionMarkEvent.mark.type.name
      : null).toBe("bold");
    expect(emittedMarkEvent && emittedMarkEvent.type === "mark"
      ? emittedMarkEvent.mark.type.name
      : null).toBe("bold");

    editor.destroy();
  });
});
