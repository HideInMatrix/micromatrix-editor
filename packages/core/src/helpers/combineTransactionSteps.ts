import type {
  Node as ProseMirrorNode,
  Transaction,
  Transform,
} from "@mxm-editor/pm";
import { Transform as ProseMirrorTransform } from "@mxm-editor/pm";

export function combineTransactionSteps(
  oldDoc: ProseMirrorNode,
  transactions: Transaction[],
): Transform {
  const transform = new ProseMirrorTransform(oldDoc);

  transactions.forEach((transaction) => {
    transaction.steps.forEach((step) => {
      transform.step(step);
    });
  });

  return transform;
}
