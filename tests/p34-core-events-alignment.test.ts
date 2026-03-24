import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  Editor,
  Extension,
} from "@mxm-editor/core";
import {
  Fragment,
  Plugin,
  Slice,
} from "@mxm-editor/pm";
import { Document } from "@mxm-editor/extension-document";
import { Paragraph } from "@mxm-editor/extension-paragraph";
import { Text } from "@mxm-editor/extension-text";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(options: Partial<ConstructorParameters<typeof Editor>[0]> = {}) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    content: "<p></p>",
    ...options,
    extensions: [
      Document,
      Paragraph,
      Text,
      ...(options.extensions ?? []),
    ],
  });
}

describe("P34 core event alignment", () => {
  it("emits beforeTransaction and forwards appendedTransactions to editor and extensions", () => {
    const optionEvents: string[] = [];
    const emittedEvents: string[] = [];
    const extensionEvents: string[] = [];
    const AppendProbe = Extension.create({
      name: "appendTransactionProbe",

      addProseMirrorPlugins() {
        return [
          new Plugin({
            appendTransaction: (transactions, _oldState, newState) => {
              if (
                !transactions.some((transaction) => transaction.docChanged)
                || transactions.some((transaction) => transaction.getMeta("append-transaction-probe"))
              ) {
                return undefined;
              }

              return newState.tr
                .insertText("!", newState.selection.from)
                .setMeta("append-transaction-probe", true);
            },
          }),
        ];
      },

      onTransaction({ appendedTransactions }) {
        extensionEvents.push(`transaction:${appendedTransactions.length}`);
      },

      onUpdate({ appendedTransactions }) {
        extensionEvents.push(`update:${appendedTransactions.length}`);
      },
    });
    const editor = createEditor({
      extensions: [AppendProbe],
      onBeforeTransaction: ({ nextState }) => {
        optionEvents.push(`before:${nextState.doc.textContent}`);
      },
      onTransaction: ({ appendedTransactions }) => {
        optionEvents.push(`transaction:${appendedTransactions.length}`);
      },
      onUpdate: ({ appendedTransactions }) => {
        optionEvents.push(`update:${appendedTransactions.length}`);
      },
    });

    editor.on("beforeTransaction", ({ nextState }) => {
      emittedEvents.push(`before:${nextState.doc.textContent}`);
    });
    editor.on("transaction", ({ appendedTransactions }) => {
      emittedEvents.push(`transaction:${appendedTransactions.length}`);
    });
    editor.on("update", ({ appendedTransactions }) => {
      emittedEvents.push(`update:${appendedTransactions.length}`);
    });

    optionEvents.length = 0;
    emittedEvents.length = 0;
    extensionEvents.length = 0;

    expect(editor.commands.insertContent("A")).toBe(true);
    expect(editor.getText()).toBe("A!");
    expect(optionEvents).toEqual([
      "before:A!",
      "transaction:1",
      "update:1",
    ]);
    expect(emittedEvents).toEqual([
      "before:A!",
      "transaction:1",
      "update:1",
    ]);
    expect(extensionEvents).toEqual([
      "transaction:1",
      "update:1",
    ]);

    editor.destroy();
  });

  it("emits paste and drop through core extensions and option callbacks", () => {
    const optionEvents: string[] = [];
    const emittedEvents: string[] = [];
    const editor = createEditor({
      onPaste: ({ slice }) => {
        optionEvents.push(`paste:${slice.content.size}`);
      },
      onDrop: ({ slice, moved }) => {
        optionEvents.push(`drop:${slice.content.size}:${String(moved)}`);
      },
    });
    const slice = new Slice(
      Fragment.from(editor.schema.text("payload")),
      0,
      0,
    );
    const pasteEvent = {
      clipboardData: {
        getData: () => "",
      },
    } as ClipboardEvent;
    const dropEvent = {
      dataTransfer: null,
    } as DragEvent;

    editor.on("paste", ({ slice: nextSlice }) => {
      emittedEvents.push(`paste:${nextSlice.content.size}`);
    });
    editor.on("drop", ({ slice: nextSlice, moved }) => {
      emittedEvents.push(`drop:${nextSlice.content.size}:${String(moved)}`);
    });

    editor.view?.someProp("handlePaste", (handler) => {
      handler(editor.view!, pasteEvent, slice);
      return false;
    });
    editor.view?.someProp("handleDrop", (handler) => {
      handler(editor.view!, dropEvent, slice, true);
      return false;
    });

    expect(optionEvents).toEqual([
      `paste:${slice.content.size}`,
      `drop:${slice.content.size}:true`,
    ]);
    expect(emittedEvents).toEqual([
      `paste:${slice.content.size}`,
      `drop:${slice.content.size}:true`,
    ]);

    editor.destroy();
  });

  it("routes focus and blur through transaction meta before emitting lifecycle events", () => {
    const optionEvents: string[] = [];
    const emittedEvents: string[] = [];
    const extensionEvents: string[] = [];
    const FocusProbe = Extension.create({
      name: "focusPipelineProbe",

      onTransaction({ transaction }) {
        if (transaction.getMeta("focus")) {
          extensionEvents.push("transaction:focus");
        }

        if (transaction.getMeta("blur")) {
          extensionEvents.push("transaction:blur");
        }
      },

      onFocus({ transaction }) {
        extensionEvents.push(`focus:${String(transaction.getMeta("addToHistory"))}`);
      },

      onBlur({ transaction }) {
        extensionEvents.push(`blur:${String(transaction.getMeta("addToHistory"))}`);
      },
    });
    const editor = createEditor({
      extensions: [FocusProbe],
      onTransaction: ({ transaction }) => {
        if (transaction.getMeta("focus")) {
          optionEvents.push("transaction:focus");
        }

        if (transaction.getMeta("blur")) {
          optionEvents.push("transaction:blur");
        }
      },
      onFocus: ({ transaction }) => {
        optionEvents.push(`focus:${String(transaction.getMeta("addToHistory"))}`);
      },
      onBlur: ({ transaction }) => {
        optionEvents.push(`blur:${String(transaction.getMeta("addToHistory"))}`);
      },
    });

    editor.on("transaction", ({ transaction }) => {
      if (transaction.getMeta("focus")) {
        emittedEvents.push("transaction:focus");
      }

      if (transaction.getMeta("blur")) {
        emittedEvents.push("transaction:blur");
      }
    });
    editor.on("focus", ({ transaction }) => {
      emittedEvents.push(`focus:${String(transaction.getMeta("addToHistory"))}`);
    });
    editor.on("blur", ({ transaction }) => {
      emittedEvents.push(`blur:${String(transaction.getMeta("addToHistory"))}`);
    });

    editor.view?.dom.dispatchEvent(new FocusEvent("focus"));
    editor.view?.dom.dispatchEvent(new FocusEvent("blur"));

    expect(optionEvents).toContain("transaction:focus");
    expect(optionEvents).toContain("focus:false");
    expect(optionEvents.slice(-2)).toEqual([
      "transaction:blur",
      "blur:false",
    ]);
    expect(emittedEvents).toContain("transaction:focus");
    expect(emittedEvents).toContain("focus:false");
    expect(emittedEvents.slice(-2)).toEqual([
      "transaction:blur",
      "blur:false",
    ]);
    expect(extensionEvents).toContain("transaction:focus");
    expect(extensionEvents).toContain("focus:false");
    expect(extensionEvents.slice(-2)).toEqual([
      "transaction:blur",
      "blur:false",
    ]);
    expect(editor.isFocused).toBe(false);

    editor.destroy();
  });
});
