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
  Moon,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Subscript as SubscriptIcon,
  Sun,
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

type PlaygroundTheme = "dark" | "light";

interface LocalEditorPanelProps {
  insertImage: () => void;
  resetTemplate: () => void;
  setLink: () => void;
  theme: PlaygroundTheme;
  onToggleTheme: () => void;
}

interface LocalEditorSectionProps {
  theme: PlaygroundTheme;
  onToggleTheme: () => void;
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
  theme,
  onToggleTheme,
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
              label="Undo"
              onClick={() => editor.commands.undo()}
            />
            <ToolbarIconButton
              disabled={!state.canRedo}
              icon={Redo2}
              label="Redo"
              onClick={() => editor.commands.redo()}
            />
          </div>

          <ToolbarDivider />

          <div className="ui-toolbar-group">
            <ToolbarIconButton
              active={state.paragraph}
              icon={Pilcrow}
              label="Paragraph"
              onClick={() => editor.commands.setParagraph()}
            />
            <ToolbarIconButton
              active={state.h1}
              icon={Heading1}
              label="Heading 1"
              onClick={() => editor.commands.setHeading({ level: 1 })}
            />
            <ToolbarIconButton
              active={state.h2}
              icon={Heading2}
              label="Heading 2"
              onClick={() => editor.commands.setHeading({ level: 2 })}
            />
            <ToolbarIconButton
              active={state.bulletList}
              icon={List}
              label="Bullet list"
              onClick={() => editor.commands.toggleBulletList()}
            />
            <ToolbarIconButton
              active={state.orderedList}
              icon={ListOrdered}
              label="Ordered list"
              onClick={() => editor.commands.toggleOrderedList()}
            />
            <ToolbarIconButton
              active={state.taskList}
              icon={ListTodo}
              label="Task list"
              onClick={() => editor.commands.toggleTaskList()}
            />
            <ToolbarIconButton
              active={state.blockquote}
              icon={Quote}
              label="Blockquote"
              onClick={() => editor.commands.toggleBlockquote()}
            />
          </div>

          <ToolbarDivider />

          <div className="ui-toolbar-group">
            <ToolbarIconButton
              active={state.bold}
              icon={Bold}
              label="Bold"
              onClick={() => editor.commands.toggleBold()}
            />
            <ToolbarIconButton
              active={state.italic}
              icon={Italic}
              label="Italic"
              onClick={() => editor.commands.toggleItalic()}
            />
            <ToolbarIconButton
              active={state.strike}
              icon={Strikethrough}
              label="Strike"
              onClick={() => editor.commands.toggleStrike()}
            />
            <ToolbarIconButton
              active={state.code}
              icon={Code2}
              label="Inline code"
              onClick={() => editor.commands.toggleCode()}
            />
            <ToolbarIconButton
              active={state.underline}
              icon={Underline}
              label="Underline"
              onClick={() => editor.commands.toggleUnderline()}
            />
            <ToolbarIconButton
              active={state.highlight}
              icon={Highlighter}
              label="Highlight"
              onClick={() => editor.commands.toggleHighlight()}
            />
            <ToolbarIconButton
              active={state.link}
              icon={Link2}
              label="Link"
              onClick={setLink}
            />
            <ToolbarIconButton
              active={state.superscript}
              icon={SuperscriptIcon}
              label="Superscript"
              onClick={() => editor.commands.toggleSuperscript()}
            />
            <ToolbarIconButton
              active={state.subscript}
              icon={SubscriptIcon}
              label="Subscript"
              onClick={() => editor.commands.toggleSubscript()}
            />
          </div>

          <ToolbarDivider />

          <div className="ui-toolbar-group">
            <ToolbarIconButton
              active={state.alignLeft}
              icon={AlignLeft}
              label="Align left"
              onClick={() => editor.commands.setTextAlign("left")}
            />
            <ToolbarIconButton
              active={state.alignCenter}
              icon={AlignCenter}
              label="Align center"
              onClick={() => editor.commands.setTextAlign("center")}
            />
            <ToolbarIconButton
              active={state.alignRight}
              icon={AlignRight}
              label="Align right"
              onClick={() => editor.commands.setTextAlign("right")}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ToolbarTextButton
            icon={ImagePlus}
            label="Add"
            onClick={insertImage}
          />
          <ToolbarIconButton
            icon={theme === "dark" ? Moon : Sun}
            label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={onToggleTheme}
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
        Type <code>/</code> for commands, <code>@</code> for mentions, and markdown
        shortcuts like <code>**bold**</code>.
      </p>
      <div className="flex items-center gap-4">
        <span>{meta.words} words</span>
        <span>{meta.characters} characters</span>
        <button
          className="text-[var(--link-color)] transition hover:opacity-80"
          onMouseDown={preventMouseDown}
          onClick={resetTemplate}
          type="button"
        >
          Reset template
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
          label="Bold"
          onClick={() => editor.commands.toggleBold()}
        />
        <ToolbarIconButton
          active={state.italic}
          icon={Italic}
          label="Italic"
          onClick={() => editor.commands.toggleItalic()}
        />
        <ToolbarIconButton
          active={state.code}
          icon={Code2}
          label="Code"
          onClick={() => editor.commands.toggleCode()}
        />
        <ToolbarIconButton
          active={state.strike}
          icon={Strikethrough}
          label="Strike"
          onClick={() => editor.commands.toggleStrike()}
        />
        <ToolbarIconButton
          active={state.highlight}
          icon={Highlighter}
          label="Highlight"
          onClick={() => editor.commands.toggleHighlight()}
        />
        <ToolbarIconButton
          active={state.link}
          icon={Link2}
          label="Link"
          onClick={setLink}
        />
        <ToolbarIconButton
          active={state.alignCenter}
          icon={AlignCenter}
          label="Center"
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
          label="Heading 2"
          onClick={() => editor.commands.setHeading({ level: 2 })}
        />
        <ToolbarIconButton
          icon={List}
          label="Bullet list"
          onClick={() => editor.commands.toggleBulletList()}
        />
        <ToolbarIconButton
          icon={Quote}
          label="Blockquote"
          onClick={() => editor.commands.toggleBlockquote()}
        />
        <ToolbarIconButton
          icon={ImagePlus}
          label="Insert image"
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
  theme,
  onToggleTheme,
}: LocalEditorPanelProps) {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  return (
    <div className="ui-shell flex h-[calc(100vh-2rem)] w-full flex-col border border-[var(--panel-border)]">
      <EditorToolbar
        insertImage={insertImage}
        onToggleTheme={onToggleTheme}
        setLink={setLink}
        theme={theme}
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

export function LocalEditorSection({
  theme,
  onToggleTheme,
}: LocalEditorSectionProps) {
  const playground = useLocalPlayground();

  return (
    <section className="w-full">
      <EditorContext.Provider value={{ editor: playground.editor }}>
        <LocalEditorPanel
          insertImage={playground.insertImage}
          onToggleTheme={onToggleTheme}
          resetTemplate={playground.resetTemplate}
          setLink={playground.setLink}
          theme={theme}
        />
      </EditorContext.Provider>
    </section>
  );
}
