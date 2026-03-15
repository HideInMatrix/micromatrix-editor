import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { BubbleMenu, EditorContent } from "@mxm-editor/react";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("P1 react smoke", () => {
  it("passes official-style menu visibility context to shouldShow", async () => {
    const container = document.createElement("div");
    const shouldShowCalls: Array<{
      from: number;
      to: number;
      oldStatePresent: boolean;
      editorMatches: boolean;
      hasCommands: boolean;
    }> = [];

    document.body.appendChild(container);

    const editor = new Editor({
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
      ],
      content: "<p>menu</p>",
    });
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <>
          <EditorContent editor={editor} />
          <BubbleMenu
            editor={editor}
            shouldShow={(props) => {
              shouldShowCalls.push({
                from: props.from,
                to: props.to,
                oldStatePresent: props.oldState !== null,
                editorMatches: props.editor === editor,
                hasCommands: typeof props.commands.setContent === "function",
              });

              return !props.state.selection.empty;
            }}
          >
            <div>menu</div>
          </BubbleMenu>
        </>,
      );
    });

    await act(async () => {
      editor.commands.setTextSelection({ from: 1, to: 3 });
    });

    expect(shouldShowCalls.length).toBeGreaterThan(0);
    expect(shouldShowCalls.some((call) => call.oldStatePresent)).toBe(true);
    expect(shouldShowCalls.some((call) => call.editorMatches)).toBe(true);
    expect(shouldShowCalls.some((call) => call.hasCommands)).toBe(true);
    expect(shouldShowCalls.at(-1)).toMatchObject({
      from: 1,
      to: 3,
    });

    await act(async () => {
      root.unmount();
    });
  });
});
