import type { AnyExtension } from "../types";
import { Commands } from "./commands";
import { Drop } from "./drop";
import { Editable } from "./editable";
import { FocusEvents } from "./focusEvents";
import { Keymap } from "./keymap";
import { Paste } from "./paste";
import { Tabindex } from "./tabindex";

export function getCoreExtensions(): AnyExtension[] {
  return [
    Commands,
    Editable,
    Tabindex,
    FocusEvents,
    Drop,
    Keymap,
    Paste,
  ];
}

export * from "./commands";
export * from "./drop";
export * from "./editable";
export * from "./focusEvents";
export * from "./keymap";
export * from "./paste";
export * from "./tabindex";
