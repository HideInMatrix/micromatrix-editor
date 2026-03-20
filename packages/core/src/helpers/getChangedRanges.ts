import type {
  Step,
  Transform,
} from "@mxm-editor/pm";
import type { Range } from "../types";

export type ChangedRange = {
  oldRange: Range;
  newRange: Range;
};

function removeDuplicateRanges(changes: ChangedRange[]) {
  const seen = new Set<string>();

  return changes.filter((change) => {
    const key = [
      change.oldRange.from,
      change.oldRange.to,
      change.newRange.from,
      change.newRange.to,
    ].join(":");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function simplifyChangedRanges(changes: ChangedRange[]) {
  const uniqueChanges = removeDuplicateRanges(changes);

  if (uniqueChanges.length === 1) {
    return uniqueChanges;
  }

  return uniqueChanges.filter((change, index) => {
    const rest = uniqueChanges.filter((_, nextIndex) => nextIndex !== index);

    return !rest.some((otherChange) =>
      change.oldRange.from >= otherChange.oldRange.from
      && change.oldRange.to <= otherChange.oldRange.to
      && change.newRange.from >= otherChange.newRange.from
      && change.newRange.to <= otherChange.newRange.to,
    );
  });
}

export function getChangedRanges(transform: Transform): ChangedRange[] {
  const { mapping, steps } = transform;
  const changes: ChangedRange[] = [];

  mapping.maps.forEach((stepMap, index) => {
    const ranges: Range[] = [];

    if (!(stepMap as { ranges?: unknown[] }).ranges?.length) {
      const { from, to } = steps[index] as Step & {
        from?: number;
        to?: number;
      };

      if (from === undefined || to === undefined) {
        return;
      }

      ranges.push({ from, to });
    } else {
      stepMap.forEach((from, to) => {
        ranges.push({ from, to });
      });
    }

    ranges.forEach(({ from, to }) => {
      const newStart = mapping.slice(index).map(from, -1);
      const newEnd = mapping.slice(index).map(to);
      const oldStart = mapping.invert().map(newStart, -1);
      const oldEnd = mapping.invert().map(newEnd);

      changes.push({
        oldRange: {
          from: oldStart,
          to: oldEnd,
        },
        newRange: {
          from: newStart,
          to: newEnd,
        },
      });
    });
  });

  return simplifyChangedRanges(changes);
}
