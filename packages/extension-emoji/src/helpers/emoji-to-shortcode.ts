import type { EmojiItem } from "../emoji";
import { removeVariationSelector } from "./remove-variation-selector";

export function emojiToShortcode(emoji: string, emojis: EmojiItem[]) {
  return emojis.find(
    (item) => item.emoji === removeVariationSelector(emoji),
  )?.shortcodes[0];
}
