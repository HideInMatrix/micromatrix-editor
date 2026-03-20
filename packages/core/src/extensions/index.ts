import type {
  AnyExtension,
  CoreExtensionName,
} from "../types";
import { ClipboardTextSerializer } from "./clipboardTextSerializer";
import { Commands } from "./commands";
import { Delete } from "./delete";
import { Drop } from "./drop";
import { Editable } from "./editable";
import { FocusEvents } from "./focusEvents";
import { Keymap } from "./keymap";
import { Paste } from "./paste";
import { Tabindex } from "./tabindex";
import { TextDirection } from "./textDirection";

type GetCoreExtensionsOptions = {
  enableCoreExtensions?: boolean | Partial<Record<CoreExtensionName, false>>;
  coreExtensionOptions?: {
    textDirection?: {
      direction?: "ltr" | "rtl" | "auto";
    };
  };
};

function isEnabled(
  name: CoreExtensionName,
  setting: GetCoreExtensionsOptions["enableCoreExtensions"],
) {
  if (setting === false) {
    return false;
  }

  if (setting && typeof setting === "object") {
    return setting[name] !== false;
  }

  return true;
}

export function getCoreExtensions(options: GetCoreExtensionsOptions = {}): AnyExtension[] {
  const extensions: Array<[CoreExtensionName, AnyExtension]> = [
    ["editable", Editable],
    ["clipboardTextSerializer", ClipboardTextSerializer],
    ["commands", Commands],
    ["focusEvents", FocusEvents],
    ["keymap", Keymap],
    ["tabindex", Tabindex],
    ["drop", Drop],
    ["paste", Paste],
    ["delete", Delete],
    ["textDirection", TextDirection],
  ];

  return extensions
    .filter(([name]) => isEnabled(name, options.enableCoreExtensions))
    .map(([, extension]) => extension);
}

export * from "./clipboardTextSerializer";
export * from "./commands";
export * from "./delete";
export * from "./drop";
export * from "./editable";
export * from "./focusEvents";
export * from "./keymap";
export * from "./paste";
export * from "./tabindex";
export * from "./textDirection";
