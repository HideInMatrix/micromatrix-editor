import { Extension } from "../Extension";
import { createCoreCommands } from "../commands";

export const Commands = Extension.create({
  name: "commands",

  addCommands() {
    return {
      ...createCoreCommands(this.editor),
    };
  },
});
