import { useEffect, useState } from "react";
import { Editor } from "@mxm-editor/core";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";
import { prosemirrorToYDoc } from "y-prosemirror";
import { Doc, applyUpdate, encodeStateAsUpdate } from "yjs";
import { collaborationContent } from "../constants";
import {
  createPlaygroundExtensions,
  markdownManager,
  type PlaygroundCollaborationPeer,
} from "../extensions";

interface CollaborationSession {
  leftEditor: Editor;
  rightEditor: Editor;
  destroy: () => void;
}

function bridgeDocs(left: Doc, right: Doc) {
  const handleLeftUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === "bridge:right") {
      return;
    }

    applyUpdate(right, update, "bridge:left");
  };

  const handleRightUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === "bridge:left") {
      return;
    }

    applyUpdate(left, update, "bridge:right");
  };

  left.on("update", handleLeftUpdate);
  right.on("update", handleRightUpdate);

  return () => {
    left.off("update", handleLeftUpdate);
    right.off("update", handleRightUpdate);
  };
}

function bridgeAwareness(left: Awareness, right: Awareness) {
  const handleLeftUpdate = (
    {
      added,
      updated,
      removed,
    }: {
      added: number[];
      updated: number[];
      removed: number[];
    },
    origin: unknown,
  ) => {
    if (origin === "bridge:right") {
      return;
    }

    applyAwarenessUpdate(
      right,
      encodeAwarenessUpdate(left, [...added, ...updated, ...removed]),
      "bridge:left",
    );
  };

  const handleRightUpdate = (
    {
      added,
      updated,
      removed,
    }: {
      added: number[];
      updated: number[];
      removed: number[];
    },
    origin: unknown,
  ) => {
    if (origin === "bridge:left") {
      return;
    }

    applyAwarenessUpdate(
      left,
      encodeAwarenessUpdate(right, [...added, ...updated, ...removed]),
      "bridge:right",
    );
  };

  left.on("update", handleLeftUpdate);
  right.on("update", handleRightUpdate);

  return () => {
    left.off("update", handleLeftUpdate);
    right.off("update", handleRightUpdate);
  };
}

function createPeer(
  document: Doc,
  awareness: Awareness,
  user: PlaygroundCollaborationPeer["user"],
): PlaygroundCollaborationPeer {
  return {
    awareness,
    document,
    user,
  };
}

function createCollaborationSession(): CollaborationSession {
  const leftDocument = new Doc();
  const rightDocument = new Doc();
  const leftAwareness = new Awareness(leftDocument);
  const rightAwareness = new Awareness(rightDocument);
  const leftPeer = createPeer(leftDocument, leftAwareness, {
    name: "Ava",
    color: "#ff7e5c",
  });
  const rightPeer = createPeer(rightDocument, rightAwareness, {
    name: "Noah",
    color: "#4f8df5",
  });
  const disconnectDocs = bridgeDocs(leftDocument, rightDocument);
  const disconnectAwareness = bridgeAwareness(leftAwareness, rightAwareness);
  const seedDocument = prosemirrorToYDoc(
    markdownManager.parse(collaborationContent),
    "playground",
  );

  applyUpdate(leftDocument, encodeStateAsUpdate(seedDocument), "seed");
  seedDocument.destroy();

  const leftEditor = new Editor({
    extensions: createPlaygroundExtensions({
      collaborative: true,
      peer: leftPeer,
    }),
    content: "<p></p>",
  });
  const rightEditor = new Editor({
    extensions: createPlaygroundExtensions({
      collaborative: true,
      peer: rightPeer,
    }),
    content: "<p></p>",
  });

  return {
    leftEditor,
    rightEditor,
    destroy: () => {
      leftEditor.destroy();
      rightEditor.destroy();
      disconnectAwareness();
      disconnectDocs();
      leftAwareness.destroy();
      rightAwareness.destroy();
      leftDocument.destroy();
      rightDocument.destroy();
    },
  };
}

let activeSession: CollaborationSession | null = null;

function getCollaborationSession() {
  if (!activeSession) {
    activeSession = createCollaborationSession();
  }

  return activeSession;
}

function destroyCollaborationSession() {
  activeSession?.destroy();
  activeSession = null;
}

const hotModule = import.meta as ImportMeta & {
  hot?: {
    dispose: (callback: () => void) => void;
  };
};

hotModule.hot?.dispose(() => {
  destroyCollaborationSession();
});

export function useCollaborationPlayground() {
  const [session] = useState(() => getCollaborationSession());

  useEffect(() => {
    return () => {
      destroyCollaborationSession();
    };
  }, []);

  return {
    leftEditor: session.leftEditor,
    rightEditor: session.rightEditor,
  };
}
