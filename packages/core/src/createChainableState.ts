import type { EditorState, Transaction } from "@mxm-editor/pm";

export function createChainableState({
  state,
  transaction,
}: {
  state: EditorState;
  transaction: Transaction;
}) {
  const chainableState = Object.create(state) as EditorState;

  Object.defineProperty(chainableState, "tr", {
    get: () => transaction,
  });

  Object.defineProperty(chainableState, "selection", {
    get: () => transaction.selection,
  });

  Object.defineProperty(chainableState, "doc", {
    get: () => transaction.doc,
  });

  Object.defineProperty(chainableState, "storedMarks", {
    get: () => transaction.storedMarks,
  });

  return chainableState;
}
