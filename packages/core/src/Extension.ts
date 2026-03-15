import type { Editor } from "./Editor";
import type {
  ExtensionConfig,
  ExtensionContext,
  ExtensionLike,
} from "./types";

class BaseExtension<
  Options,
  Storage,
  Config extends ExtensionConfig<Options, Storage>,
> implements ExtensionLike<Options, Storage, Config>
{
  readonly type;

  readonly config: Config;

  readonly name: string;

  readonly priority: number;

  readonly options: Options;

  readonly storage: Storage;

  constructor(
    type: ExtensionLike<Options, Storage, Config>["type"],
    config: Config,
    options?: Partial<Options>,
  ) {
    this.type = type;
    this.config = config;
    this.name = config.name;
    this.priority = config.priority ?? 100;

    const baseContext = {
      name: config.name,
      options: {} as Options,
      storage: {} as Storage,
      editor: undefined as unknown as Editor,
    };
    const defaultOptions = config.addOptions
      ? config.addOptions.call(baseContext)
      : ({} as Options);

    this.options = {
      ...(defaultOptions as object),
      ...(options as object),
    } as Options;

    this.storage = config.addStorage
      ? config.addStorage.call({
          ...baseContext,
          options: this.options,
        })
      : ({} as Storage);
  }

  configure(options?: Partial<Options>) {
    const Constructor = this.constructor as new (
      config: Config,
      nextOptions?: Partial<Options>,
    ) => BaseExtension<Options, Storage, Config>;

    return new Constructor(this.config, {
      ...(this.options as object),
      ...(options as object),
    } as Partial<Options>);
  }

  createContext(editor: Editor): ExtensionContext<Options, Storage> {
    return {
      name: this.name,
      options: this.options,
      storage: this.storage,
      editor,
    };
  }
}

export class Extension<
  Options = Record<string, never>,
  Storage = Record<string, never>,
> extends BaseExtension<Options, Storage, ExtensionConfig<Options, Storage>> {
  constructor(
    config: ExtensionConfig<Options, Storage>,
    options?: Partial<Options>,
  ) {
    super("extension", config, options);
  }

  static create<
    Options = Record<string, never>,
    Storage = Record<string, never>,
  >(config: ExtensionConfig<Options, Storage>) {
    return new Extension(config);
  }
}
