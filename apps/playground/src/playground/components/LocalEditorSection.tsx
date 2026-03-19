import type { MouseEventHandler } from "react";
import type { CharacterCountStorage } from "@mxm-editor/extension-character-count";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading1,
  Heading2,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import {
  BubbleMenu,
  EditorContent,
  EditorContext,
  FloatingMenu,
  useCurrentEditor,
  useEditorState,
} from "@mxm-editor/react";
import {
  bubbleMenuShouldShow,
  floatingMenuShouldShow,
} from "../constants";
import { useLocalPlayground } from "../hooks/useLocalPlayground";

interface LocalEditorPanelProps {
  insertImage: () => void;
  resetTemplate: () => void;
  setLink: () => void;
}

interface ToolbarIconButtonProps {
  active?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

interface ToolbarTextButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

const preventMouseDown: MouseEventHandler<HTMLButtonElement> = (event) => {
  event.preventDefault();
};

function ToolbarIconButton({
  active = false,
  disabled = false,
  icon: Icon,
  label,
  onClick,
}: ToolbarIconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`ui-icon-button${active ? " is-active" : ""}`}
      disabled={disabled}
      onMouseDown={preventMouseDown}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon size={17} strokeWidth={2} />
    </button>
  );
}

function ToolbarTextButton({
  icon: Icon,
  label,
  onClick,
}: ToolbarTextButtonProps) {
  return (
    <button
      className="ui-add-button"
      onMouseDown={preventMouseDown}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon size={16} strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}

function ToolbarDivider() {
  return <div aria-hidden="true" className="ui-divider" />;
}

function EditorToolbar({
  insertImage,
  setLink,
}: Omit<LocalEditorPanelProps, "resetTemplate">) {
  const { editor } = useCurrentEditor();
  const state = useEditorState({
    selector: ({ editor: currentEditor }) => ({
      alignCenter: currentEditor?.isActive({ textAlign: "center" }) ?? false,
      alignLeft: currentEditor?.isActive({ textAlign: "left" }) ?? false,
      alignRight: currentEditor?.isActive({ textAlign: "right" }) ?? false,
      blockquote: currentEditor?.isActive("blockquote") ?? false,
      bold: currentEditor?.isActive("bold") ?? false,
      bulletList: currentEditor?.isActive("bulletList") ?? false,
      canRedo: currentEditor?.can().redo() ?? false,
      canUndo: currentEditor?.can().undo() ?? false,
      code: currentEditor?.isActive("code") ?? false,
      h1: currentEditor?.isActive("heading", { level: 1 }) ?? false,
      h2: currentEditor?.isActive("heading", { level: 2 }) ?? false,
      highlight: currentEditor?.isActive("highlight") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      link: currentEditor?.isActive("link") ?? false,
      orderedList: currentEditor?.isActive("orderedList") ?? false,
      paragraph: currentEditor?.isActive("paragraph") ?? false,
      strike: currentEditor?.isActive("strike") ?? false,
      subscript: currentEditor?.isActive("subscript") ?? false,
      superscript: currentEditor?.isActive("superscript") ?? false,
      taskList: currentEditor?.isActive("taskList") ?? false,
      underline: currentEditor?.isActive("underline") ?? false,
    }),
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-[var(--panel-border)] bg-[var(--toolbar-bg)] px-3 py-2 sm:px-4">
      <div className="flex items-center justify-between gap-3 overflow-x-auto">
        <div className="ui-toolbar-strip">
          <div className="ui-toolbar-group">
            <ToolbarIconButton
              disabled={!state.canUndo}
              icon={Undo2}
              label="撤销"
              onClick={() => editor.commands.undo()}
            />
            <ToolbarIconButton
              disabled={!state.canRedo}
              icon={Redo2}
              label="重做"
              onClick={() => editor.commands.redo()}
            />
          </div>

          <ToolbarDivider />

          <div className="ui-toolbar-group">
            <ToolbarIconButton
              active={state.paragraph}
              icon={Pilcrow}
              label="段落"
              onClick={() => editor.commands.setParagraph()}
            />
            <ToolbarIconButton
              active={state.h1}
              icon={Heading1}
              label="一级标题"
              onClick={() => editor.commands.setHeading({ level: 1 })}
            />
            <ToolbarIconButton
              active={state.h2}
              icon={Heading2}
              label="二级标题"
              onClick={() => editor.commands.setHeading({ level: 2 })}
            />
            <ToolbarIconButton
              active={state.bulletList}
              icon={List}
              label="无序列表"
              onClick={() => editor.commands.toggleBulletList()}
            />
            <ToolbarIconButton
              active={state.orderedList}
              icon={ListOrdered}
              label="有序列表"
              onClick={() => editor.commands.toggleOrderedList()}
            />
            <ToolbarIconButton
              active={state.taskList}
              icon={ListTodo}
              label="任务列表"
              onClick={() => editor.commands.toggleTaskList()}
            />
            <ToolbarIconButton
              active={state.blockquote}
              icon={Quote}
              label="引用"
              onClick={() => editor.commands.toggleBlockquote()}
            />
          </div>

          <ToolbarDivider />

          <div className="ui-toolbar-group">
            <ToolbarIconButton
              active={state.bold}
              icon={Bold}
              label="加粗"
              onClick={() => editor.commands.toggleBold()}
            />
            <ToolbarIconButton
              active={state.italic}
              icon={Italic}
              label="斜体"
              onClick={() => editor.commands.toggleItalic()}
            />
            <ToolbarIconButton
              active={state.strike}
              icon={Strikethrough}
              label="删除线"
              onClick={() => editor.commands.toggleStrike()}
            />
            <ToolbarIconButton
              active={state.code}
              icon={Code2}
              label="行内代码"
              onClick={() => editor.commands.toggleCode()}
            />
            <ToolbarIconButton
              active={state.underline}
              icon={Underline}
              label="下划线"
              onClick={() => editor.commands.toggleUnderline()}
            />
            <ToolbarIconButton
              active={state.highlight}
              icon={Highlighter}
              label="高亮"
              onClick={() => editor.commands.toggleHighlight()}
            />
            <ToolbarIconButton
              active={state.link}
              icon={Link2}
              label="链接"
              onClick={setLink}
            />
            <ToolbarIconButton
              active={state.superscript}
              icon={SuperscriptIcon}
              label="上标"
              onClick={() => editor.commands.toggleSuperscript()}
            />
            <ToolbarIconButton
              active={state.subscript}
              icon={SubscriptIcon}
              label="下标"
              onClick={() => editor.commands.toggleSubscript()}
            />
          </div>

          <ToolbarDivider />

          <div className="ui-toolbar-group">
            <ToolbarIconButton
              active={state.alignLeft}
              icon={AlignLeft}
              label="左对齐"
              onClick={() => editor.commands.setTextAlign("left")}
            />
            <ToolbarIconButton
              active={state.alignCenter}
              icon={AlignCenter}
              label="居中对齐"
              onClick={() => editor.commands.setTextAlign("center")}
            />
            <ToolbarIconButton
              active={state.alignRight}
              icon={AlignRight}
              label="右对齐"
              onClick={() => editor.commands.setTextAlign("right")}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ToolbarTextButton
            icon={ImagePlus}
            label="插入图片"
            onClick={insertImage}
          />
        </div>
      </div>
    </div>
  );
}

function EditorFooter({
  resetTemplate,
}: Pick<LocalEditorPanelProps, "resetTemplate">) {
  const meta = useEditorState({
    selector: ({ editor }) => {
      const characterCountStorage = editor?.storage.characterCount as
        | CharacterCountStorage
        | undefined;

      return {
        characters: characterCountStorage?.characters() ?? 0,
        words: characterCountStorage?.words() ?? 0,
      };
    },
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--panel-border)] px-4 py-3 text-xs text-[var(--muted-text)]">
      <p className="m-0">
        输入 <code>/</code> 打开命令，输入 <code>@</code> 提及成员，也可以直接使用
        <code>**加粗**</code> 这样的 Markdown 快捷语法。
      </p>
      <div className="flex items-center gap-4">
        <span>词数 {meta.words}</span>
        <span>字符 {meta.characters}</span>
        <button
          className="text-[var(--link-color)] transition hover:opacity-80"
          onMouseDown={preventMouseDown}
          onClick={resetTemplate}
          type="button"
        >
          重置模板
        </button>
      </div>
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
      className="bubble-menu"
      editor={editor}
      shouldShow={bubbleMenuShouldShow}
    >
      <div className="ui-toolbar-group">
        <ToolbarIconButton
          active={state.bold}
          icon={Bold}
          label="加粗"
          onClick={() => editor.commands.toggleBold()}
        />
        <ToolbarIconButton
          active={state.italic}
          icon={Italic}
          label="斜体"
          onClick={() => editor.commands.toggleItalic()}
        />
        <ToolbarIconButton
          active={state.code}
          icon={Code2}
          label="代码"
          onClick={() => editor.commands.toggleCode()}
        />
        <ToolbarIconButton
          active={state.strike}
          icon={Strikethrough}
          label="删除线"
          onClick={() => editor.commands.toggleStrike()}
        />
        <ToolbarIconButton
          active={state.highlight}
          icon={Highlighter}
          label="高亮"
          onClick={() => editor.commands.toggleHighlight()}
        />
        <ToolbarIconButton
          active={state.link}
          icon={Link2}
          label="链接"
          onClick={setLink}
        />
        <ToolbarIconButton
          active={state.alignCenter}
          icon={AlignCenter}
          label="居中"
          onClick={() => editor.commands.setTextAlign("center")}
        />
      </div>
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
      className="floating-menu"
      editor={editor}
      shouldShow={floatingMenuShouldShow}
    >
      <div className="ui-toolbar-group">
        <ToolbarIconButton
          icon={Heading2}
          label="二级标题"
          onClick={() => editor.commands.setHeading({ level: 2 })}
        />
        <ToolbarIconButton
          icon={List}
          label="无序列表"
          onClick={() => editor.commands.toggleBulletList()}
        />
        <ToolbarIconButton
          icon={Quote}
          label="引用"
          onClick={() => editor.commands.toggleBlockquote()}
        />
        <ToolbarIconButton
          icon={ImagePlus}
          label="插入图片"
          onClick={insertImage}
        />
      </div>
    </FloatingMenu>
  );
}

function LocalEditorPanel({
  insertImage,
  resetTemplate,
  setLink,
}: LocalEditorPanelProps) {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  return (
    <div className="ui-shell flex h-full min-h-[42rem] w-full flex-col border border-[var(--panel-border)]">
      <EditorToolbar
        insertImage={insertImage}
        setLink={setLink}
      />
      <SelectionBubbleMenu setLink={setLink} />
      <EmptyLineFloatingMenu insertImage={insertImage} />
      <EditorContent
        className="editor-surface min-h-0 flex-1 overscroll-contain"
        editor={editor}
      />
      <EditorFooter resetTemplate={resetTemplate} />
    </div>
  );
}

export function LocalEditorSection() {
  const playground = useLocalPlayground();

  return (
    <section className="h-full w-full">
      <EditorContext.Provider value={{ editor: playground.editor }}>
        <LocalEditorPanel
          insertImage={playground.insertImage}
          resetTemplate={playground.resetTemplate}
          setLink={playground.setLink}
        />
      </EditorContext.Provider>
    </section>
  );
}
