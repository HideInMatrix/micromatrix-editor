import type {
  Command,
  RawCommands,
} from "../types";
import {
  exitCode as exitCodeCommand,
  liftEmptyBlock as liftEmptyBlockCommand,
  newlineInCode as newlineInCodeCommand,
  undoInputRule as undoInputRuleCommand,
} from "@mxm-editor/pm";

type ExecutionCommands = Pick<
  RawCommands,
  | "command"
  | "first"
  | "forEach"
  | "enter"
  | "keyboardShortcut"
  | "newlineInCode"
  | "liftEmptyBlock"
  | "exitCode"
  | "undoInputRule"
>;

function isMac() {
  if (typeof navigator !== "undefined" && typeof navigator.platform === "string") {
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  }

  return false;
}

function normalizeShortcut(name: string) {
  const parts = name.split(/-(?!$)/);
  let key = parts[parts.length - 1];
  let altKey = false;
  let ctrlKey = false;
  let metaKey = false;
  let shiftKey = false;

  if (key === "Space") {
    key = " ";
  }

  parts.slice(0, -1).forEach((part) => {
    if (/^(cmd|meta|m)$/i.test(part)) {
      metaKey = true;
      return;
    }

    if (/^a(lt)?$/i.test(part)) {
      altKey = true;
      return;
    }

    if (/^(c|ctrl|control)$/i.test(part)) {
      ctrlKey = true;
      return;
    }

    if (/^s(hift)?$/i.test(part)) {
      shiftKey = true;
      return;
    }

    if (/^mod$/i.test(part)) {
      if (isMac()) {
        metaKey = true;
      } else {
        ctrlKey = true;
      }
      return;
    }

    throw new Error(`Unrecognized modifier name: ${part}`);
  });

  return {
    key,
    altKey,
    ctrlKey,
    metaKey,
    shiftKey,
  };
}

export function createExecutionCommands(): ExecutionCommands {
  return {
    command:
      (command: Command) =>
      (props) =>
        command(props),
    first:
      (commands: Command[]) =>
      (props) =>
        commands.some((command) => command(props)),
    forEach:
      <Item>(
        items: Item[],
        fn: (item: Item, props: Parameters<Command>[0] & { index: number }) => boolean,
      ) =>
      (props) =>
        items.every((item, index) =>
          fn(item, {
            ...props,
            index,
          }),
        ),
    enter:
      () =>
      ({ commands }) =>
        commands.keyboardShortcut("Enter"),
    keyboardShortcut:
      (name: string) =>
      ({ view, dispatch, tr }) => {
        if (!view || !dispatch) {
          return false;
        }

        const shortcut = normalizeShortcut(name);
        const event = new KeyboardEvent("keydown", {
          key: shortcut.key,
          altKey: shortcut.altKey,
          ctrlKey: shortcut.ctrlKey,
          metaKey: shortcut.metaKey,
          shiftKey: shortcut.shiftKey,
          bubbles: true,
          cancelable: true,
        });

        let handled = false;

        view.someProp("handleKeyDown", (handler) => {
          if (handler(view, event)) {
            handled = true;
            tr.setMeta("preventDispatch", true);
            return true;
          }

          return false;
        });

        return handled;
      },
    newlineInCode:
      () =>
      ({ state, dispatch }) =>
        newlineInCodeCommand(state, dispatch),
    liftEmptyBlock:
      () =>
      ({ state, dispatch }) =>
        liftEmptyBlockCommand(state, dispatch),
    exitCode:
      () =>
      ({ state, dispatch }) =>
        exitCodeCommand(state, dispatch),
    undoInputRule:
      () =>
      ({ state, dispatch }) =>
        undoInputRuleCommand(state, dispatch),
  };
}
