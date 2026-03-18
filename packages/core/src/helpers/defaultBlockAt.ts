import type { ContentMatch } from "@mxm-editor/pm";

export function defaultBlockAt(match: ContentMatch) {
  for (let index = 0; index < match.edgeCount; index += 1) {
    const edge = match.edge(index);

    if (edge.type.isTextblock && !edge.type.hasRequiredAttrs()) {
      return edge.type;
    }
  }

  return null;
}
