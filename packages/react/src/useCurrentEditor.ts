import { useContext } from "react";
import { EditorContext } from "./EditorContext";

export function useCurrentEditor() {
  return useContext(EditorContext);
}
