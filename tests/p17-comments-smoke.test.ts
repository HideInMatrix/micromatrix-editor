import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@mxm-editor/core";
import {
  CommentsKit,
  createInMemoryCommentsProvider,
  findThreadsInDocument,
  subscribeToThreads,
  type CommentsStorage,
} from "@mxm-editor/extension-comments";
import { StarterKit } from "@mxm-editor/starter-kit";

afterEach(() => {
  document.body.innerHTML = "";
});

function createEditor(
  options: {
    onClickThread?: (id: string | null) => void;
    deleteUnreferencedThreads?: boolean;
    provider?: ReturnType<typeof createInMemoryCommentsProvider>;
  } = {},
  content = "<p>Hello world</p>",
) {
  const element = document.createElement("div");

  document.body.appendChild(element);

  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      CommentsKit.configure({
        onClickThread: options.onClickThread,
        deleteUnreferencedThreads: options.deleteUnreferencedThreads ?? true,
        provider: options.provider ?? null,
      }),
    ],
    content,
  });

  return {
    editor,
    element,
  };
}

function findTextRange(editor: Editor, text: string) {
  let range: { from: number; to: number } | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return true;
    }

    const index = node.text.indexOf(text);

    if (index === -1) {
      return true;
    }

    range = {
      from: pos + index,
      to: pos + index + text.length,
    };

    return false;
  });

  if (!range) {
    throw new Error(`Unable to find range for "${text}".`);
  }

  return range;
}

describe("P17 comments smoke", () => {
  it("creates comment threads, updates comments, and applies selected and hovered decorations", () => {
    const { editor, element } = createEditor();
    const storage = editor.storage.comments as CommentsStorage;
    const helloRange = findTextRange(editor, "Hello");

    editor.commands.setTextSelection(helloRange);

    expect(
      editor.commands.setThread({
        id: "thread-hello",
        content: "First note",
        data: {
          tone: "primary",
        },
        commentData: {
          user: "ava",
        },
      }),
    ).toBe(true);

    expect(storage.threads).toHaveLength(1);
    expect(storage.threads[0]?.id).toBe("thread-hello");
    expect(storage.threads[0]?.data).toEqual({
      tone: "primary",
    });
    expect(storage.threads[0]?.comments).toHaveLength(1);
    expect(storage.threads[0]?.comments[0]?.content).toBe("First note");
    expect(editor.getHTML()).toContain('data-thread-ids="thread-hello"');
    expect(element.querySelector(".tiptap-thread--unresolved")).not.toBeNull();

    expect(
      editor.commands.createComment({
        threadId: "thread-hello",
        id: "comment-2",
        content: "Follow up",
      }),
    ).toBe(true);
    expect(
      editor.commands.updateComment({
        threadId: "thread-hello",
        id: "comment-2",
        content: "Follow up updated",
        data: {
          status: "edited",
        },
      }),
    ).toBe(true);

    expect(storage.getThread("thread-hello")?.comments).toHaveLength(2);
    expect(
      storage.getThread("thread-hello")?.comments.at(-1),
    ).toMatchObject({
      id: "comment-2",
      content: "Follow up updated",
      data: {
        status: "edited",
      },
    });

    expect(
      editor.commands.selectThread({
        id: "thread-hello",
        selectAround: true,
      }),
    ).toBe(true);
    expect(storage.selectedThreadId).toBe("thread-hello");
    expect(element.querySelector(".tiptap-thread--selected")).not.toBeNull();

    expect(
      editor.commands.setMeta("threadMouseOver", "thread-hello"),
    ).toBe(true);
    expect(storage.hoveredThreadId).toBe("thread-hello");
    expect(element.querySelector(".tiptap-thread--hovered")).not.toBeNull();

    expect(editor.commands.resolveThread({ id: "thread-hello" })).toBe(true);
    expect(storage.getThread("thread-hello")?.resolved).toBe(true);
    expect(element.querySelector(".tiptap-thread--resolved")).not.toBeNull();

    expect(editor.commands.removeComment({
      threadId: "thread-hello",
      id: "comment-2",
    })).toBe(true);
    expect(storage.getThread("thread-hello")?.comments).toHaveLength(1);

    expect(editor.commands.unselectThread()).toBe(true);
    expect(storage.selectedThreadId).toBeNull();

    expect(editor.commands.setMeta("threadMouseOut", true)).toBe(true);
    expect(storage.hoveredThreadId).toBeNull();
  });

  it("supports overlapping threads, provider subscriptions, and archived thread retention", () => {
    const provider = createInMemoryCommentsProvider();
    const onClickThread = vi.fn();
    const observedSnapshots: string[] = [];
    const unsubscribe = subscribeToThreads({
      provider,
      callback: (threads) => {
        observedSnapshots.push(
          threads
            .map((thread) => thread.id)
            .sort()
            .join(","),
        );
      },
      getThreadsOptions: {
        types: ["archived", "unarchived"],
      },
    });
    const { editor } = createEditor({
      provider,
      onClickThread,
      deleteUnreferencedThreads: false,
    });
    const helloRange = findTextRange(editor, "Hello");
    const overlapRange = findTextRange(editor, "ello wor");
    const storage = editor.storage.comments as CommentsStorage;

    editor.commands.setTextSelection(helloRange);
    expect(
      editor.commands.setThread({
        id: "thread-a",
        content: "Alpha",
      }),
    ).toBe(true);

    editor.commands.setTextSelection(overlapRange);
    expect(
      editor.commands.setThread({
        id: "thread-b",
        content: "Beta",
      }),
    ).toBe(true);

    const foundThreads = findThreadsInDocument(editor);

    expect(foundThreads.some((thread) => thread.id === "thread-a")).toBe(true);
    expect(foundThreads.some((thread) => thread.id === "thread-b")).toBe(true);
    expect(provider.getThreads()).toHaveLength(2);

    expect(
      editor.commands.selectThread({
        id: "thread-b",
        triggerClick: true,
      }),
    ).toBe(true);
    expect(onClickThread).toHaveBeenCalledWith("thread-b");
    expect(storage.selectedThreadId).toBe("thread-b");

    expect(
      editor.commands.removeThread({
        id: "thread-a",
      }),
    ).toBe(true);

    expect(provider.getThreads()).toHaveLength(1);
    expect(provider.getThread("thread-a")?.archived).toBe(true);
    expect(
      provider.getThreads({
        types: ["archived"],
      }),
    ).toHaveLength(1);
    expect(observedSnapshots.some((snapshot) => snapshot.includes("thread-a"))).toBe(true);

    unsubscribe();
  });
});
