import type { Editor } from "@mxm-editor/core";
import { Extension } from "@mxm-editor/core";
import type { KatexOptions } from "katex";
import {
  BlockMath,
  type BlockMathOptions,
} from "./block-math";
import {
  InlineMath,
  type InlineMathOptions,
} from "./inline-math";

export interface MathematicsOptions {
  inlineOptions?: Omit<InlineMathOptions, "katexOptions">;
  blockOptions?: Omit<BlockMathOptions, "katexOptions">;
  katexOptions?: KatexOptions;
}

export interface MathematicsOptionsWithEditor extends MathematicsOptions {
  editor: Editor;
}

export const Mathematics = Extension.create<MathematicsOptions>({
  name: "Mathematics",

  addOptions() {
    return {
      inlineOptions: undefined,
      blockOptions: undefined,
      katexOptions: undefined,
    };
  },

  addExtensions() {
    return [
      BlockMath.configure({
        ...(this.options.blockOptions ?? {}),
        katexOptions: this.options.katexOptions,
      }),
      InlineMath.configure({
        ...(this.options.inlineOptions ?? {}),
        katexOptions: this.options.katexOptions,
      }),
    ];
  },
});
