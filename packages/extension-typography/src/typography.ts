import { Extension } from "@mxm-editor/core";
import {
  InputRule,
  undoInputRule,
  type EditorView,
} from "@mxm-editor/pm";

export type TypographyOption = false | string;

export interface TypographyOptions {
  emDash: TypographyOption;
  ellipsis: TypographyOption;
  openDoubleQuote: TypographyOption;
  closeDoubleQuote: TypographyOption;
  openSingleQuote: TypographyOption;
  closeSingleQuote: TypographyOption;
  leftArrow: TypographyOption;
  rightArrow: TypographyOption;
  copyright: TypographyOption;
  registeredTrademark: TypographyOption;
  trademark: TypographyOption;
  servicemark: TypographyOption;
  oneHalf: TypographyOption;
  oneQuarter: TypographyOption;
  threeQuarters: TypographyOption;
  plusMinus: TypographyOption;
  notEqual: TypographyOption;
  laquo: TypographyOption;
  raquo: TypographyOption;
  multiplication: TypographyOption;
  superscriptTwo: TypographyOption;
  superscriptThree: TypographyOption;
}

function createInputRule(
  find: RegExp,
  replace:
    | string
    | ((match: RegExpMatchArray) => string),
) {
  return new InputRule(find, (state, match, start, end) =>
    state.tr.insertText(
      typeof replace === "function" ? replace(match) : replace,
      start,
      end,
    ));
}

function applyOption(
  option: TypographyOption,
  callback: (value: string) => InputRule,
) {
  if (option === false) {
    return null;
  }

  return callback(option);
}

function runUndoInputRule(view: EditorView | null) {
  return view ? undoInputRule(view.state, view.dispatch) : false;
}

export const Typography = Extension.create<TypographyOptions>({
  name: "typography",

  addOptions() {
    return {
      emDash: "—",
      ellipsis: "…",
      openDoubleQuote: "“",
      closeDoubleQuote: "”",
      openSingleQuote: "‘",
      closeSingleQuote: "’",
      leftArrow: "←",
      rightArrow: "→",
      copyright: "©",
      registeredTrademark: "®",
      trademark: "™",
      servicemark: "℠",
      oneHalf: "½",
      oneQuarter: "¼",
      threeQuarters: "¾",
      plusMinus: "±",
      notEqual: "≠",
      laquo: "«",
      raquo: "»",
      multiplication: "×",
      superscriptTwo: "²",
      superscriptThree: "³",
    };
  },

  addInputRules() {
    return [
      applyOption(this.options.openDoubleQuote, (value) =>
        createInputRule(
          /(^|[\s([{<])"$/,
          (match) => `${match[1]}${value}`,
        )),
      applyOption(this.options.closeDoubleQuote, (value) =>
        createInputRule(/"$/, value)),
      applyOption(this.options.openSingleQuote, (value) =>
        createInputRule(
          /(^|[\s([{<])'$/,
          (match) => `${match[1]}${value}`,
        )),
      applyOption(this.options.closeSingleQuote, (value) =>
        createInputRule(/'$/, value)),
      applyOption(this.options.emDash, (value) =>
        createInputRule(/--$/, value)),
      applyOption(this.options.ellipsis, (value) =>
        createInputRule(/\.\.\.$/, value)),
      applyOption(this.options.leftArrow, (value) =>
        createInputRule(/<-$/, value)),
      applyOption(this.options.rightArrow, (value) =>
        createInputRule(/->$/, value)),
      applyOption(this.options.copyright, (value) =>
        createInputRule(/\(c\)$/i, value)),
      applyOption(this.options.registeredTrademark, (value) =>
        createInputRule(/\(r\)$/i, value)),
      applyOption(this.options.trademark, (value) =>
        createInputRule(/\(tm\)$/i, value)),
      applyOption(this.options.servicemark, (value) =>
        createInputRule(/\(sm\)$/i, value)),
      applyOption(this.options.oneHalf, (value) =>
        createInputRule(/1\/2$/, value)),
      applyOption(this.options.oneQuarter, (value) =>
        createInputRule(/1\/4$/, value)),
      applyOption(this.options.threeQuarters, (value) =>
        createInputRule(/3\/4$/, value)),
      applyOption(this.options.plusMinus, (value) =>
        createInputRule(/\+\/-$/, value)),
      applyOption(this.options.notEqual, (value) =>
        createInputRule(/!=$/, value)),
      applyOption(this.options.laquo, (value) =>
        createInputRule(/<<$/, value)),
      applyOption(this.options.raquo, (value) =>
        createInputRule(/>>$/, value)),
      applyOption(this.options.multiplication, (value) =>
        createInputRule(
          /(\d+)\s?(?:x|\*)\s?(\d+)$/i,
          (match) => `${match[1]}${value}${match[2]}`,
        )),
      applyOption(this.options.superscriptTwo, (value) =>
        createInputRule(/\^2$/, value)),
      applyOption(this.options.superscriptThree, (value) =>
        createInputRule(/\^3$/, value)),
    ].filter((rule): rule is InputRule => Boolean(rule));
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => runUndoInputRule(this.editor.view),
      Delete: () => runUndoInputRule(this.editor.view),
    };
  },
});
