import { Extension } from "@mxm-editor/core";
import {
  BulletList,
} from "@mxm-editor/extension-bullet-list";
import {
  ListItem,
} from "@mxm-editor/extension-list-item";
import {
  ListKeymap,
  type ListKeymapOptions,
} from "@mxm-editor/extension-list-keymap";
import {
  OrderedList,
} from "@mxm-editor/extension-ordered-list";
import {
  TaskItem,
} from "@mxm-editor/extension-task-item";
import {
  TaskList,
} from "@mxm-editor/extension-task-list";

export interface ListKitOptions {
  bulletList: false | Record<string, never>;
  orderedList: false | Record<string, never>;
  listItem: false | Record<string, never>;
  taskList: false | Record<string, never>;
  taskItem: false | Record<string, never>;
  listKeymap: false | Partial<ListKeymapOptions>;
}

export const ListKit = Extension.create<ListKitOptions>({
  name: "listKit",

  addOptions() {
    return {
      bulletList: {},
      orderedList: {},
      listItem: {},
      taskList: {},
      taskItem: {},
      listKeymap: {},
    };
  },

  addExtensions() {
    const extensions = [];

    if (this.options.listItem !== false) {
      extensions.push(ListItem.configure(this.options.listItem));
    }

    if (this.options.bulletList !== false) {
      extensions.push(BulletList.configure(this.options.bulletList));
    }

    if (this.options.orderedList !== false) {
      extensions.push(OrderedList.configure(this.options.orderedList));
    }

    if (this.options.taskItem !== false) {
      extensions.push(TaskItem.configure(this.options.taskItem));
    }

    if (this.options.taskList !== false) {
      extensions.push(TaskList.configure(this.options.taskList));
    }

    if (this.options.listKeymap !== false) {
      extensions.push(ListKeymap.configure(this.options.listKeymap));
    }

    return extensions;
  },
});
