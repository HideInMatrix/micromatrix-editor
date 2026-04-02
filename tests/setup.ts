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

const emojiPresentationRe = /\p{Emoji_Presentation}/u;
const punctuationRe = /[.,!?;:%)\]}'"”’»›…—-]/u;

function parseFontSize(font: string) {
  const match = font.match(/(\d+(?:\.\d+)?)\s*px/);

  return match ? Number.parseFloat(match[1]!) : 16;
}

function isWideCharacter(character: string) {
  const code = character.codePointAt(0) ?? 0;

  return (
    (code >= 0x4E00 && code <= 0x9FFF)
    || (code >= 0x3400 && code <= 0x4DBF)
    || (code >= 0xF900 && code <= 0xFAFF)
    || (code >= 0x2F800 && code <= 0x2FA1F)
    || (code >= 0x20000 && code <= 0x2A6DF)
    || (code >= 0x2A700 && code <= 0x2B73F)
    || (code >= 0x2B740 && code <= 0x2B81F)
    || (code >= 0x2B820 && code <= 0x2CEAF)
    || (code >= 0x2CEB0 && code <= 0x2EBEF)
    || (code >= 0x30000 && code <= 0x3134F)
    || (code >= 0x3000 && code <= 0x303F)
    || (code >= 0x3040 && code <= 0x309F)
    || (code >= 0x30A0 && code <= 0x30FF)
    || (code >= 0xAC00 && code <= 0xD7AF)
    || (code >= 0xFF00 && code <= 0xFFEF)
  );
}

function measureTextWidth(text: string, font: string) {
  const fontSize = parseFontSize(font);
  let width = 0;

  for (const character of text) {
    if (character === " ") {
      width += fontSize * 0.33;
    } else if (character === "\t") {
      width += fontSize * 1.32;
    } else if (emojiPresentationRe.test(character) || character === "\uFE0F") {
      width += fontSize;
    } else if (isWideCharacter(character)) {
      width += fontSize;
    } else if (punctuationRe.test(character)) {
      width += fontSize * 0.4;
    } else {
      width += fontSize * 0.6;
    }
  }

  return width;
}

class TestCanvasRenderingContext2D {
  font = "";

  measureText(text: string) {
    return {
      width: measureTextWidth(text, this.font),
    };
  }
}

class TestOffscreenCanvas {
  constructor(_width: number, _height: number) {}

  getContext(kind: string) {
    if (kind !== "2d") {
      return null;
    }

    return new TestCanvasRenderingContext2D();
  }
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

(
  globalThis as typeof globalThis & {
    OffscreenCanvas?: typeof TestOffscreenCanvas;
  }
).OffscreenCanvas ??= TestOffscreenCanvas;

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
