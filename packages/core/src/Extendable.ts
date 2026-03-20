import type { Editor } from "./Editor";
import { getExtensionField } from "./helpers/getExtensionField";
import type {
  AnyExtension,
  ExtensionConfig,
  ExtensionContext,
  ExtensionKind,
  ExtensionLike,
} from "./types";
import {
  callOrReturn,
  mergeDeep,
} from "./utilities";

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

  readonly parent: AnyExtension | null;

  constructor(
    type: ExtensionKind,
    config: Config,
    options?: Partial<Options>,
    parent: AnyExtension | null = null,
  ) {
    const resolvedConfig = options && Object.keys(options).length
      ? {
        ...config,
        addOptions: () =>
          mergeDeep(
            (callOrReturn(
              getExtensionField(
                {
                  config,
                  parent,
                } as AnyExtension,
                "addOptions",
                {
                  name: config.name,
                },
              ) as (() => Options) | undefined,
            ) ?? {}) as Record<string, any>,
            options as Record<string, any>,
          ) as Options,
      }
      : config;

    this.type = type;
    this.config = resolvedConfig;
    this.parent = parent;
    this.name = resolvedConfig.name;
    this.priority = resolvedConfig.priority ?? parent?.priority ?? 100;
  }

  configure(options?: Partial<Options>) {
    const Constructor = this.constructor as new (
      config: Config,
      nextOptions?: Partial<Options>,
      parent?: AnyExtension | null,
    ) => Extendable<Options, Storage, Config>;

    return new Constructor(
      {
        ...(this.config as object),
        addOptions: () =>
          mergeDeep(
            this.options as Record<string, any>,
            (options ?? {}) as Record<string, any>,
          ) as Options,
      } as Config,
      undefined,
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
      undefined,
      this,
    );
  }

  get options(): Options {
    return (callOrReturn(
      getExtensionField(this, "addOptions", {
        name: this.name,
      }) as (() => Options) | undefined,
    ) ?? {}) as Options;
  }

  get storage(): Storage {
    return (callOrReturn(
      getExtensionField(this, "addStorage", {
        name: this.name,
        options: this.options,
      }) as (() => Storage) | undefined,
    ) ?? {}) as Storage;
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
