import { RemoveMarkStep } from "@mxm-editor/pm";
import { Extension } from "../Extension";
import {
  combineTransactionSteps,
  getChangedRanges,
} from "../helpers";

export const Delete = Extension.create({
  name: "delete",

  onUpdate({ transaction, appendedTransactions }) {
    const callback = () => {
      if (
        this.editor.options.coreExtensionOptions?.delete?.filterTransaction?.(transaction)
        ?? transaction.getMeta("y-sync$")
      ) {
        return;
      }

      const combinedTransform = combineTransactionSteps(
        transaction.before,
        [transaction, ...appendedTransactions],
      );
      const changes = getChangedRanges(combinedTransform);

      changes.forEach((change) => {
        if (
          combinedTransform.mapping.mapResult(change.oldRange.from).deletedAfter
          && combinedTransform.mapping.mapResult(change.oldRange.to).deletedBefore
        ) {
          combinedTransform.before.nodesBetween(change.oldRange.from, change.oldRange.to, (node, from) => {
            const to = from + node.nodeSize - 2;
            const isFullyWithinRange =
              change.oldRange.from <= from
              && to <= change.oldRange.to;
            const payload = {
              type: "node" as const,
              node,
              from,
              to,
              newFrom: combinedTransform.mapping.map(from),
              newTo: combinedTransform.mapping.map(to),
              deletedRange: change.oldRange,
              newRange: change.newRange,
              partial: !isFullyWithinRange,
              editor: this.editor,
              transaction,
              combinedTransform,
            };

            this.editor.emit("delete", payload);
            this.editor.options.onDelete(payload);
          });
        }
      });

      const { mapping } = combinedTransform;

      combinedTransform.steps.forEach((step, index) => {
        if (!(step instanceof RemoveMarkStep)) {
          return;
        }

        const newStart = mapping.slice(index).map(step.from, -1);
        const newEnd = mapping.slice(index).map(step.to);
        const oldStart = mapping.invert().map(newStart, -1);
        const oldEnd = mapping.invert().map(newEnd);
        const foundBeforeMark = combinedTransform.doc
          .nodeAt(newStart - 1)
          ?.marks.some((mark) => mark.eq(step.mark));
        const foundAfterMark = combinedTransform.doc
          .nodeAt(newEnd)
          ?.marks.some((mark) => mark.eq(step.mark));
        const payload = {
          type: "mark" as const,
          mark: step.mark,
          from: step.from,
          to: step.to,
          deletedRange: {
            from: oldStart,
            to: oldEnd,
          },
          newRange: {
            from: newStart,
            to: newEnd,
          },
          partial: Boolean(foundAfterMark || foundBeforeMark),
          editor: this.editor,
          transaction,
          combinedTransform,
        };

        this.editor.emit("delete", payload);
        this.editor.options.onDelete(payload);
      });
    };

    if (this.editor.options.coreExtensionOptions?.delete?.async ?? true) {
      setTimeout(callback, 0);
      return;
    }

    callback();
  },
});
