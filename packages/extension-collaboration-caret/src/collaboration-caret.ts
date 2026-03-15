import { Extension } from "@mxm-editor/core";
import type { DecorationAttrs } from "@mxm-editor/pm";
import {
  defaultAwarenessStateFilter,
  defaultCursorBuilder,
  defaultSelectionBuilder,
  yCursorPlugin,
} from "y-prosemirror";
import { Awareness } from "y-protocols/awareness";

export interface CollaborationCaretUser {
  name?: string | null;
  color?: string | null;
  [key: string]: any;
}

export interface CollaborationCaretAwarenessUser
  extends CollaborationCaretUser {
  clientId: number;
}

export interface CollaborationCaretProvider {
  awareness: Awareness;
}

export interface CollaborationCaretOptions {
  provider?: CollaborationCaretProvider | null;
  awareness?: Awareness | null;
  user: CollaborationCaretUser | null;
  render: (
    user: CollaborationCaretUser,
    clientId: number,
  ) => HTMLElement;
  selectionRender: (
    user: CollaborationCaretUser,
    clientId: number,
  ) => DecorationAttrs;
  awarenessStateFilter: (
    currentClientId: number,
    userClientId: number,
    user: Record<string, any>,
  ) => boolean;
  cursorStateField: string;
}

export interface CollaborationCaretStorage {
  awareness: Awareness | null;
  users: CollaborationCaretAwarenessUser[];
  updateUser: (attributes: CollaborationCaretUser | null) => boolean;
  changeHandler: (() => void) | null;
}

function resolveAwareness(options: CollaborationCaretOptions) {
  return options.awareness ?? options.provider?.awareness ?? null;
}

function awarenessStatesToArray(awareness: Awareness) {
  return Array.from(awareness.getStates().entries()).map(([clientId, state]) => ({
    clientId,
    ...(typeof state?.user === "object" && state.user ? state.user : {}),
  }));
}

export const CollaborationCaret = Extension.create<
  CollaborationCaretOptions,
  CollaborationCaretStorage
>({
  name: "collaborationCaret",

  priority: 999,

  addOptions() {
    return {
      provider: null,
      awareness: null,
      user: {
        name: null,
        color: null,
      },
      render: (user, clientId) =>
        defaultCursorBuilder(
          {
            name: user.name ?? `User ${clientId}`,
            color: user.color ?? "#ffa500",
            ...user,
          },
        ),
      selectionRender: (user, clientId) =>
        defaultSelectionBuilder(
          {
            name: user.name ?? `User ${clientId}`,
            color: user.color ?? "#ffa500",
            ...user,
          },
        ),
      awarenessStateFilter: defaultAwarenessStateFilter,
      cursorStateField: "cursor",
    };
  },

  addStorage() {
    return {
      awareness: null,
      users: [],
      updateUser: () => false,
      changeHandler: null,
    };
  },

  onCreate() {
    const awareness = resolveAwareness(this.options);

    if (!awareness) {
      throw new Error(
        'The "awareness" or "provider" option is required for the CollaborationCaret extension.',
      );
    }

    const syncUsers = () => {
      this.storage.users = awarenessStatesToArray(awareness);
    };

    this.storage.awareness = awareness;
    this.storage.changeHandler = syncUsers;
    this.storage.updateUser = (attributes) => {
      awareness.setLocalStateField("user", attributes);
      syncUsers();
      return true;
    };

    awareness.setLocalStateField("user", this.options.user);
    awareness.on("change", syncUsers);
    syncUsers();
  },

  onDestroy() {
    const awareness = this.storage.awareness;
    const changeHandler = this.storage.changeHandler;

    if (!awareness || !changeHandler) {
      return;
    }

    awareness.off("change", changeHandler);
    awareness.setLocalStateField("user", null);
    this.storage.users = [];
    this.storage.awareness = null;
    this.storage.changeHandler = null;
  },

  addCommands() {
    return {
      updateUser:
        (attributes: CollaborationCaretUser | null) =>
        () =>
          this.storage.updateUser(attributes),
      user:
        (attributes: CollaborationCaretUser | null) =>
        ({ editor }) =>
          editor.commands.updateUser(attributes),
    };
  },

  addProseMirrorPlugins() {
    const awareness = resolveAwareness(this.options);

    if (!awareness) {
      return [];
    }

    return [
      yCursorPlugin(
        awareness,
        {
          awarenessStateFilter: this.options.awarenessStateFilter,
          cursorBuilder: this.options.render,
          selectionBuilder: this.options.selectionRender,
        },
        this.options.cursorStateField,
      ),
    ];
  },
});
