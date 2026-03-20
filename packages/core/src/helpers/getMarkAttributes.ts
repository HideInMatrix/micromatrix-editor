import type {
  EditorState,
  Mark as ProseMirrorMark,
  MarkType,
} from "@mxm-editor/pm";
import { getMarkType } from "./getMarkType";

export function getMarkAttributes(
  state: EditorState,
  typeOrName: string | MarkType,
) {
  const type = getMarkType(typeOrName, state.schema);
  const { from, to, empty } = state.selection;
  const marks: ProseMirrorMark[] = [];

  if (empty) {
    if (state.storedMarks) {
      marks.push(...state.storedMarks);
    }

    marks.push(...state.selection.$head.marks());
  } else {
    state.doc.nodesBetween(from, to, (node) => {
      marks.push(...node.marks);
      return true;
    });
  }

  const mark = marks.find((item) => item.type === type);

  if (!mark) {
    return {};
  }

  return {
    ...mark.attrs,
  };
}
