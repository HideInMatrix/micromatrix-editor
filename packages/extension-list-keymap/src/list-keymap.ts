import { Extension, type Editor } from "@mxm-editor/core";
import { liftListItem } from "@mxm-editor/pm";

export interface ListKeymapType {
  itemName: string;
  wrapperNames: string[];
}

export interface ListKeymapOptions {
  listTypes: ListKeymapType[];
}

function createListTypeNameSet(listTypes: ListKeymapType[]) {
  return new Set(
    listTypes.flatMap((listType) => [
      listType.itemName,
      ...listType.wrapperNames,
    ]),
  );
}

function isInConfiguredList(
  editor: Editor,
  listType: ListKeymapType,
) {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name !== listType.itemName) {
      continue;
    }

    if (
      listType.wrapperNames.length === 0
      || (
        depth > 1
        && listType.wrapperNames.includes($from.node(depth - 1).type.name)
      )
    ) {
      return true;
    }
  }

  return false;
}

function isAtStartOfListItem(
  editor: Editor,
  itemDepth: number,
) {
  const { $from } = editor.state.selection;

  if ($from.parentOffset !== 0) {
    return false;
  }

  for (let depth = itemDepth; depth < $from.depth; depth += 1) {
    if ($from.index(depth) !== 0) {
      return false;
    }
  }

  return true;
}

function isNestedInAnotherList(
  editor: Editor,
  wrapperDepth: number,
  listTypeNames: Set<string>,
) {
  const { $from } = editor.state.selection;

  for (let depth = wrapperDepth - 1; depth > 0; depth -= 1) {
    if (listTypeNames.has($from.node(depth).type.name)) {
      return true;
    }
  }

  return false;
}

function findListItemDepth(
  editor: Editor,
  listType: ListKeymapType,
) {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name !== listType.itemName) {
      continue;
    }

    const wrapperDepth = depth - 1;

    if (
      wrapperDepth < 1
      || (
        listType.wrapperNames.length > 0
        && !listType.wrapperNames.includes($from.node(wrapperDepth).type.name)
      )
    ) {
      continue;
    }

    return {
      itemDepth: depth,
      wrapperDepth,
    };
  }

  return null;
}

export const ListKeymap = Extension.create<ListKeymapOptions>({
  name: "listKeymap",

  addOptions() {
    return {
      listTypes: [
        {
          itemName: "listItem",
          wrapperNames: ["bulletList", "orderedList"],
        },
        {
          itemName: "taskItem",
          wrapperNames: ["taskList"],
        },
      ],
    };
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { selection } = this.editor.state;
        const listTypeNames = createListTypeNameSet(this.options.listTypes);

        if (
          !selection.empty
          || !selection.$from.parent.isTextblock
        ) {
          return false;
        }

        return this.options.listTypes.some((listType) => {
          if (!isInConfiguredList(this.editor, listType)) {
            return false;
          }

          const context = findListItemDepth(this.editor, listType);

          if (
            !context
            || !isAtStartOfListItem(this.editor, context.itemDepth)
          ) {
            return false;
          }

          const shouldLift =
            selection.$from.parent.content.size === 0
            || isNestedInAnotherList(
              this.editor,
              context.wrapperDepth,
              listTypeNames,
            );

          if (!shouldLift) {
            return false;
          }

          const itemType = this.editor.schema.nodes[listType.itemName];

          if (!itemType) {
            return false;
          }

          return liftListItem(itemType)(
            this.editor.state,
            this.editor.view?.dispatch,
          );
        });
      },
    };
  },
});
