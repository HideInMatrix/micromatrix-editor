import type { NodeConfig } from "./types";
import { Extension } from "./Extension";

export class Node<
  Options = Record<string, never>,
  Storage = Record<string, never>,
> extends Extension<Options, Storage> {
  declare readonly config: NodeConfig<Options, Storage>;

  declare readonly type: "node";

  constructor(
    config: NodeConfig<Options, Storage>,
    options?: Partial<Options>,
    parent = null,
  ) {
    super(config, options, parent);
    Object.defineProperty(this, "type", {
      value: "node",
      enumerable: true,
    });
  }

  static create<
    Options = Record<string, never>,
    Storage = Record<string, never>,
  >(
    config:
      | NodeConfig<Options, Storage>
      | (() => NodeConfig<Options, Storage>),
  ) {
    return new Node(
      typeof config === "function" ? config() : config,
    );
  }

  configure(options?: Partial<Options>) {
    return super.configure(options) as Node<Options, Storage>;
  }

  extend(
    config?:
      | Partial<NodeConfig<Options, Storage>>
      | (() => Partial<NodeConfig<Options, Storage>>),
  ) {
    return super.extend(
      typeof config === "function" ? config() : config,
    ) as Node<Options, Storage>;
  }
}
