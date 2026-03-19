import {
  ReplaceAroundStep,
  ReplaceStep,
  Selection,
  type Transaction,
} from "@mxm-editor/pm";

export function selectionToInsertionEnd(
  transaction: Transaction,
  startLength: number,
  bias: number,
) {
  const lastStepIndex = transaction.steps.length - 1;

  if (lastStepIndex < startLength) {
    return;
  }

  const step = transaction.steps[lastStepIndex];

  if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep)) {
    return;
  }

  const map = transaction.mapping.maps[lastStepIndex];
  let end = 0;

  map.forEach((_from, _to, _newFrom, newTo) => {
    if (end === 0) {
      end = newTo;
    }
  });

  if (end > 0) {
    transaction.setSelection(
      Selection.near(transaction.doc.resolve(end), bias),
    );
  }
}
