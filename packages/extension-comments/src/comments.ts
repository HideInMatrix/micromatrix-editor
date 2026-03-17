import type { CommandProps } from "@mxm-editor/core";
import { Extension } from "@mxm-editor/core";
import {
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
} from "@mxm-editor/pm";
import { createDefaultCommentsOptions } from "./defaults";
import {
  chooseThreadId,
  collectInlineThreadSegments,
  collectReferencedThreadIds,
  findFirstThreadOccurrence,
  getThreadIdsAtPos,
  hasMarkableContentInRange,
  refreshCommentsStorage,
  resolveThreadClasses,
  resolveThreadIdFromSelection,
  syncThreadReferences,
  updateInlineThreadMarks,
  updateSelectionForThread,
} from "./helpers";
import {
  createCommentsID,
  createCommentsTimestamp,
  resolveCommentsProvider,
  subscribeToThreads,
} from "./providers";
import type {
  CommentsOptions,
  CommentsStorage,
  CreateCommentOptions,
  RemoveCommentOptions,
  RemoveThreadOptions,
  ResolveThreadOptions,
  SelectThreadOptions,
  SetThreadOptions,
  UpdateCommentOptions,
  UpdateThreadOptions,
} from "./types";

interface CommentsPluginState {
  selectedThreadId: string | null;
  hoveredThreadId: string | null;
}

const commentsSkipCleanupMeta = "commentsSkipCleanup";

export const commentsPluginKey = new PluginKey<CommentsPluginState>("comments");

function getProvider(storage: CommentsStorage) {
  if (!storage.provider) {
    throw new Error("Comments provider is not available.");
  }

  return storage.provider;
}

function refreshCommentsContext(storage: CommentsStorage) {
  refreshCommentsStorage(storage);
}

function createThreadId(storage: CommentsStorage) {
  const provider = getProvider(storage);

  for (let attempts = 0; attempts < 100; attempts += 1) {
    const threadId = createCommentsID("mxm-thread");

    if (!provider.getThread(threadId)) {
      return threadId;
    }
  }

  return createCommentsID("mxm-thread");
}

function createCommentId(thread: { comments: Array<{ id: string }> }) {
  const seen = new Set(thread.comments.map((comment) => comment.id));

  for (let attempts = 0; attempts < 100; attempts += 1) {
    const commentId = createCommentsID("mxm-comment");

    if (!seen.has(commentId)) {
      return commentId;
    }
  }

  return createCommentsID("mxm-comment");
}

function createInitialStorage(options: CommentsOptions): CommentsStorage {
  const provider = resolveCommentsProvider({
    provider: options.provider,
    document: options.document,
    field: options.field,
  });

  return {
    provider,
    threads: provider.getThreads(),
    selectedThreadId: null,
    hoveredThreadId: null,
    unsubscribe: null,
    getThreads: (getThreadsOptions) => provider.getThreads(getThreadsOptions),
    getThread: (id) => provider.getThread(id),
    subscribe: (callback, getThreadsOptions) =>
      subscribeToThreads({
        provider,
        callback,
        getThreadsOptions,
      }),
  };
}

function updatePluginState(
  tr: CommandProps["tr"],
  currentState: CommentsPluginState | null | undefined,
  patch: Partial<CommentsPluginState>,
) {
  const nextState = currentState ?? {
    selectedThreadId: null,
    hoveredThreadId: null,
  };

  tr.setMeta(commentsPluginKey, {
    ...nextState,
    ...patch,
  } satisfies CommentsPluginState);
}

function getMarkType(props: Pick<CommandProps, "state">, markTypeName: string) {
  return props.state.schema.marks[markTypeName];
}

function withUpdatedThread(
  storage: CommentsStorage,
  threadId: string,
  update: (
    thread: NonNullable<ReturnType<CommentsStorage["getThread"]>>,
  ) => boolean | void,
) {
  const provider = getProvider(storage);
  const thread = provider.getThread(threadId);

  if (!thread) {
    return false;
  }

  const shouldPersist = update(thread);

  if (shouldPersist === false) {
    return false;
  }

  provider.setThread(thread);
  refreshCommentsContext(storage);
  return true;
}

export const Comments = Extension.create<CommentsOptions, CommentsStorage>({
  name: "comments",

  addOptions() {
    return createDefaultCommentsOptions();
  },

  addStorage() {
    return createInitialStorage(this.options);
  },

  onCreate() {
    const syncPluginState = () => {
      const pluginState = commentsPluginKey.getState(this.editor.state);

      this.storage.selectedThreadId = pluginState?.selectedThreadId ?? null;
      this.storage.hoveredThreadId = pluginState?.hoveredThreadId ?? null;
    };

    this.storage.unsubscribe = subscribeToThreads({
      provider: this.storage.provider,
      callback: (threads) => {
        this.storage.threads = threads;
      },
    });

    refreshCommentsContext(this.storage);
    syncPluginState();
  },

  onUpdate({ transaction }) {
    const provider = this.storage.provider;
    const markType = this.editor.schema.marks[this.options.markTypeName];
    const pluginState = commentsPluginKey.getState(this.editor.state);

    this.storage.selectedThreadId = pluginState?.selectedThreadId ?? null;
    this.storage.hoveredThreadId = pluginState?.hoveredThreadId ?? null;

    if (!provider || !markType || !transaction.docChanged) {
      return;
    }

    const ignoredThreadIds = new Set<string>(
      (transaction.getMeta(commentsSkipCleanupMeta) as string[] | undefined) ?? [],
    );

    syncThreadReferences({
      provider,
      threads: provider.getThreads({
        types: ["archived", "unarchived"],
      }),
      referencedThreadIds: collectReferencedThreadIds(this.editor.state.doc, markType),
      deleteUnreferencedThreads: this.options.deleteUnreferencedThreads,
      ignoredThreadIds,
    });

    refreshCommentsContext(this.storage);
  },

  onDestroy() {
    this.storage.unsubscribe?.();
    this.storage.unsubscribe = null;
  },

  addCommands() {
    return {
      setThread:
        (options: SetThreadOptions = {}) =>
        ({ state, tr, dispatch }) => {
          const markType = getMarkType({ state }, this.options.markTypeName);

          if (!markType || state.selection.empty) {
            return false;
          }

          if (
            !hasMarkableContentInRange(
              state.doc,
              markType,
              state.selection.from,
              state.selection.to,
            )
          ) {
            return false;
          }

          const provider = getProvider(this.storage);
          const threadId = options.id ?? createThreadId(this.storage);

          if (provider.getThread(threadId)) {
            return false;
          }

          const updatedSegments = updateInlineThreadMarks({
            tr,
            markType,
            from: state.selection.from,
            to: state.selection.to,
            transform: (threadIds) => [...threadIds, threadId],
          });

          if (!updatedSegments) {
            return false;
          }

          if (dispatch) {
            const threadCreatedAt = createCommentsTimestamp(options.createdAt);
            const initialComments =
              options.content === undefined
                ? []
                : [
                    {
                      id: options.commentId ?? createCommentsID("mxm-comment"),
                      content: options.content,
                      data: options.commentData ?? null,
                      createdAt: createCommentsTimestamp(options.commentCreatedAt),
                      updatedAt: createCommentsTimestamp(options.commentCreatedAt),
                    },
                  ];

            provider.setThread({
              id: threadId,
              data: options.data ?? null,
              resolved: false,
              archived: false,
              createdAt: threadCreatedAt,
              updatedAt: threadCreatedAt,
              comments: initialComments,
            });
            refreshCommentsContext(this.storage);
            updatePluginState(
              tr,
              commentsPluginKey.getState(state),
              {
                selectedThreadId: threadId,
              },
            );
          }

          return true;
        },
      removeThread:
        (options: RemoveThreadOptions = {}) =>
        ({ state, tr, dispatch }) => {
          const markType = getMarkType({ state }, this.options.markTypeName);
          const threadId = markType
            ? options.id
              ?? resolveThreadIdFromSelection({
                state,
                markType,
                selectedThreadId: this.storage.selectedThreadId,
              })
            : options.id ?? null;

          if (!markType || !threadId) {
            return false;
          }

          const provider = getProvider(this.storage);
          const thread = provider.getThread(threadId);
          const updatedSegments = updateInlineThreadMarks({
            tr,
            markType,
            from: 0,
            to: state.doc.content.size,
            transform: (threadIds) => threadIds.filter((id) => id !== threadId),
          });

          if (!thread && !updatedSegments) {
            return false;
          }

          if (dispatch) {
            if (options.deleteThread) {
              provider.deleteThread(threadId);
            } else if (thread) {
              provider.setThread({
                ...thread,
                archived: true,
                updatedAt: createCommentsTimestamp(),
              });
            }

            refreshCommentsContext(this.storage);
            updatePluginState(
              tr,
              commentsPluginKey.getState(state),
              {
                selectedThreadId:
                  this.storage.selectedThreadId === threadId
                    ? null
                    : this.storage.selectedThreadId,
                hoveredThreadId:
                  this.storage.hoveredThreadId === threadId
                    ? null
                    : this.storage.hoveredThreadId,
              },
            );
            tr.setMeta(commentsSkipCleanupMeta, [threadId]);
          }

          return true;
        },
      updateThread:
        (options: UpdateThreadOptions) =>
        ({ dispatch }) => {
          const updated = withUpdatedThread(this.storage, options.id, (thread) => {
            thread.data =
              options.data === undefined
                ? thread.data
                : options.data && typeof options.data === "object"
                  ? {
                      ...(thread.data ?? {}),
                      ...options.data,
                    }
                  : null;
            thread.updatedAt = createCommentsTimestamp();
          });

          return dispatch ? updated : Boolean(this.storage.getThread(options.id));
        },
      selectThread:
        (options: SelectThreadOptions = {}) =>
        ({ state, tr, dispatch, editor }) => {
          const markType = getMarkType({ state }, this.options.markTypeName);
          const threadId = markType
            ? options.id
              ?? resolveThreadIdFromSelection({
                state,
                markType,
                selectedThreadId: this.storage.selectedThreadId,
              })
            : options.id ?? null;

          if (!threadId) {
            return false;
          }

          const target = findFirstThreadOccurrence(editor, threadId, {
            markTypeName: this.options.markTypeName,
          });

          if (!target) {
            return false;
          }

          if (dispatch) {
            updatePluginState(
              tr,
              commentsPluginKey.getState(state),
              {
                selectedThreadId: threadId,
              },
            );

            updateSelectionForThread({
              tr,
              target,
              selectThreadOptions: options,
            });

            if (options.scrollIntoView !== false) {
              tr.scrollIntoView();
            }
          }

          if (options.triggerClick) {
            this.options.onClickThread?.(threadId);
          }

          if (dispatch && options.focus !== false) {
            queueMicrotask(() => {
              editor.view?.focus();
            });
          }

          return true;
        },
      unselectThread:
        () =>
        ({ state, tr, dispatch }) => {
          if (!this.storage.selectedThreadId) {
            return true;
          }

          if (dispatch) {
            updatePluginState(
              tr,
              commentsPluginKey.getState(state),
              {
                selectedThreadId: null,
              },
            );
          }

          return true;
        },
      resolveThread:
        (options: ResolveThreadOptions) =>
        ({ dispatch }) => {
          const resolved = withUpdatedThread(this.storage, options.id, (thread) => {
            thread.resolved = true;
            thread.archived = false;
            thread.updatedAt = createCommentsTimestamp();
          });

          return dispatch ? resolved : Boolean(this.storage.getThread(options.id));
        },
      unresolveThread:
        (options: ResolveThreadOptions) =>
        ({ dispatch }) => {
          const unresolved = withUpdatedThread(this.storage, options.id, (thread) => {
            thread.resolved = false;
            thread.updatedAt = createCommentsTimestamp();
          });

          return dispatch ? unresolved : Boolean(this.storage.getThread(options.id));
        },
      createComment:
        (options: CreateCommentOptions) =>
        ({ dispatch }) => {
          const created = withUpdatedThread(
            this.storage,
            options.threadId,
            (thread) => {
              const timestamp = createCommentsTimestamp(options.createdAt);

              thread.comments = [
                ...thread.comments,
                {
                  id: options.id ?? createCommentId(thread),
                  content: options.content ?? null,
                  data: options.data ?? null,
                  createdAt: timestamp,
                  updatedAt: timestamp,
                },
              ];
              thread.archived = false;
              thread.updatedAt = timestamp;
            },
          );

          return dispatch ? created : Boolean(this.storage.getThread(options.threadId));
        },
      updateComment:
        (options: UpdateCommentOptions) =>
        ({ dispatch }) => {
          const updated = withUpdatedThread(
            this.storage,
            options.threadId,
            (thread) => {
              const index = thread.comments.findIndex(
                (comment) => comment.id === options.id,
              );

              if (index === -1) {
                return false;
              }

              const currentComment = thread.comments[index];

              thread.comments[index] = {
                ...currentComment,
                content:
                  options.content === undefined
                    ? currentComment.content
                    : options.content,
                data:
                  options.data === undefined
                    ? currentComment.data
                    : options.data && typeof options.data === "object"
                      ? {
                          ...(currentComment.data ?? {}),
                          ...options.data,
                        }
                      : null,
                updatedAt: createCommentsTimestamp(options.updatedAt),
              };
              thread.updatedAt = createCommentsTimestamp(options.updatedAt);
              return true;
            },
          );

          return dispatch ? updated : Boolean(this.storage.getThread(options.threadId));
        },
      removeComment:
        (options: RemoveCommentOptions) =>
        ({ dispatch }) => {
          const removed = withUpdatedThread(
            this.storage,
            options.threadId,
            (thread) => {
              const nextComments = thread.comments.filter(
                (comment) => comment.id !== options.id,
              );

              if (nextComments.length === thread.comments.length) {
                return false;
              }

              thread.comments = nextComments;
              thread.updatedAt = createCommentsTimestamp();
              return true;
            },
          );

          return dispatch ? removed : Boolean(this.storage.getThread(options.threadId));
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<CommentsPluginState>({
        key: commentsPluginKey,
        state: {
          init: () => ({
            selectedThreadId: null,
            hoveredThreadId: null,
          }),
          apply: (transaction, pluginState, _oldState, newState) => {
            const nextState = {
              ...pluginState,
            };
            const meta = transaction.getMeta(commentsPluginKey) as
              | Partial<CommentsPluginState>
              | undefined;
            const threadMouseOver = transaction.getMeta("threadMouseOver");
            const threadMouseOut = transaction.getMeta("threadMouseOut");

            if (meta) {
              Object.assign(nextState, meta);
            }

            if (typeof threadMouseOver === "string") {
              nextState.hoveredThreadId = threadMouseOver;
            }

            if (threadMouseOut === true || typeof threadMouseOut === "string") {
              if (
                threadMouseOut === true
                || threadMouseOut === nextState.hoveredThreadId
              ) {
                nextState.hoveredThreadId = null;
              }
            }

            if (transaction.docChanged && nextState.selectedThreadId) {
              const markType = newState.schema.marks[this.options.markTypeName];

              if (markType) {
                const referencedIds = collectReferencedThreadIds(newState.doc, markType);

                if (!referencedIds.has(nextState.selectedThreadId)) {
                  nextState.selectedThreadId = null;
                }
              }
            }

            return nextState;
          },
        },
        props: {
          decorations: (state) => {
            const markType = state.schema.marks[this.options.markTypeName];

            if (!markType) {
              return null;
            }

            const pluginState = commentsPluginKey.getState(state);
            const threads =
              this.storage.provider?.getThreads({
                types: ["archived", "unarchived"],
              }) ?? [];
            const decorations = collectInlineThreadSegments(state.doc, markType).map(
              (segment) =>
                Decoration.inline(segment.from, segment.to, {
                  class: resolveThreadClasses({
                    threadIds: segment.threadIds,
                    threads,
                    selectedThreadId: pluginState?.selectedThreadId ?? null,
                    hoveredThreadId: pluginState?.hoveredThreadId ?? null,
                    classes: this.options.classes,
                  }),
                  "data-thread-ids": segment.threadIds.join(","),
                }),
            );

            return decorations.length
              ? DecorationSet.create(state.doc, decorations)
              : null;
          },
          handleClick: (view, pos) => {
            const markType = view.state.schema.marks[this.options.markTypeName];

            if (!markType) {
              this.options.onClickThread?.(null);
              return false;
            }

            const threadIds = getThreadIdsAtPos(view.state, pos, markType);
            const threadId = chooseThreadId(
              threadIds,
              this.storage.selectedThreadId,
            );
            const tr = view.state.tr;

            updatePluginState(
              tr,
              commentsPluginKey.getState(view.state),
              {
                selectedThreadId: threadId,
              },
            );
            view.dispatch(tr);
            this.options.onClickThread?.(threadId);

            return false;
          },
        },
      }),
    ];
  },
});
