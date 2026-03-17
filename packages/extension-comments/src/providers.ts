import { Doc } from "yjs";
import type {
  CommentsProvider,
  CommentsThread,
  GetThreadsOptions,
  SubscribeToThreadsOptions,
} from "./types";

function cloneValue<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function createFallbackID(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createTimestamp(value?: string) {
  return value ?? new Date().toISOString();
}

function normalizeComment(comment: Partial<CommentsThread["comments"][number]> | null | undefined) {
  return {
    id:
      typeof comment?.id === "string" && comment.id.length > 0
        ? comment.id
        : createFallbackID("mxm-comment"),
    content: comment?.content ?? null,
    data:
      comment?.data && typeof comment.data === "object"
        ? cloneValue(comment.data)
        : null,
    createdAt: createTimestamp(comment?.createdAt),
    updatedAt: createTimestamp(comment?.updatedAt ?? comment?.createdAt),
  };
}

function normalizeThread(thread: Partial<CommentsThread> | null | undefined): CommentsThread {
  const comments = Array.isArray(thread?.comments)
    ? thread!.comments.map((comment) => normalizeComment(comment))
    : [];

  return {
    id:
      typeof thread?.id === "string" && thread.id.length > 0
        ? thread.id
        : createFallbackID("mxm-thread"),
    data:
      thread?.data && typeof thread.data === "object"
        ? cloneValue(thread.data)
        : null,
    resolved: Boolean(thread?.resolved),
    archived: Boolean(thread?.archived),
    createdAt: createTimestamp(thread?.createdAt),
    updatedAt: createTimestamp(thread?.updatedAt ?? thread?.createdAt),
    comments: comments
      .slice()
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
  };
}

function filterThreadsByType(threads: CommentsThread[], options?: GetThreadsOptions) {
  const types = options?.types?.length ? options.types : ["unarchived"];
  const allowed = new Set(types);

  return threads.filter((thread) =>
    thread.archived ? allowed.has("archived") : allowed.has("unarchived"),
  );
}

function sortThreads(threads: CommentsThread[]) {
  return threads
    .slice()
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function createInMemoryCommentsProvider(
  initialThreads: CommentsThread[] = [],
): CommentsProvider {
  const store = new Map<string, CommentsThread>();
  const listeners = new Set<() => void>();

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  initialThreads.forEach((thread) => {
    const normalized = normalizeThread(thread);

    store.set(normalized.id, normalized);
  });

  return {
    getThreads(options) {
      return filterThreadsByType(
        sortThreads(
          Array.from(store.values()).map((thread) => normalizeThread(thread)),
        ),
        options,
      );
    },
    getThread(id) {
      const thread = store.get(id);

      return thread ? normalizeThread(thread) : null;
    },
    setThread(thread) {
      const normalized = normalizeThread(thread);

      store.set(normalized.id, normalized);
      emit();
    },
    deleteThread(id) {
      if (!store.has(id)) {
        return;
      }

      store.delete(id);
      emit();
    },
    watchThreads(listener) {
      listeners.add(listener);
    },
    unwatchThreads(listener) {
      listeners.delete(listener);
    },
  };
}

export function createYjsCommentsProvider(options: {
  document: Doc;
  field?: string;
}): CommentsProvider {
  const field = options.field ?? "comments";
  const store = options.document.getMap<CommentsThread>(field);
  const listeners = new Set<() => void>();

  const observer = () => {
    listeners.forEach((listener) => listener());
  };

  const getThreads = () =>
    sortThreads(
      Array.from(store.values()).map((thread) => normalizeThread(thread)),
    );

  return {
    getThreads(options) {
      return filterThreadsByType(getThreads(), options);
    },
    getThread(id) {
      const thread = store.get(id);

      return thread ? normalizeThread(thread) : null;
    },
    setThread(thread) {
      const normalized = normalizeThread(thread);

      store.set(normalized.id, normalized);
    },
    deleteThread(id) {
      store.delete(id);
    },
    watchThreads(listener) {
      if (listeners.size === 0) {
        store.observe(observer);
      }

      listeners.add(listener);
    },
    unwatchThreads(listener) {
      listeners.delete(listener);

      if (listeners.size === 0) {
        store.unobserve(observer);
      }
    },
  };
}

export function resolveCommentsProvider(options: {
  provider: CommentsProvider | null;
  document: Doc | null;
  field?: string;
}) {
  if (options.provider) {
    return options.provider;
  }

  if (options.document) {
    return createYjsCommentsProvider({
      document: options.document,
      field: options.field,
    });
  }

  return createInMemoryCommentsProvider();
}

export function subscribeToThreads({
  provider,
  callback,
  getThreadsOptions,
}: SubscribeToThreadsOptions) {
  if (!provider) {
    callback([]);
    return () => undefined;
  }

  const emit = () => {
    callback(provider.getThreads(getThreadsOptions));
  };

  emit();
  provider.watchThreads(emit);

  return () => {
    provider.unwatchThreads(emit);
  };
}

export {
  createFallbackID as createCommentsID,
  createTimestamp as createCommentsTimestamp,
  normalizeThread,
};
