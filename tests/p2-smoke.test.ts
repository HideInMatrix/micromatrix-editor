import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@mxm-editor/core";
import {
  Collaboration,
} from "@mxm-editor/extension-collaboration";
import {
  CollaborationCaret,
  type CollaborationCaretStorage,
} from "@mxm-editor/extension-collaboration-caret";
import { Color } from "@mxm-editor/extension-color";
import { Focus } from "@mxm-editor/extension-focus";
import { Highlight } from "@mxm-editor/extension-highlight";
import { Subscript } from "@mxm-editor/extension-subscript";
import { Superscript } from "@mxm-editor/extension-superscript";
import { TextStyle } from "@mxm-editor/extension-text-style";
import { TrailingNode } from "@mxm-editor/extension-trailing-node";
import { StarterKit } from "@mxm-editor/starter-kit";
import { applyAwarenessUpdate, Awareness, encodeAwarenessUpdate } from "y-protocols/awareness";
import { applyUpdate, Doc } from "yjs";

afterEach(() => {
  document.body.innerHTML = "";
});

function bridgeDocs(left: Doc, right: Doc) {
  left.on("update", (update, origin) => {
    if (origin === "bridge:right") {
      return;
    }

    applyUpdate(right, update, "bridge:left");
  });
  right.on("update", (update, origin) => {
    if (origin === "bridge:left") {
      return;
    }

    applyUpdate(left, update, "bridge:right");
  });
}

function bridgeAwareness(left: Awareness, right: Awareness) {
  left.on("update", ({ added, updated, removed }, origin) => {
    if (origin === "bridge:right") {
      return;
    }

    applyAwarenessUpdate(
      right,
      encodeAwarenessUpdate(left, [...added, ...updated, ...removed]),
      "bridge:left",
    );
  });
  right.on("update", ({ added, updated, removed }, origin) => {
    if (origin === "bridge:left") {
      return;
    }

    applyAwarenessUpdate(
      left,
      encodeAwarenessUpdate(right, [...added, ...updated, ...removed]),
      "bridge:right",
    );
  });
}

describe("P2 smoke", () => {
  it("supports highlight and color commands", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        TextStyle,
        Color,
        Highlight.configure({
          multicolor: true,
        }),
      ],
      content: "<p>hello world</p>",
    });

    editor.commands.setTextSelection({ from: 1, to: 6 });

    expect(editor.commands.toggleHighlight()).toBe(true);
    expect(editor.isActive("highlight")).toBe(true);
    expect(editor.getHTML()).toContain("<mark");

    expect(editor.commands.setColor("#ff5a36")).toBe(true);
    expect(editor.getAttributes("textStyle").color).toBe("#ff5a36");
    expect(editor.isActive({ color: "#ff5a36" })).toBe(true);

    expect(editor.commands.unsetColor()).toBe(true);
    expect(editor.getHTML()).not.toContain('style="color:');
  });

  it("tracks collaboration caret users across bridged awareness instances", () => {
    const leftElement = document.createElement("div");
    const rightElement = document.createElement("div");
    const leftDoc = new Doc();
    const rightDoc = new Doc();
    const leftAwareness = new Awareness(leftDoc);
    const rightAwareness = new Awareness(rightDoc);

    document.body.append(leftElement, rightElement);
    bridgeDocs(leftDoc, rightDoc);
    bridgeAwareness(leftAwareness, rightAwareness);

    const leftEditor = new Editor({
      element: leftElement,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        Collaboration.configure({
          document: leftDoc,
          field: "playground",
        }),
        CollaborationCaret.configure({
          awareness: leftAwareness,
          user: {
            name: "Left",
            color: "#ff5a36",
          },
        }),
      ],
      content: "<p></p>",
    });
    const rightEditor = new Editor({
      element: rightElement,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        Collaboration.configure({
          document: rightDoc,
          field: "playground",
        }),
        CollaborationCaret.configure({
          awareness: rightAwareness,
          user: {
            name: "Right",
            color: "#2f7cf6",
          },
        }),
      ],
      content: "<p></p>",
    });
    const rightStorage = rightEditor.storage.collaborationCaret as
      | CollaborationCaretStorage
      | undefined;

    leftEditor.commands.updateUser({
      name: "Lin",
      color: "#112233",
    });

    expect(rightStorage?.users.some((user) => user.name === "Lin")).toBe(true);
    expect(rightStorage?.users.some((user) => user.name === "Right")).toBe(true);
  });

  it("supports subscript and superscript commands without overlapping marks", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        Subscript,
        Superscript,
      ],
      content: "<p>hello</p>",
    });

    editor.commands.setTextSelection({ from: 1, to: 6 });

    expect(editor.commands.toggleSubscript()).toBe(true);
    expect(editor.isActive("subscript")).toBe(true);
    expect(editor.getHTML()).toContain("<sub>hello</sub>");

    expect(editor.commands.toggleSuperscript()).toBe(true);
    expect(editor.isActive("superscript")).toBe(true);
    expect(editor.isActive("subscript")).toBe(false);
    expect(editor.getHTML()).toContain("<sup>hello</sup>");
    expect(editor.getHTML()).not.toContain("<sub>");
  });

  it("applies focus decorations to the deepest selected node", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        Focus.configure({
          mode: "deepest",
        }),
      ],
      content: "<blockquote><p>hello</p></blockquote>",
    });

    editor.commands.setTextSelection({ from: 3, to: 5 });

    expect(element.querySelector("p.has-focus")).not.toBeNull();
    expect(element.querySelector("blockquote.has-focus")).toBeNull();
  });

  it("appends a trailing paragraph after disallowed trailing nodes", () => {
    const element = document.createElement("div");

    document.body.appendChild(element);

    const editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        TrailingNode,
      ],
      content: "<p>start</p>",
    });

    expect(editor.commands.setContent("<blockquote><p>quote</p></blockquote>")).toBe(true);

    expect(editor.getJSON().content).toEqual([
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "quote",
              },
            ],
          },
        ],
      },
      {
        type: "paragraph",
      },
    ]);
  });
});
