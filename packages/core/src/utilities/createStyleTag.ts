export function createStyleTag(
  style: string,
  nonce?: string,
  suffix?: string,
): HTMLStyleElement {
  const selector = `style[data-tiptap-style${suffix ? `-${suffix}` : ""}]`;
  const existingStyleTag = document.querySelector(selector) as HTMLStyleElement | null;

  if (existingStyleTag) {
    return existingStyleTag;
  }

  const styleNode = document.createElement("style");

  if (nonce) {
    styleNode.setAttribute("nonce", nonce);
  }

  styleNode.setAttribute(`data-tiptap-style${suffix ? `-${suffix}` : ""}`, "");
  styleNode.innerHTML = style;
  document.head.appendChild(styleNode);

  return styleNode;
}
