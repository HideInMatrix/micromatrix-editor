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

  return threadAuthor ?? commentAuthor ?? "审阅者";
}

function getThreadQuote(thread: CommentsThread) {
  return typeof thread.data?.quote === "string"
    ? thread.data.quote
    : "暂无摘录";
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
    "这句话已经很接近核心价值了，能不能把用户收益再说得更明确一点？",
  );
  const [replyDraft, setReplyDraft] = useState(
    "这个示例里先保留当前写法，但要把重叠锚点的行为说清楚。",
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
        label: selectedText.slice(0, 42) || "新讨论串",
        quote: selectedText,
      },
      commentData: {
        author: "Mika",
        role: "设计评审",
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
        role: "产品",
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
      "这句话已经很接近核心价值了，能不能把用户收益再说得更明确一点？",
    );
    setReplyDraft(
      "这个示例里先保留当前写法，但要把重叠锚点的行为说清楚。",
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
              <div className="panel-eyebrow">评论</div>
              <h2>支持重叠锚点的行内审阅讨论</h2>
              <p>
                选中文本创建讨论串，侧栏直接回复、标记解决或归档。文档里的高亮与右侧讨论面板保持双向联动。
              </p>
            </div>
            <div className="comments-stat-strip">
              <span>{activeThreads.filter((thread) => !thread.resolved).length} 个未解决</span>
              <span>{activeThreads.filter((thread) => thread.resolved).length} 个已解决</span>
              <button
                className="comments-ghost-button"
                onClick={resetDemo}
                type="button"
              >
                <RotateCcw size={15} strokeWidth={2} />
                <span>重置演示</span>
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
                : "先在正文里选一段文字，再创建讨论串"}
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
                <div className="panel-eyebrow">选区发起</div>
                <h3>新建讨论串</h3>
              </div>
            </div>

            <div className="comments-selection-quote">
              {editorMeta.hasSelection
                ? `“${editorMeta.selectedText.trim()}”`
                : "在编辑器中选中文本后，就可以为这段内容发起新讨论。"}
            </div>

            <textarea
              className="comments-textarea"
              onChange={(event) => setNewThreadDraft(event.target.value)}
              placeholder="为这段选区写下第一条评论..."
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
              <span>创建讨论串</span>
            </button>
          </section>

          <section className="ui-shell comments-panel border border-[var(--panel-border)]">
            <div className="comments-panel__header">
              <div>
                <div className="panel-eyebrow">讨论列表</div>
                <h3>实时讨论概览</h3>
              </div>
              <span className="comments-panel__meta">
                {activeThreads.length} 个进行中
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
                      {thread.resolved ? "已解决" : "未解决"}
                    </span>
                  </div>
                  <p>{getThreadQuote(thread)}</p>
                  <div className="comments-thread-card__meta">
                    <span>{getThreadAuthor(thread)}</span>
                    <span>{thread.comments.length} 条评论</span>
                  </div>
                </button>
              ))}

              {!activeThreads.length && (
                <div className="comments-empty-state">
                  还没有进行中的讨论。
                </div>
              )}
            </div>

            {archivedThreads.length > 0 && (
              <div className="comments-archived-list">
                <div className="comments-archived-list__title">
                  已归档
                </div>
                {archivedThreads.map((thread) => (
                  <div key={thread.id} className="comments-archived-item">
                    <strong>{thread.data?.label ?? thread.id}</strong>
                    <span>{thread.comments.length} 条评论</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="ui-shell comments-panel border border-[var(--panel-border)]">
            <div className="comments-panel__header">
              <div>
                <div className="panel-eyebrow">当前讨论</div>
                <h3>{selectedThread?.data?.label ?? "查看讨论详情"}</h3>
              </div>
              {selectedThread && (
                <span className="comments-panel__meta">
                  {selectedThreadOccurrences} 个锚点
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
                    {selectedThread.resolved ? "已解决" : "未解决"}
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
                  placeholder="回复当前讨论..."
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
                    <span>回复</span>
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
                      {selectedThread.resolved ? "重新打开" : "标记已解决"}
                    </span>
                  </button>

                  <button
                    className="comments-secondary-button"
                    onClick={() => editor.commands.removeThread({ id: selectedThread.id })}
                    type="button"
                  >
                    <Archive size={16} strokeWidth={2} />
                    <span>归档</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="comments-empty-state comments-empty-state--detail">
                点击正文中的高亮范围，或从列表里选择一个讨论，即可查看详细内容。
              </div>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
