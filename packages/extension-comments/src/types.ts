import type { Doc } from "yjs";
import type { Editor, JSONContent } from "@mxm-editor/core";
import type {
  Mark as ProseMirrorMark,
  Node as ProseMirrorNode,
} from "@mxm-editor/pm";

export type CommentsContent =
  | string
  | JSONContent
  | JSONContent[]
  | Record<string, any>
  | null;

export interface CommentsComment {
  id: string;
  content: CommentsContent;
  data: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommentsThread {
  id: string;
  data: Record<string, any> | null;
  resolved: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  comments: CommentsComment[];
}

export interface GetThreadsOptions {
  types?: Array<"archived" | "unarchived">;
}

export interface CommentsProvider {
  getThreads: (options?: GetThreadsOptions) => CommentsThread[];
  getThread: (id: string) => CommentsThread | null;
  setThread: (thread: CommentsThread) => void;
  deleteThread: (id: string) => void;
  watchThreads: (listener: () => void) => void;
  unwatchThreads: (listener: () => void) => void;
}

export interface CommentsClasses {
  thread: string;
  threadInline: string;
  threadBlock: string;
  threadHovered: string;
  threadSelected: string;
  threadResolved: string;
  threadUnresolved: string;
}

export interface CommentsOptions {
  provider: CommentsProvider | null;
  document: Doc | null;
  field: string;
  classes: CommentsClasses;
  onClickThread?: (id: string | null) => void;
  deleteUnreferencedThreads: boolean;
  useLegacyWrapping: boolean;
  markTypeName: string;
}

export interface CommentsStorage {
  provider: CommentsProvider | null;
  threads: CommentsThread[];
  selectedThreadId: string | null;
  hoveredThreadId: string | null;
  unsubscribe: (() => void) | null;
  getThreads: (options?: GetThreadsOptions) => CommentsThread[];
  getThread: (id: string) => CommentsThread | null;
  subscribe: (
    callback: (threads: CommentsThread[]) => void,
    options?: GetThreadsOptions,
  ) => () => void;
}

export interface SetThreadOptions {
  id?: string;
  content?: CommentsContent;
  data?: Record<string, any> | null;
  commentData?: Record<string, any> | null;
  createdAt?: string;
  commentId?: string;
  commentCreatedAt?: string;
}

export interface RemoveThreadOptions {
  id?: string;
  deleteThread?: boolean;
}

export interface UpdateThreadOptions {
  id: string;
  data?: Record<string, any> | null;
}

export interface SelectThreadOptions {
  id?: string;
  selectAround?: boolean;
  focus?: boolean;
  scrollIntoView?: boolean;
  updateSelection?: boolean;
  triggerClick?: boolean;
}

export interface ResolveThreadOptions {
  id: string;
}

export interface CreateCommentOptions {
  threadId: string;
  id?: string;
  content?: CommentsContent;
  data?: Record<string, any> | null;
  createdAt?: string;
}

export interface UpdateCommentOptions {
  threadId: string;
  id: string;
  content?: CommentsContent;
  data?: Record<string, any> | null;
  updatedAt?: string;
}

export interface RemoveCommentOptions {
  threadId: string;
  id: string;
}

export interface SubscribeToThreadsOptions {
  provider: CommentsProvider | null | undefined;
  callback: (threads: CommentsThread[]) => void;
  getThreadsOptions?: GetThreadsOptions;
}

export interface InlineThreadSegment {
  from: number;
  to: number;
  pos: number;
  node: ProseMirrorNode;
  mark: ProseMirrorMark;
  threadIds: string[];
}

export interface FoundThread {
  id: string;
  type: "mark" | "node";
  pos: number;
  from?: number;
  to?: number;
  node: ProseMirrorNode;
  mark?: ProseMirrorMark;
}

export interface FindThreadsOptions {
  markTypeName?: string;
  blockTypeName?: string;
}

export interface CommentsExtensionContext {
  editor: Editor;
  provider: CommentsProvider;
}
