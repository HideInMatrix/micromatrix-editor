import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import { Audio } from "@mxm-editor/extension-audio";
import { Twitch } from "@mxm-editor/extension-twitch";
import { Youtube } from "@mxm-editor/extension-youtube";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(extensions: any[]) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  return new Editor({
    element,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        trailingNode: false,
      }),
      ...extensions,
    ],
    content: "<p></p>",
  });
}

function pastePlainText(editor: Editor, text: string) {
  const view = editor.view;

  if (!view) {
    throw new Error("Expected mounted editor view.");
  }

  const event = {
    clipboardData: {
      getData: (type: string) => (type === "text/plain" ? text : ""),
    },
  } as unknown as ClipboardEvent;

  let handled = false;

  view.someProp("handlePaste", (handler) => {
    if (handler(view, event, null as never)) {
      handled = true;
      return true;
    }

    return false;
  });

  return handled;
}

describe("P8 media parity smoke", () => {
  it("inserts audio nodes and converts pasted audio urls", () => {
    const editor = createEditor([Audio]);

    expect(
      editor.commands.setAudio({
        src: "https://example.com/assets/loop.mp3",
      }),
    ).toBe(true);
    expect(editor.getHTML()).toContain("<audio");
    expect(editor.getHTML()).toContain('src="https://example.com/assets/loop.mp3"');
    expect(editor.getHTML()).toContain("controls");

    expect(editor.commands.setContent("<p></p>")).toBe(true);
    editor.commands.setTextSelection(1);

    expect(
      pastePlainText(editor, "https://example.com/assets/theme.ogg"),
    ).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("audio");
    expect(editor.getHTML()).toContain('src="https://example.com/assets/theme.ogg"');
  });

  it("embeds youtube videos from commands and pasted urls", () => {
    const editor = createEditor([Youtube]);

    expect(
      editor.commands.setYoutubeVideo({
        src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        width: 800,
        height: 450,
        start: 42,
      }),
    ).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("youtube");
    expect(editor.getHTML()).toContain("data-youtube-video");
    expect(editor.getHTML()).toContain("youtube.com/embed/dQw4w9WgXcQ");
    expect(editor.getHTML()).toContain('width="800"');
    expect(editor.getHTML()).toContain('height="450"');

    expect(editor.commands.setContent("<p></p>")).toBe(true);
    editor.commands.setTextSelection(1);

    expect(
      pastePlainText(editor, "https://youtu.be/dQw4w9WgXcQ"),
    ).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("youtube");
    expect(editor.getHTML()).toContain("youtube.com/embed/dQw4w9WgXcQ");
  });

  it("embeds twitch videos from commands and pasted urls", () => {
    const editor = createEditor([
      Twitch.configure({
        parent: "example.com",
      }),
    ]);

    expect(
      editor.commands.setTwitchVideo({
        src: "https://www.twitch.tv/videos/1234567890",
        muted: true,
        time: "1h2m3s",
      }),
    ).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("twitch");
    expect(editor.getHTML()).toContain("data-twitch-video");
    expect(editor.getHTML()).toContain("player.twitch.tv");
    expect(editor.getHTML()).toContain("video=1234567890");
    expect(editor.getHTML()).toContain("parent=example.com");
    expect(editor.getHTML()).toContain("time=1h2m3s");

    expect(editor.commands.setContent("<p></p>")).toBe(true);
    editor.commands.setTextSelection(1);

    expect(
      pastePlainText(editor, "https://clips.twitch.tv/FairTolerantLemurHeyGuys"),
    ).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("twitch");
    expect(editor.getHTML()).toContain("clips.twitch.tv/embed");
    expect(editor.getHTML()).toContain("FairTolerantLemurHeyGuys");
  });
});
