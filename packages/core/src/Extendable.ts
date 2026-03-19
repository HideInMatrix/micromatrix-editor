import type { Editor } from "./Editor";
import { getExtensionField } from "./helpers/getExtensionField";
import type {
  AnyExtension,
  ExtensionConfig,
  ExtensionContext,
  ExtensionKind,
  ExtensionLike,
} from "./types";

export class Extendable<
  Options = Record<string, never>,
  Storage = Record<string, never>,
  Config extends ExtensionConfig<Options, Storage> = ExtensionConfig<Options, Storage>,
> implements ExtensionLike<Options, Storage, Config>
{
  readonly type: ExtensionKind;

  readonly config: Config;

  readonly name: string;

  readonly priority: number;

  readonly options: Options;

  readonly storage: Storage;

  readonly parent: AnyExtension | null;

  protected readonly optionOverrides: Partial<Options>;

  constructor(
    type: ExtensionKind,
    config: Config,
    options?: Partial<Options>,
    parent: AnyExtension | null = null,
  ) {
    this.type = type;
    this.config = config;
    this.parent = parent;
    this.name = config.name;
    this.priority = config.priority ?? parent?.priority ?? 100;
    this.optionOverrides = (options ?? {}) as Partial<Options>;

    const baseContext = {
      name: this.name,
      options: {} as Options,
      storage: {} as Storage,
      editor: undefined as unknown as Editor,
      type: null,
    };
    const addOptions = getExtensionField(this, "addOptions", {
      name: this.name,
    }) as (() => Options) | undefined;
    const defaultOptions = addOptions?.() ?? ({} as Options);

    this.options = {
      ...(defaultOptions as object),
      ...(this.optionOverrides as object),
    } as Options;

    const addStorage = getExtensionField(this, "addStorage", {
      ...baseContext,
      options: this.options,
    }) as (() => Storage) | undefined;

    this.storage = addStorage?.() ?? ({} as Storage);
  }

  configure(options?: Partial<Options>) {
    const Constructor = this.constructor as new (
      config: Config,
      nextOptions?: Partial<Options>,
      parent?: AnyExtension | null,
    ) => Extendable<Options, Storage, Config>;

    return new Constructor(
      this.config,
      {
        ...(this.optionOverrides as object),
        ...(options as object),
      } as Partial<Options>,
      this.parent,
    );
  }

  extend(config?: Partial<Config>) {
    const Constructor = this.constructor as new (
      config: Config,
      nextOptions?: Partial<Options>,
      parent?: AnyExtension | null,
    ) => Extendable<Options, Storage, Config>;

    return new Constructor(
      {
        ...(this.config as object),
        ...(config as object),
        name: config?.name ?? this.name,
      } as Config,
      this.optionOverrides,
      this,
    );
  }

  createContext(editor: Editor): ExtensionContext<Options, Storage> {
    const extension = this;

    return {
      name: this.name,
      options: this.options,
      storage: this.storage,
      editor,
      get type() {
        const schema = editor.extensionManager?.schema;

        if (!schema) {
          return null;
        }

        if (extension.type === "node") {
          return schema.nodes[extension.name] ?? null;
        }

        if (extension.type === "mark") {
          return schema.marks[extension.name] ?? null;
        }

        return null;
      },
    };
  }
}
