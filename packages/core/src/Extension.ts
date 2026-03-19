import type { Editor } from "./Editor";
import { Extendable } from "./Extendable";
import type {
  ExtensionConfig,
  ExtensionLike,
} from "./types";

export class Extension<
  Options = Record<string, never>,
  Storage = Record<string, never>,
> extends Extendable<Options, Storage, ExtensionConfig<Options, Storage>> {
  constructor(
    config: ExtensionConfig<Options, Storage>,
    options?: Partial<Options>,
    parent: ExtensionLike<any, any, any> | null = null,
  ) {
    super("extension", config, options, parent);
  }

  static create<
    Options = Record<string, never>,
    Storage = Record<string, never>,
  >(
    config:
      | ExtensionConfig<Options, Storage>
      | (() => ExtensionConfig<Options, Storage>),
  ) {
    return new Extension(
      typeof config === "function" ? config() : config,
    );
  }

  configure(options?: Partial<Options>) {
    return super.configure(options) as Extension<Options, Storage>;
  }

  extend(
    config?:
      | Partial<ExtensionConfig<Options, Storage>>
      | (() => Partial<ExtensionConfig<Options, Storage>>),
  ) {
    return super.extend(
      typeof config === "function" ? config() : config,
    ) as Extension<Options, Storage>;
  }

  createContext(editor: Editor) {
    return super.createContext(editor);
  }
}
