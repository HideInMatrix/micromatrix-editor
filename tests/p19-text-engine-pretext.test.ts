import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@mxm-editor/core";
import { Pages, type PagesStorage } from "@mxm-editor/extension-pages";
import { createPretextTextEngine } from "@mxm-editor/pretext";
import { StarterKit } from "@mxm-editor/starter-kit";
import { flushEditorCreate } from "./helpers/flushEditorCreate";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  document.head
    .querySelectorAll('style[data-mxm-pages="true"]')
    .forEach((element) => element.remove());
});

async function flushPagesLayout() {
  await flushEditorCreate();
  await Promise.resolve();
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
  await Promise.resolve();
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

describe("P19 pretext text engine", () => {
  it("exposes the configured engine on the editor", () => {
    const textEngine = createPretextTextEngine();
    const editor = new Editor({
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
      ],
      textEngine,
    });

    expect(editor.textEngine).toBe(textEngine);

    editor.destroy();
  });

  it("lets pages switch paragraph measurement to the pretext engine", async () => {
    const element = document.createElement("div");
    const textEngine = createPretextTextEngine();

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        Pages.configure({
          pageFormat: {
            width: 280,
            height: 220,
            margins: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20,
            },
          },
        }),
      ],
      textEngine,
      content: [
        `<p style="font-size: 40px; line-height: 40px; margin: 0;">alpha bravo charlie delta echo</p>`,
        `<p style="font-size: 40px; line-height: 40px; margin: 0;">alpha bravo charlie delta echo</p>`,
      ].join(""),
    });
    const storage = editor.storage.pages as PagesStorage;

    await flushPagesLayout();

    expect(editor.textEngine).toBe(textEngine);
    expect(storage.pageCount).toBeGreaterThan(1);
    expect(storage.pageBreakPositions.length).toBeGreaterThan(0);
    expect(element.querySelectorAll(".breaker--page").length).toBeGreaterThan(0);

    editor.destroy();
  });
});
