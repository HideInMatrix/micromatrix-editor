import type { MouseEventHandler } from "react";
import { Fragment } from "react";
import type { CharacterCountStorage } from "@mxm-editor/extension-character-count";
import {
  BubbleMenu,
  EditorContent,
  EditorContext,
  FloatingMenu,
  useCurrentEditor,
  useEditorState,
} from "@mxm-editor/react";
import {
  accentOceanColor,
  accentRoseColor,
  bubbleMenuShouldShow,
  floatingMenuShouldShow,
} from "../constants";
import { useLocalPlayground } from "../hooks/useLocalPlayground";
import { InspectorPanel } from "./InspectorPanel";

interface LocalEditorPanelProps {
  insertImage: () => void;
  loadMarkdown: () => void;
  setLink: () => void;
}

interface ToolbarButtonProps {
  active?: boolean;
  label: string;
  onClick: () => void;
}

const preventMouseDown: MouseEventHandler<HTMLButtonElement> = (event) => {
  event.preventDefault();
};

function ToolbarButton({
  active = false,
  label,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      className={active ? "is-active" : ""}
      onMouseDown={preventMouseDown}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function EditorToolbar({
  insertImage,
  loadMarkdown,
  setLink,
}: LocalEditorPanelProps) {
  const { editor } = useCurrentEditor();
  const state = useEditorState({
    selector: ({ editor: currentEditor }) => ({
      alignCenter: currentEditor?.isActive({ textAlign: "center" }) ?? false,
      alignLeft: currentEditor?.isActive({ textAlign: "left" }) ?? false,
      alignRight: currentEditor?.isActive({ textAlign: "right" }) ?? false,
      bold: currentEditor?.isActive("bold") ?? false,
      bulletList: currentEditor?.isActive("bulletList") ?? false,
      code: currentEditor?.isActive("code") ?? false,
      codeBlock: currentEditor?.isActive("codeBlock") ?? false,
      h1: currentEditor?.isActive("heading", { level: 1 }) ?? false,
      h2: currentEditor?.isActive("heading", { level: 2 }) ?? false,
      highlight: currentEditor?.isActive("highlight") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      link: currentEditor?.isActive("link") ?? false,
      orderedList: currentEditor?.isActive("orderedList") ?? false,
      rose: currentEditor?.isActive({ color: accentRoseColor }) ?? false,
      ocean: currentEditor?.isActive({ color: accentOceanColor }) ?? false,
      strike: currentEditor?.isActive("strike") ?? false,
      taskList: currentEditor?.isActive("taskList") ?? false,
      underline: currentEditor?.isActive("underline") ?? false,
    }),
  });

  if (!editor) {
    return null;
  }

  const actions = [
    { label: "Bold", active: state.bold, onClick: () => editor.commands.toggleBold() },
    { label: "Italic", active: state.italic, onClick: () => editor.commands.toggleItalic() },
    { label: "Code", active: state.code, onClick: () => editor.commands.toggleCode() },
    { label: "Strike", active: state.strike, onClick: () => editor.commands.toggleStrike() },
    { label: "Underline", active: state.underline, onClick: () => editor.commands.toggleUnderline() },
    { label: "Highlight", active: state.highlight, onClick: () => editor.commands.toggleHighlight() },
    { label: "Rose", active: state.rose, onClick: () => editor.commands.setColor(accentRoseColor) },
    { label: "Ocean", active: state.ocean, onClick: () => editor.commands.setColor(accentOceanColor) },
    { label: "Reset Color", onClick: () => editor.commands.unsetColor() },
    { label: "H1", active: state.h1, onClick: () => editor.commands.setHeading({ level: 1 }) },
    { label: "H2", active: state.h2, onClick: () => editor.commands.setHeading({ level: 2 }) },
    { label: "Quote", onClick: () => editor.commands.toggleBlockquote() },
    { label: "Bullet List", active: state.bulletList, onClick: () => editor.commands.toggleBulletList() },
    { label: "Ordered List", active: state.orderedList, onClick: () => editor.commands.toggleOrderedList() },
    { label: "Task List", active: state.taskList, onClick: () => editor.commands.toggleTaskList() },
    { label: "Toggle Task", onClick: () => editor.commands.toggleTaskItemChecked() },
    { label: "Code Block", active: state.codeBlock, onClick: () => editor.commands.toggleCodeBlock() },
    { label: "HR", onClick: () => editor.commands.setHorizontalRule() },
    { label: "Hard Break", onClick: () => editor.commands.setHardBreak() },
    { label: "Left", active: state.alignLeft, onClick: () => editor.commands.setTextAlign("left") },
    { label: "Center", active: state.alignCenter, onClick: () => editor.commands.setTextAlign("center") },
    { label: "Right", active: state.alignRight, onClick: () => editor.commands.setTextAlign("right") },
    { label: "Reset Align", onClick: () => editor.commands.unsetTextAlign() },
    { label: "Image", onClick: insertImage },
    {
      label: "Insert Table",
      onClick: () =>
        editor.commands.insertTable({
          rows: 3,
          cols: 3,
          withHeaderRow: true,
        }),
    },
    { label: "Add Row", onClick: () => editor.commands.addRowAfter() },
    { label: "Add Column", onClick: () => editor.commands.addColumnAfter() },
    { label: "Header Row", onClick: () => editor.commands.toggleHeaderRow() },
    { label: "Delete Table", onClick: () => editor.commands.deleteTable() },
    { label: "Link", active: state.link, onClick: setLink },
    { label: "Tip Callout", onClick: () => editor.commands.insertCallout("tip") },
    { label: "Warning Callout", onClick: () => editor.commands.insertCallout("warning") },
    { label: "Undo", onClick: () => editor.commands.undo() },
    { label: "Redo", onClick: () => editor.commands.redo() },
    { label: "Load Markdown", onClick: loadMarkdown },
  ];

  return (
    <div className="toolbar">
      {actions.map((action) => (
        <ToolbarButton
          key={action.label}
          active={action.active}
          label={action.label}
          onClick={action.onClick}
        />
      ))}
    </div>
  );
}

function EditorMeta() {
  const meta = useEditorState({
    selector: ({ editor }) => {
      const characterCountStorage = editor?.storage.characterCount as
        | CharacterCountStorage
        | undefined;
      const paragraphAttributes = editor?.getAttributes("paragraph") ?? {};
      const headingAttributes = editor?.getAttributes("heading") ?? {};
      const textStyleAttributes = editor?.getAttributes("textStyle") ?? {};

      return {
        align: String(
          headingAttributes.textAlign
          ?? paragraphAttributes.textAlign
          ?? "default",
        ),
        characters: characterCountStorage?.characters() ?? 0,
        color: String(textStyleAttributes.color ?? "default"),
        words: characterCountStorage?.words() ?? 0,
      };
    },
  });

  return (
    <div className="editor-meta">
      <span className="editor-meta__stat">Characters {meta.characters}</span>
      <span className="editor-meta__stat">Words {meta.words}</span>
      <span className="editor-meta__stat">Align {meta.align}</span>
      <span className="editor-meta__stat">Color {meta.color}</span>
    </div>
  );
}

function SelectionBubbleMenu({ setLink }: Pick<LocalEditorPanelProps, "setLink">) {
  const { editor } = useCurrentEditor();
  const state = useEditorState({
    selector: ({ editor: currentEditor }) => ({
      alignCenter: currentEditor?.isActive({ textAlign: "center" }) ?? false,
      bold: currentEditor?.isActive("bold") ?? false,
      code: currentEditor?.isActive("code") ?? false,
      highlight: currentEditor?.isActive("highlight") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      link: currentEditor?.isActive("link") ?? false,
      strike: currentEditor?.isActive("strike") ?? false,
    }),
  });

  if (!editor) {
    return null;
  }

  return (
    <BubbleMenu
      editor={editor}
      className="bubble-menu"
      shouldShow={bubbleMenuShouldShow}
    >
      <ToolbarButton
        active={state.bold}
        label="Bold"
        onClick={() => editor.commands.toggleBold()}
      />
      <ToolbarButton
        active={state.italic}
        label="Italic"
        onClick={() => editor.commands.toggleItalic()}
      />
      <ToolbarButton
        active={state.code}
        label="Code"
        onClick={() => editor.commands.toggleCode()}
      />
      <ToolbarButton
        active={state.strike}
        label="Strike"
        onClick={() => editor.commands.toggleStrike()}
      />
      <ToolbarButton
        active={state.highlight}
        label="Highlight"
        onClick={() => editor.commands.toggleHighlight()}
      />
      <ToolbarButton
        active={state.link}
        label="Link"
        onClick={setLink}
      />
      <ToolbarButton
        active={state.alignCenter}
        label="Center"
        onClick={() => editor.commands.setTextAlign("center")}
      />
      <ToolbarButton
        label="Code Block"
        onClick={() => editor.commands.toggleCodeBlock()}
      />
    </BubbleMenu>
  );
}

function EmptyLineFloatingMenu({
  insertImage,
}: Pick<LocalEditorPanelProps, "insertImage">) {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  return (
    <FloatingMenu
      editor={editor}
      className="floating-menu"
      shouldShow={floatingMenuShouldShow}
    >
      <ToolbarButton
        label="H2"
        onClick={() => editor.commands.setHeading({ level: 2 })}
      />
      <ToolbarButton
        label="Bullet"
        onClick={() => editor.commands.toggleBulletList()}
      />
      <ToolbarButton
        label="Rule"
        onClick={() => editor.commands.setHorizontalRule()}
      />
      <ToolbarButton
        label="Image"
        onClick={insertImage}
      />
    </FloatingMenu>
  );
}

function LocalEditorPanel({
  insertImage,
  loadMarkdown,
  setLink,
}: LocalEditorPanelProps) {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  return (
    <div className="editor-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-eyebrow">Local Editor</div>
          <h2>Slash + Bubble + Rich Blocks</h2>
        </div>
        <p>
          在空段落开头输入 <code>/</code>，或选中文字观察上方的
          bubble menu。最后一个空段落会直接展示 placeholder，协同区则会显示远端 caret。
        </p>
      </div>

      <EditorToolbar
        insertImage={insertImage}
        loadMarkdown={loadMarkdown}
        setLink={setLink}
      />
      <EditorMeta />
      <SelectionBubbleMenu setLink={setLink} />
      <EmptyLineFloatingMenu insertImage={insertImage} />
      <EditorContent editor={editor} className="editor-surface" />
    </div>
  );
}

export function LocalEditorSection() {
  const playground = useLocalPlayground();

  return (
    <section className="workspace-grid">
      <EditorContext.Provider value={{ editor: playground.editor }}>
        <LocalEditorPanel
          insertImage={playground.insertImage}
          loadMarkdown={playground.loadMarkdown}
          setLink={playground.setLink}
        />
      </EditorContext.Provider>
      <InspectorPanel editor={playground.editor} />
    </section>
  );
}
