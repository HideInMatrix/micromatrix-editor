import { TextSelection } from "@mxm-editor/pm";

export function isTextSelection(value: unknown): value is TextSelection {
  return value instanceof TextSelection;
}
