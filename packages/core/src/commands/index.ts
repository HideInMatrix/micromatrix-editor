import type { Editor } from "../Editor";
import type { RawCommands } from "../types";
import { createContentCommands } from "./content";
import { createFocusCommands, resolveFocusSelection } from "./focus";
import { createMetadataCommands } from "./metadata";
import { createSelectionCommands } from "./selection";

export function createCoreCommands(editor: Editor): RawCommands {
  return {
    ...createContentCommands(editor),
    ...createSelectionCommands(),
    ...createMetadataCommands(),
    ...createFocusCommands(editor),
  };
}

export { resolveFocusSelection };
