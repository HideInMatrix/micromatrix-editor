import type { MarkConfig } from "./types";
import { Extension } from "./Extension";

export class Mark<
  Options = Record<string, never>,
  Storage = Record<string, never>,
> extends Extension<Options, Storage> {
  declare readonly config: MarkConfig<Options, Storage>;

  declare readonly type: "mark";

  constructor(
    config: MarkConfig<Options, Storage>,
    options?: Partial<Options>,
    parent = null,
  ) {
    super(config, options, parent);
    Object.defineProperty(this, "type", {
      value: "mark",
      enumerable: true,
    });
  }

  static create<
    Options = Record<string, never>,
    Storage = Record<string, never>,
  >(
    config:
      | MarkConfig<Options, Storage>
      | (() => MarkConfig<Options, Storage>),
  ) {
    return new Mark(
      typeof config === "function" ? config() : config,
    );
  }

  configure(options?: Partial<Options>) {
    return super.configure(options) as Mark<Options, Storage>;
  }

  extend(
    config?:
      | Partial<MarkConfig<Options, Storage>>
      | (() => Partial<MarkConfig<Options, Storage>>),
  ) {
    return super.extend(
      typeof config === "function" ? config() : config,
    ) as Mark<Options, Storage>;
  }
}
