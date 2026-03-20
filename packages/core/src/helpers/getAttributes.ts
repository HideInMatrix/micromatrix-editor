import type {
  EditorState,
  MarkType,
  NodeType,
} from "@mxm-editor/pm";
import { getMarkAttributes } from "./getMarkAttributes";
import { getNodeAttributes } from "./getNodeAttributes";

export function getAttributes(
  state: EditorState,
  typeOrName: string | NodeType | MarkType,
) {
  if (typeof typeOrName === "string") {
    if (state.schema.nodes[typeOrName]) {
      return getNodeAttributes(state, typeOrName);
    }

    if (state.schema.marks[typeOrName]) {
      return getMarkAttributes(state, typeOrName);
    }

    return {};
  }

  if (state.schema.nodes[typeOrName.name] === typeOrName) {
    return getNodeAttributes(state, typeOrName);
  }

  if (state.schema.marks[typeOrName.name] === typeOrName) {
    return getMarkAttributes(state, typeOrName);
  }

  return {};
}
