import type { NodeConfig } from "./types";
import { Extension } from "./Extension";

export class Node<
  Options = Record<string, never>,
  Storage = Record<string, never>,
> extends Extension<Options, Storage> {
  declare readonly config: NodeConfig<Options, Storage>;

  declare readonly type: "node";

  constructor(config: NodeConfig<Options, Storage>, options?: Partial<Options>) {
    super(config, options);
    Object.defineProperty(this, "type", {
      value: "node",
      enumerable: true,
    });
  }

  static create<
    Options = Record<string, never>,
    Storage = Record<string, never>,
  >(config: NodeConfig<Options, Storage>) {
    return new Node(config);
  }
}
