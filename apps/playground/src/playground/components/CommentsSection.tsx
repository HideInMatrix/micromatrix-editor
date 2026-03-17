import { useEffect, useState } from "react";
import {
  CommentsKit,
  createInMemoryCommentsProvider,
  findThreadsInDocument,
  subscribeToThreads,
  type CommentsStorage,
  type CommentsThread,
} from "@mxm-editor/extension-comments";
import {
  Archive,
  CheckCheck,
  MessageCircleReply,
  MessageSquarePlus,
  RotateCcw,
  RotateCw,
  Sparkles,
} from "lucide-react";
import {
  EditorContent,
  useEditor,
  useEditorState,
} from "@mxm-editor/react";
import {
  commentsDemoContent,
  commentsDemoThreads,
} from "../constants";
import { createPlaygroundExtensions } from "../extensions";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getThreadAuthor(thread: CommentsThread) {
  const threadAuthor =
    typeof thread.data?.author === "string"
      ? thread.data.author
      : null;
  const commentAuthor = thread.comments.find(
    (comment) => typeof comment.data?.author === "string",
  )?.data?.author;

  return threadAuthor ?? commentAuthor ?? "Reviewer";
}

function getThreadQuote(thread: CommentsThread) {
  return typeof thread.data?.quote === "string"
    ? thread.data.quote
    : "No quote stored";
}

function useCommentsThreads(
  provider: ReturnType<typeof createInMemoryCommentsProvider>,
) {
  const [threads, setThreads] = useState(() =>
    provider.getThreads({
      types: ["archived", "unarchived"],
    }),
  );

  useEffect(() => {
    return subscribeToThreads({
      provider,
      callback: (nextThreads) => {
        const nextSnapshot = JSON.stringify(nextThreads);

        setThreads((currentThreads) =>
          JSON.stringify(currentThreads) === nextSnapshot
            ? currentThreads
            : nextThreads,
        );
      },
      getThreadsOptions: {
        types: ["archived", "unarchived"],
      },
    });
  }, [provider]);

  return threads;
}

function resetCommentsProvider(
  provider: ReturnType<typeof createInMemoryCommentsProvider>,
) {
  provider.getThreads({
    types: ["archived", "unarchived"],
  }).forEach((thread) => {
    provider.deleteThread(thread.id);
  });

  commentsDemoThreads.forEach((thread) => {
    provider.setThread(thread);
  });
}

export function CommentsSection() {
  const [provider] = useState(() =>
    createInMemoryCommentsProvider(commentsDemoThreads),
  );
  const [newThreadDraft, setNewThreadDraft] = useState(
    "This is a great anchor point. Can we make the user outcome even more explicit?",
  );
  const [replyDraft, setReplyDraft] = useState(
    "Let's keep this as-is for the demo, but call out the overlap behavior.",
  );
  const editor = useEditor({
    extensions: [
      ...createPlaygroundExtensions({
        interactive: false,
      }),
      CommentsKit.configure({
        provider,
        deleteUnreferencedThreads: false,
      }),
    ],
    autofocus: true,
    content: commentsDemoContent,
  });
  const threads = useCommentsThreads(provider);
  const editorMeta = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const storage = currentEditor?.storage.comments as
        | CommentsStorage
        | undefined;
      const selection = currentEditor?.state.selection;
      const hasSelection = Boolean(selection && !selection.empty);
      const selectedText =
        currentEditor && selection && !selection.empty
          ? currentEditor.state.doc.textBetween(selection.from, selection.to, " ")
          : "";

      return {
        hasSelection,
        hoveredThreadId: storage?.hoveredThreadId ?? null,
        selectedText,
        selectedThreadId: storage?.selectedThreadId ?? null,
      };
    },
  });

  useEffect(() => {
    if (!editor || editorMeta.selectedThreadId || !threads.length) {
      return;
    }

    const firstActiveThread = threads.find((thread) => !thread.archived) ?? threads[0];

    if (!firstActiveThread) {
      return;
    }

    editor.commands.selectThread({
      id: firstActiveThread.id,
      focus: false,
      updateSelection: false,
    });
  }, [editor, editorMeta.selectedThreadId, threads]);

  if (!editor) {
    return null;
  }

  const activeThreads = threads.filter((thread) => !thread.archived);
  const archivedThreads = threads.filter((thread) => thread.archived);
  const selectedThread = threads.find(
    (thread) => thread.id === editorMeta.selectedThreadId,
  ) ?? null;
  const selectedThreadOccurrences = selectedThread
    ? findThreadsInDocument(editor).filter(
        (thread) => thread.id === selectedThread.id,
      ).length
    : 0;

  const createThread = () => {
    const draft = newThreadDraft.trim();

    if (!draft || !editorMeta.hasSelection) {
      return;
    }

    const selectedText = editorMeta.selectedText.trim();

    if (!editor.commands.setThread({
      content: draft,
      data: {
        author: "Mika",
        label: selectedText.slice(0, 42) || "New thread",
        quote: selectedText,
      },
      commentData: {
        author: "Mika",
        role: "Design Review",
      },
    })) {
      return;
    }

    setNewThreadDraft("");
  };

  const replyToThread = () => {
    const draft = replyDraft.trim();

    if (!selectedThread || !draft) {
      return;
    }

    if (!editor.commands.createComment({
      threadId: selectedThread.id,
      content: draft,
      data: {
        author: "Noah",
        role: "Product",
      },
    })) {
      return;
    }

    setReplyDraft("");
  };

  const resetDemo = () => {
    resetCommentsProvider(provider);
    editor.commands.setContent(commentsDemoContent);
    setNewThreadDraft(
      "This is a great anchor point. Can we make the user outcome even more explicit?",
    );
    setReplyDraft(
      "Let's keep this as-is for the demo, but call out the overlap behavior.",
    );

    queueMicrotask(() => {
      editor.commands.selectThread({
        id: commentsDemoThreads[0]?.id,
        focus: false,
        updateSelection: false,
      });
    });
  };

  const openThread = (threadId: string) => {
    editor.commands.selectThread({
      id: threadId,
      focus: true,
      selectAround: true,
    });
  };

  const setHoveredThread = (threadId: string | null) => {
    if (threadId) {
      editor.commands.setMeta("threadMouseOver", threadId);
      return;
    }

    editor.commands.setMeta("threadMouseOut", true);
  };

  return (
    <section className="comments-demo">
      <div className="comments-demo__grid">
        <div className="ui-shell comments-editor-card border border-[var(--panel-border)]">
          <div className="comments-card__header">
            <div>
              <div className="panel-eyebrow">Comments</div>
              <h2>Inline review threads with overlapping anchors</h2>
              <p>
                选中文本创建 thread，侧栏直接回复、resolve 或归档。文档里的高亮和右侧线程面板保持双向联动。
              </p>
            </div>
            <div className="comments-stat-strip">
              <span>{activeThreads.filter((thread) => !thread.resolved).length} open</span>
              <span>{activeThreads.filter((thread) => thread.resolved).length} resolved</span>
              <button
                className="comments-ghost-button"
                onClick={resetDemo}
                type="button"
              >
                <RotateCcw size={15} strokeWidth={2} />
                <span>Reset demo</span>
              </button>
            </div>
          </div>

          <div className="comments-editor-note">
            <Sparkles size={16} strokeWidth={2} />
            <span>
              当前选区:
              {" "}
              {editorMeta.hasSelection
                ? `“${editorMeta.selectedText.trim()}”`
                : "先在正文里选一段文字，再创建 thread"}
            </span>
          </div>

          <EditorContent
            className="editor-surface comments-editor-surface min-h-0 flex-1"
            editor={editor}
          />
        </div>

        <aside className="comments-sidebar">
          <section className="ui-shell comments-panel border border-[var(--panel-border)]">
            <div className="comments-panel__header">
              <div>
                <div className="panel-eyebrow">Selection Composer</div>
                <h3>Start a new thread</h3>
              </div>
            </div>

            <div className="comments-selection-quote">
              {editorMeta.hasSelection
                ? `“${editorMeta.selectedText.trim()}”`
                : "Select text in the editor to create a new discussion thread."}
            </div>

            <textarea
              className="comments-textarea"
              onChange={(event) => setNewThreadDraft(event.target.value)}
              placeholder="Write the opening note for this selection..."
              rows={4}
              value={newThreadDraft}
            />

            <button
              className="comments-primary-button"
              disabled={!editorMeta.hasSelection || !newThreadDraft.trim()}
              onClick={createThread}
              type="button"
            >
              <MessageSquarePlus size={16} strokeWidth={2} />
              <span>Create thread</span>
            </button>
          </section>

          <section className="ui-shell comments-panel border border-[var(--panel-border)]">
            <div className="comments-panel__header">
              <div>
                <div className="panel-eyebrow">Thread List</div>
                <h3>Live discussion map</h3>
              </div>
              <span className="comments-panel__meta">
                {activeThreads.length} active
              </span>
            </div>

            <div className="comments-thread-list">
              {activeThreads.map((thread) => (
                <button
                  key={thread.id}
                  className={`comments-thread-card${
                    thread.id === editorMeta.selectedThreadId ? " is-active" : ""
                  }${
                    thread.id === editorMeta.hoveredThreadId ? " is-hovered" : ""
                  }`}
                  onClick={() => openThread(thread.id)}
                  onMouseEnter={() => setHoveredThread(thread.id)}
                  onMouseLeave={() => setHoveredThread(null)}
                  type="button"
                >
                  <div className="comments-thread-card__top">
                    <strong>{thread.data?.label ?? getThreadQuote(thread)}</strong>
                    <span className={`comments-status-chip${
                      thread.resolved ? " is-resolved" : " is-open"
                    }`}
                    >
                      {thread.resolved ? "Resolved" : "Open"}
                    </span>
                  </div>
                  <p>{getThreadQuote(thread)}</p>
                  <div className="comments-thread-card__meta">
                    <span>{getThreadAuthor(thread)}</span>
                    <span>{thread.comments.length} comments</span>
                  </div>
                </button>
              ))}

              {!activeThreads.length && (
                <div className="comments-empty-state">
                  No active threads yet.
                </div>
              )}
            </div>

            {archivedThreads.length > 0 && (
              <div className="comments-archived-list">
                <div className="comments-archived-list__title">
                  Archived
                </div>
                {archivedThreads.map((thread) => (
                  <div key={thread.id} className="comments-archived-item">
                    <strong>{thread.data?.label ?? thread.id}</strong>
                    <span>{thread.comments.length} comments</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="ui-shell comments-panel border border-[var(--panel-border)]">
            <div className="comments-panel__header">
              <div>
                <div className="panel-eyebrow">Selected Thread</div>
                <h3>{selectedThread?.data?.label ?? "Inspect discussion state"}</h3>
              </div>
              {selectedThread && (
                <span className="comments-panel__meta">
                  {selectedThreadOccurrences} anchor
                  {selectedThreadOccurrences === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {selectedThread ? (
              <div className="comments-thread-detail">
                <div className="comments-thread-detail__summary">
                  <span className={`comments-status-chip${
                    selectedThread.resolved ? " is-resolved" : " is-open"
                  }`}
                  >
                    {selectedThread.resolved ? "Resolved" : "Open"}
                  </span>
                  <span>{formatTimestamp(selectedThread.updatedAt)}</span>
                </div>

                <div className="comments-selection-quote">
                  {getThreadQuote(selectedThread)}
                </div>

                <div className="comments-comment-list">
                  {selectedThread.comments.map((comment) => (
                    <article key={comment.id} className="comments-comment-card">
                      <div className="comments-comment-card__top">
                        <strong>
                          {typeof comment.data?.author === "string"
                            ? comment.data.author
                            : getThreadAuthor(selectedThread)}
                        </strong>
                        <span>{formatTimestamp(comment.updatedAt)}</span>
                      </div>
                      <p>{String(comment.content ?? "")}</p>
                    </article>
                  ))}
                </div>

                <textarea
                  className="comments-textarea"
                  onChange={(event) => setReplyDraft(event.target.value)}
                  placeholder="Reply to the selected thread..."
                  rows={3}
                  value={replyDraft}
                />

                <div className="comments-action-row">
                  <button
                    className="comments-primary-button"
                    disabled={!replyDraft.trim()}
                    onClick={replyToThread}
                    type="button"
                  >
                    <MessageCircleReply size={16} strokeWidth={2} />
                    <span>Reply</span>
                  </button>

                  <button
                    className="comments-secondary-button"
                    onClick={() =>
                      selectedThread.resolved
                        ? editor.commands.unresolveThread({ id: selectedThread.id })
                        : editor.commands.resolveThread({ id: selectedThread.id })
                    }
                    type="button"
                  >
                    {selectedThread.resolved ? (
                      <RotateCw size={16} strokeWidth={2} />
                    ) : (
                      <CheckCheck size={16} strokeWidth={2} />
                    )}
                    <span>
                      {selectedThread.resolved ? "Reopen" : "Resolve"}
                    </span>
                  </button>

                  <button
                    className="comments-secondary-button"
                    onClick={() => editor.commands.removeThread({ id: selectedThread.id })}
                    type="button"
                  >
                    <Archive size={16} strokeWidth={2} />
                    <span>Archive</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="comments-empty-state comments-empty-state--detail">
                Click a highlighted range or choose a thread from the list to inspect its discussion.
              </div>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
