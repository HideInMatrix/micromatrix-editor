import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@mxm-editor/core";
import { BubbleMenu, EditorContent, EditorContext, FloatingMenu } from "@mxm-editor/react";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(content: string) {
  return new Editor({
    content,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
    ],
  });
}

async function flushMenuUpdates() {
  await act(async () => {
    await Promise.resolve();
  });

  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

describe("P10 menu parity smoke", () => {
  it("uses editor context fallback for BubbleMenu and supports appendTo plus lifecycle callbacks", async () => {
    const container = document.createElement("div");
    const menuHost = document.createElement("div");
    const editor = createEditor("<p>menu</p>");
    const onShow = vi.fn();
    const onHide = vi.fn();

    document.body.append(container, menuHost);

    const root = createRoot(container);

    await act(async () => {
      root.render(
        <EditorContext.Provider value={{ editor }}>
          <EditorContent editor={editor} />
          <BubbleMenu
            appendTo={menuHost}
            getReferencedVirtualElement={() => ({
              getBoundingClientRect: () => new DOMRect(100, 48, 40, 24),
            })}
            options={{
              onHide,
              onShow,
            }}
          >
            <div data-menu="bubble">bubble</div>
          </BubbleMenu>
        </EditorContext.Provider>,
      );
    });

    editor.view!.hasFocus = () => true;

    await act(async () => {
      editor.commands.setTextSelection({ from: 1, to: 3 });
    });
    await flushMenuUpdates();

    expect(menuHost.querySelector('[data-menu="bubble"]')).not.toBeNull();
    expect(onShow).toHaveBeenCalledTimes(1);

    await act(async () => {
      editor.commands.setTextSelection({ from: 1, to: 1 });
    });
    await flushMenuUpdates();

    expect(onHide).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });

    expect(menuHost.childElementCount).toBe(0);
  });

  it("uses editor context fallback for FloatingMenu and passes official-style visibility context", async () => {
    const container = document.createElement("div");
    const menuHost = document.createElement("div");
    const editor = createEditor("<p></p>");
    const shouldShowCalls: Array<{
      editorMatches: boolean;
      from: number;
      to: number;
      oldStatePresent: boolean;
    }> = [];

    document.body.append(container, menuHost);

    const root = createRoot(container);

    await act(async () => {
      root.render(
        <EditorContext.Provider value={{ editor }}>
          <EditorContent editor={editor} />
          <FloatingMenu
            appendTo={menuHost}
            shouldShow={(props) => {
              shouldShowCalls.push({
                editorMatches: props.editor === editor,
                from: props.from,
                to: props.to,
                oldStatePresent: props.oldState !== null,
              });

              return props.state.selection.empty;
            }}
          >
            <div data-menu="floating">floating</div>
          </FloatingMenu>
        </EditorContext.Provider>,
      );
    });

    editor.view!.hasFocus = () => true;
    editor.view!.coordsAtPos = () => ({
      bottom: 60,
      left: 100,
      right: 100,
      top: 40,
    });

    editor.view!.dispatch(
      editor.state.tr.setMeta("menuRefresh", true).setMeta("preventUpdate", true),
    );
    await flushMenuUpdates();

    expect(menuHost.querySelector('[data-menu="floating"]')).not.toBeNull();
    expect(shouldShowCalls.length).toBeGreaterThan(0);
    expect(shouldShowCalls.some((call) => call.editorMatches)).toBe(true);
    expect(shouldShowCalls.some((call) => call.oldStatePresent)).toBe(true);

    await act(async () => {
      editor.commands.insertContent("x");
    });
    await flushMenuUpdates();

    expect(shouldShowCalls.at(-1)?.from).toBe(2);

    await act(async () => {
      root.unmount();
    });
  });
});
