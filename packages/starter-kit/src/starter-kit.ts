import { Extension } from "@mxm-editor/core";
import {
  Blockquote,
} from "@mxm-editor/extension-blockquote";
import { Bold, type BoldOptions } from "@mxm-editor/extension-bold";
import { BulletList } from "@mxm-editor/extension-bullet-list";
import { Code, type CodeOptions } from "@mxm-editor/extension-code";
import { CodeBlock, type CodeBlockOptions } from "@mxm-editor/extension-code-block";
import { Document } from "@mxm-editor/extension-document";
import { Dropcursor, type DropcursorOptions } from "@mxm-editor/extension-dropcursor";
import { Gapcursor } from "@mxm-editor/extension-gapcursor";
import {
  Heading,
  type HeadingOptions,
} from "@mxm-editor/extension-heading";
import { HardBreak } from "@mxm-editor/extension-hard-break";
import { HorizontalRule } from "@mxm-editor/extension-horizontal-rule";
import { Italic, type ItalicOptions } from "@mxm-editor/extension-italic";
import { ListItem } from "@mxm-editor/extension-list-item";
import { Link, type LinkOptions } from "@mxm-editor/extension-link";
import { OrderedList } from "@mxm-editor/extension-ordered-list";
import { Paragraph } from "@mxm-editor/extension-paragraph";
import { Strike, type StrikeOptions } from "@mxm-editor/extension-strike";
import { Text } from "@mxm-editor/extension-text";
import {
  TrailingNode,
  type TrailingNodeOptions,
} from "@mxm-editor/extension-trailing-node";
import { Underline, type UnderlineOptions } from "@mxm-editor/extension-underline";
import { UndoRedo, type UndoRedoOptions } from "@mxm-editor/extension-undo-redo";

export interface StarterKitOptions {
  document: false | Record<string, never>;
  paragraph: false | Record<string, never>;
  text: false | Record<string, never>;
  heading: false | Partial<HeadingOptions>;
  blockquote: false | Record<string, never>;
  bulletList: false | Record<string, never>;
  orderedList: false | Record<string, never>;
  listItem: false | Record<string, never>;
  codeBlock: false | Partial<CodeBlockOptions>;
  code: false | Partial<CodeOptions>;
  strike: false | Partial<StrikeOptions>;
  underline: false | Partial<UnderlineOptions>;
  hardBreak: false | Record<string, never>;
  horizontalRule: false | Record<string, never>;
  trailingNode: false | Partial<TrailingNodeOptions>;
  bold: false | Partial<BoldOptions>;
  italic: false | Partial<ItalicOptions>;
  link: false | Partial<LinkOptions>;
  undoRedo: false | Partial<UndoRedoOptions>;
  history: false | Partial<UndoRedoOptions>;
  dropcursor: false | Partial<DropcursorOptions>;
  gapcursor: false | Record<string, never>;
}

export const StarterKit = Extension.create<StarterKitOptions>({
  name: "starterKit",

  addOptions() {
    return {
      document: {},
      paragraph: {},
      text: {},
      heading: {},
      blockquote: {},
      bulletList: {},
      orderedList: {},
      listItem: {},
      codeBlock: {},
      code: {},
      strike: {},
      underline: {},
      hardBreak: {},
      horizontalRule: {},
      trailingNode: {},
      bold: {},
      italic: {},
      link: {},
      undoRedo: {},
      history: {},
      dropcursor: {},
      gapcursor: {},
    };
  },

  addExtensions() {
    const extensions = [];

    if (this.options.document !== false) {
      extensions.push(Document.configure(this.options.document));
    }

    if (this.options.paragraph !== false) {
      extensions.push(Paragraph.configure(this.options.paragraph));
    }

    if (this.options.text !== false) {
      extensions.push(Text.configure(this.options.text));
    }

    if (this.options.heading !== false) {
      extensions.push(Heading.configure(this.options.heading));
    }

    if (this.options.blockquote !== false) {
      extensions.push(Blockquote.configure(this.options.blockquote));
    }

    if (this.options.listItem !== false) {
      extensions.push(ListItem.configure(this.options.listItem));
    }

    if (this.options.bulletList !== false) {
      extensions.push(BulletList.configure(this.options.bulletList));
    }

    if (this.options.orderedList !== false) {
      extensions.push(OrderedList.configure(this.options.orderedList));
    }

    if (this.options.codeBlock !== false) {
      extensions.push(CodeBlock.configure(this.options.codeBlock));
    }

    if (this.options.code !== false) {
      extensions.push(Code.configure(this.options.code));
    }

    if (this.options.strike !== false) {
      extensions.push(Strike.configure(this.options.strike));
    }

    if (this.options.underline !== false) {
      extensions.push(Underline.configure(this.options.underline));
    }

    if (this.options.hardBreak !== false) {
      extensions.push(HardBreak.configure(this.options.hardBreak));
    }

    if (this.options.horizontalRule !== false) {
      extensions.push(HorizontalRule.configure(this.options.horizontalRule));
    }

    if (this.options.trailingNode !== false) {
      extensions.push(TrailingNode.configure(this.options.trailingNode));
    }

    if (this.options.bold !== false) {
      extensions.push(Bold.configure(this.options.bold));
    }

    if (this.options.italic !== false) {
      extensions.push(Italic.configure(this.options.italic));
    }

    if (this.options.link !== false) {
      extensions.push(Link.configure(this.options.link));
    }

    const undoRedoOptions =
      this.options.undoRedo !== false
        ? this.options.undoRedo
        : this.options.history !== false
          ? this.options.history
          : false;

    if (undoRedoOptions !== false) {
      extensions.push(UndoRedo.configure(undoRedoOptions));
    }

    if (this.options.dropcursor !== false) {
      extensions.push(Dropcursor.configure(this.options.dropcursor));
    }

    if (this.options.gapcursor !== false) {
      extensions.push(Gapcursor.configure(this.options.gapcursor));
    }

    return extensions;
  },
});
