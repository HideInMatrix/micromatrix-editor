import { useState } from "react";
import type { Editor } from "@mxm-editor/core";
import type { CollaborationCaretStorage } from "@mxm-editor/extension-collaboration-caret";
import { EditorContent, useEditorState } from "@mxm-editor/react";
import { SlashFloatingMenu } from "./SlashFloatingMenu";
import { useCollaborationPlayground } from "../hooks/useCollaborationPlayground";

interface CollaborationEditorPanelProps {
  editor: Editor | null;
  label: string;
}

function PresenceChips({ editor }: { editor: Editor | null }) {
  const users = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) =>
      (
        currentEditor?.storage.collaborationCaret as
          | CollaborationCaretStorage
          | undefined
      )?.users ?? [],
  });

  return (
    <div className="collaboration-panel__presence">
      {users.map((user) => (
        <span
          key={`${user.clientId}-${user.name ?? "presence"}`}
          className="presence-chip"
          style={{
            backgroundColor: `${user.color ?? "#ffb870"}20`,
            borderColor: user.color ?? "#ffb870",
            color: user.color ?? "#ffb870",
          }}
        >
          {user.name ?? `用户 ${user.clientId}`}
        </span>
      ))}
    </div>
  );
}

function CollaborationEditorPanel({
  editor,
  label,
}: CollaborationEditorPanelProps) {
  return (
    <div className="collaboration-panel">
      <div className="collaboration-panel__label">{label}</div>
      <PresenceChips editor={editor} />
      <SlashFloatingMenu editor={editor} />
      <EditorContent
        editor={editor}
        className="editor-surface editor-surface--collaboration"
      />
    </div>
  );
}

function ActiveCollaborationSection() {
  const { leftEditor, rightEditor } = useCollaborationPlayground();

  return (
    <section className="collaboration-card">
      <div className="panel-heading">
        <div>
          <div className="panel-eyebrow">协同</div>
          <h2>共享文档与远端光标</h2>
        </div>
        <p>
          左右编辑器通过独立 Doc 与 Awareness 桥接同步内容和光标，支持
          slash 命令、列表块，以及各自本地撤销 / 重做。
        </p>
      </div>

      <div className="collaboration-grid">
        <CollaborationEditorPanel
          editor={leftEditor}
          label="编辑器 A"
        />
        <CollaborationEditorPanel
          editor={rightEditor}
          label="编辑器 B"
        />
      </div>
    </section>
  );
}

export function CollaborationSection() {
  const [isVisible, setIsVisible] = useState(false);

  if (isVisible) {
    return <ActiveCollaborationSection />;
  }

  return (
    <section className="collaboration-card collaboration-card--standby">
      <div className="panel-heading">
        <div>
          <div className="panel-eyebrow">协同</div>
          <h2>按需启动的协同演示</h2>
        </div>
        <p>
          协同区包含 `Y.Doc + Awareness + remote caret`，为了避免开发态初始化把整页拖慢，默认按需启动。
        </p>
      </div>

      <div className="collaboration-standby">
        <button
          className="collaboration-toggle"
          onClick={() => setIsVisible(true)}
          type="button"
        >
          启动协同演示
        </button>
        <p className="collaboration-standby__note">
          现在协同运行时只会在你主动展开后创建，并且与本地编辑器面板完全隔离。
        </p>
      </div>
    </section>
  );
}
