import type { MarkConfig } from "./types";
import { Extension } from "./Extension";

export class Mark<
  Options = Record<string, never>,
  Storage = Record<string, never>,
> extends Extension<Options, Storage> {
  declare readonly config: MarkConfig<Options, Storage>;

  declare readonly type: "mark";

  constructor(config: MarkConfig<Options, Storage>, options?: Partial<Options>) {
    super(config, options);
    Object.defineProperty(this, "type", {
      value: "mark",
      enumerable: true,
    });
  }

  static create<
    Options = Record<string, never>,
    Storage = Record<string, never>,
  >(config: MarkConfig<Options, Storage>) {
    return new Mark(config);
  }
}
