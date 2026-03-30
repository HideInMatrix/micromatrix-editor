import { StrictMode, act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { Editor } from "@mxm-editor/core";
import { LocalEditorSection } from "../apps/playground/src/playground/components/LocalEditorSection";
import { flushEditorCreate } from "./helpers/flushEditorCreate";

interface EditorElement extends HTMLElement {
  editor?: Editor;
}

afterEach(() => {
  document.body.innerHTML = "";
});

function typeText(editor: Editor, text: string) {
  const view = editor.view;

  if (!view) {
    throw new Error("Typing requires a mounted editor view.");
  }

  for (const character of text) {
    const { from, to } = view.state.selection;
    let handled = false;

    view.someProp("handleTextInput", (handler) => {
      if (handler(view, from, to, character)) {
        handled = true;
        return true;
      }

      return false;
    });

    if (!handled) {
      view.dispatch(view.state.tr.insertText(character, from, to));
    }
  }
}

async function flushMenus() {
  await act(async () => {
    await flushEditorCreate();
  });

  await act(async () => {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

describe("P51 playground slash floating menu", () => {
  it("shows slash commands through a floating menu instead of the legacy palette", async () => {
    const container = document.createElement("div");

    document.body.appendChild(container);

    const root = createRoot(container);

    await act(async () => {
      root.render(
        <StrictMode>
          <LocalEditorSection />
        </StrictMode>,
      );
    });
    await flushMenus();

    const editorDom = container.querySelector(".ProseMirror") as EditorElement | null;

    expect(editorDom?.editor).toBeDefined();

    const editor = editorDom!.editor!;
    const wordsText = container.textContent ?? "";

    expect(wordsText).toContain("词数 ");
    expect(wordsText).not.toContain("词数 0");
    expect(wordsText).toContain("字符 ");
    expect(wordsText).not.toContain("字符 0");

    await act(async () => {
      expect(editor.commands.setContent("<p></p>")).toBe(true);
      expect(editor.commands.setTextSelection(1)).toBe(true);
      typeText(editor, "/");
    });
    await flushMenus();

    expect(document.querySelector(".slash-palette")).toBeNull();
    expect(document.querySelectorAll(".slash-floating-menu .slash-item").length).toBeGreaterThan(0);

    const firstSlashItem = document.querySelector(
      ".slash-floating-menu .slash-item",
    ) as HTMLButtonElement | null;

    expect(firstSlashItem).not.toBeNull();

    await act(async () => {
      firstSlashItem?.click();
    });
    await flushMenus();

    expect(editor.isActive("heading", { level: 1 })).toBe(true);

    await act(async () => {
      root.unmount();
    });
  });
});
