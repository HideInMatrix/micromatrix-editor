import type { Editor } from "../Editor";
import type { RawCommands } from "../types";
import { createAttributeCommands } from "./attributes";
import { createContentCommands } from "./content";
import { createExecutionCommands } from "./execution";
import { createFocusCommands, resolveFocusSelection } from "./focus";
import { createMarkCommands } from "./mark";
import { createMetadataCommands } from "./metadata";
import { createNodeCommands } from "./node";
import { createSelectionCommands } from "./selection";

export function createCoreCommands(editor: Editor): RawCommands {
  return {
    ...createExecutionCommands(),
    ...createContentCommands(editor),
    ...createSelectionCommands(),
    ...createMetadataCommands(),
    ...createMarkCommands(editor),
    ...createAttributeCommands(editor),
    ...createNodeCommands(editor),
    ...createFocusCommands(editor),
  };
}

export { resolveFocusSelection };
