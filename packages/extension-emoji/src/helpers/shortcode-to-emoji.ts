import type { EmojiItem } from "../emoji";

export function shortcodeToEmoji(shortcode: string, emojis: EmojiItem[]) {
  return emojis.find(
    (item) => shortcode === item.name || item.shortcodes.includes(shortcode),
  );
}
