declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const emptyRect = {
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} satisfies DOMRect;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

if (typeof HTMLElement !== "undefined") {
  HTMLElement.prototype.getBoundingClientRect ??= () => emptyRect;
  HTMLElement.prototype.getClientRects ??= () => ({
    item: () => null,
    length: 0,
    [Symbol.iterator]: function* iterator() {
      return;
    },
  } as DOMRectList);
}

if (typeof Range !== "undefined") {
  Range.prototype.getBoundingClientRect ??= () => emptyRect;
  Range.prototype.getClientRects ??= () => ({
    item: () => null,
    length: 0,
    [Symbol.iterator]: function* iterator() {
      return;
    },
  } as DOMRectList);
}
