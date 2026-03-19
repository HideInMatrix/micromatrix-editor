import type { AnyExtension } from "../types";
import { Editable } from "./editable";
import { FocusEvents } from "./focusEvents";
import { Tabindex } from "./tabindex";

export function getCoreExtensions(): AnyExtension[] {
  return [
    Editable,
    Tabindex,
    FocusEvents,
  ];
}

export * from "./editable";
export * from "./focusEvents";
export * from "./tabindex";
