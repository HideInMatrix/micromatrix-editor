import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@mxm-editor/core";
import {
  Pages,
  PAGE_FORMATS,
  cmToPixels,
  inchToPixels,
  mmToPixels,
  type PagesStorage,
} from "@mxm-editor/extension-pages";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  document.head
    .querySelectorAll('style[data-mxm-pages="true"]')
    .forEach((element) => element.remove());
});

async function flushPagesLayout() {
  await Promise.resolve();
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
  await Promise.resolve();
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

describe("P18 pages smoke", () => {
  it("injects page chrome, updates storage through commands, and paginates top-level blocks", async () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        Pages,
      ],
      content: "<p>Alpha</p><p>Beta</p><p>Gamma</p>",
    });
    const storage = editor.storage.pages as PagesStorage;

    expect(PAGE_FORMATS.A4.margins).toEqual({
      top: 96,
      right: 96,
      bottom: 96,
      left: 96,
    });
    expect(inchToPixels(1)).toBe(96);
    expect(mmToPixels(25.4)).toBeCloseTo(96);
    expect(cmToPixels(2.54)).toBeCloseTo(96);

    await flushPagesLayout();

    expect(element.classList.contains("mxm-pages")).toBe(true);
    expect(element.querySelector(".mxm-pages__editor")).not.toBeNull();
    expect(document.head.querySelector('style[data-mxm-pages="true"]')).not.toBeNull();

    expect(
      editor.commands.setPageFormat({
        pageFormat: {
          width: 800,
          height: 1000,
          margins: {
            top: 120,
            right: 80,
            bottom: 120,
            left: 80,
          },
        },
      }),
    ).toBe(true);
    expect(editor.commands.setPageGap(64)).toBe(true);
    expect(editor.commands.setHeader({
      value: "Default header",
    })).toBe(true);
    expect(editor.commands.setHeaderFirstPage("Cover header")).toBe(true);
    expect(editor.commands.setFooter({
      value: "Default footer",
    })).toBe(true);
    expect(editor.commands.setFooterEven("Even footer")).toBe(true);
    expect(editor.commands.setDifferentFirstPage(true)).toBe(true);
    expect(editor.commands.setDifferentOddEven(true)).toBe(true);

    expect(storage.pageFormat).toEqual({
      width: 800,
      height: 1000,
      margins: {
        top: 120,
        right: 80,
        bottom: 120,
        left: 80,
      },
    });
    expect(storage.getMetrics()).toEqual({
      topInset: 120,
      rightInset: 80,
      bottomInset: 120,
      leftInset: 80,
      availableContentHeight: 760,
    });
    expect(storage.pageGap).toBe(64);

    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      if (this.tagName === "P") {
        const text = this.textContent?.trim();

        if (text === "Alpha") {
          return new DOMRect(0, 0, 640, 420);
        }

        if (text === "Beta") {
          return new DOMRect(0, 0, 640, 420);
        }

        if (text === "Gamma") {
          return new DOMRect(0, 0, 640, 260);
        }
      }

      return originalGetBoundingClientRect.call(this);
    });

    expect(editor.commands.repaginate()).toBe(true);
    await flushPagesLayout();

    expect(storage.pageCount).toBe(2);
    expect(storage.pageBreakPositions).toHaveLength(1);
    expect(element.querySelectorAll(".mxm-pages__break")).toHaveLength(1);
    expect(element.style.getPropertyValue("--mxm-pages-padding-left")).toBe("80px");
    expect(element.style.getPropertyValue("--mxm-pages-padding-right")).toBe("80px");

    expect(
      element.querySelector(".mxm-pages__edge--start .mxm-pages__region--header")?.textContent,
    ).toContain("Cover header");
    expect(
      element.querySelector(".mxm-pages__break .mxm-pages__region--header")?.textContent,
    ).toContain("Default header");
    expect(
      element.querySelector(".mxm-pages__edge--end .mxm-pages__region--footer")?.textContent,
    ).toContain("Even footer");

    editor.destroy();
  });
});
