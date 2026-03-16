import { mergeAttributes, type ResolvedExtensionAttribute } from "@mxm-editor/core";
import type { Mark as ProseMirrorMark, Node as ProseMirrorNode } from "@mxm-editor/pm";

export function getAttributes(
  nodeOrMark: ProseMirrorNode | ProseMirrorMark,
  extensionAttributes: ResolvedExtensionAttribute[],
  onlyRenderedAttributes = false,
): Record<string, any> {
  const nodeOrMarkAttributes = nodeOrMark.attrs;

  if (!nodeOrMarkAttributes) {
    return {};
  }

  return extensionAttributes
    .filter((item) => {
      if (item.type !== nodeOrMark.type.name) {
        return false;
      }

      if (onlyRenderedAttributes) {
        return Boolean(item.attribute.renderHTML);
      }

      return true;
    })
    .map((item) => {
      if (!item.attribute.renderHTML) {
        return {
          [item.name]:
            item.name in nodeOrMarkAttributes
              ? nodeOrMarkAttributes[item.name]
              : item.attribute.default,
        };
      }

      return item.attribute.renderHTML(nodeOrMarkAttributes) || {
        [item.name]:
          item.name in nodeOrMarkAttributes
            ? nodeOrMarkAttributes[item.name]
            : item.attribute.default,
      };
    })
    .reduce(
      (attributes, attribute) =>
        mergeAttributes(
          attributes,
          attribute as Record<string, string | undefined>,
        ),
      {} as Record<string, string>,
    );
}

export function getHTMLAttributes(
  nodeOrMark: ProseMirrorNode | ProseMirrorMark,
  extensionAttributes: ResolvedExtensionAttribute[],
) {
  return getAttributes(nodeOrMark, extensionAttributes, true);
}
