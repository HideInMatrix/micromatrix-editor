import { NodeSelection } from "@mxm-editor/pm";

export function isNodeSelection(value: unknown): value is NodeSelection {
  return value instanceof NodeSelection;
}
