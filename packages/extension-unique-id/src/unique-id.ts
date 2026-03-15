import {
  Editor,
  Extension,
  type AnyExtension,
  type JSONContent,
} from "@mxm-editor/core";
import {
  Plugin,
  PluginKey,
  type Node as ProseMirrorNode,
  type Transaction,
} from "@mxm-editor/pm";

export interface GenerateIDContext {
  node: ProseMirrorNode;
  pos: number;
}

export interface UniqueIDOptions {
  attributeName: string;
  types: string[];
  generateID: (context: GenerateIDContext) => string;
  filterTransaction: ((transaction: Transaction) => boolean) | null;
  updateDocument: boolean;
}

interface UniqueIDUpdate {
  attrs: Record<string, any>;
  pos: number;
}

const uniqueIDPluginKey = new PluginKey("uniqueID");

function createFallbackID() {
  return `mxm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createRandomID() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return createFallbackID();
}

function getDataAttributeName(attributeName: string) {
  return `data-${attributeName}`;
}

function resolveUniqueID(
  seen: Set<string>,
  options: UniqueIDOptions,
  node: ProseMirrorNode,
  pos: number,
) {
  for (let attempts = 0; attempts < 100; attempts += 1) {
    const candidate = options.generateID({ node, pos }).trim();

    if (!candidate || seen.has(candidate)) {
      continue;
    }

    return candidate;
  }

  let fallback = createFallbackID();

  while (seen.has(fallback)) {
    fallback = createFallbackID();
  }

  return fallback;
}

function collectUniqueIDUpdates(
  doc: ProseMirrorNode,
  options: UniqueIDOptions,
) {
  const seen = new Set<string>();
  const updates: UniqueIDUpdate[] = [];

  doc.descendants((node, pos) => {
    if (!options.types.includes(node.type.name)) {
      return true;
    }

    const currentID = node.attrs[options.attributeName];

    if (typeof currentID === "string" && currentID.length > 0 && !seen.has(currentID)) {
      seen.add(currentID);
      return true;
    }

    const nextID = resolveUniqueID(seen, options, node, pos);

    seen.add(nextID);
    updates.push({
      pos,
      attrs: {
        ...node.attrs,
        [options.attributeName]: nextID,
      },
    });

    return true;
  });

  return updates;
}

function applyUniqueIDUpdates(
  transaction: Transaction,
  updates: UniqueIDUpdate[],
) {
  updates.forEach(({ pos, attrs }) => {
    transaction.setNodeMarkup(pos, undefined, attrs);
  });

  return transaction;
}

function getUniqueIDOptions(extensions: AnyExtension[]) {
  const editor = new Editor({
    extensions,
  });
  const extension = editor.extensionManager.extensions.find(
    (item) => item.name === "uniqueID",
  );

  if (!extension) {
    throw new Error("generateUniqueIds requires the UniqueID extension.");
  }

  return extension.options as UniqueIDOptions;
}

export function generateUniqueIds(
  doc: JSONContent,
  extensions: AnyExtension[],
) {
  const options = getUniqueIDOptions(extensions);

  if (!options.types.length) {
    return doc;
  }

  const editor = new Editor({
    extensions,
    content: doc,
  });
  const updates = collectUniqueIDUpdates(editor.state.doc, options);

  if (!updates.length) {
    return editor.state.doc.toJSON() as JSONContent;
  }

  return applyUniqueIDUpdates(editor.state.tr, updates).doc.toJSON() as JSONContent;
}

export const UniqueID = Extension.create<UniqueIDOptions>({
  name: "uniqueID",

  addOptions() {
    return {
      attributeName: "id",
      types: [],
      generateID: () => createRandomID(),
      filterTransaction: null,
      updateDocument: true,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          [this.options.attributeName]: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.getAttribute(getDataAttributeName(this.options.attributeName))
              ?? element.getAttribute(this.options.attributeName)
              ?? null,
            renderHTML: (attributes: Record<string, any>) => {
              const value = attributes[this.options.attributeName];

              if (!value) {
                return {} as Record<string, string>;
              }

              return {
                [getDataAttributeName(this.options.attributeName)]: String(value),
              };
            },
          },
        },
      },
    ];
  },

  onCreate() {
    if (!this.options.updateDocument || !this.editor.view) {
      return;
    }

    const updates = collectUniqueIDUpdates(this.editor.state.doc, this.options);

    if (!updates.length) {
      return;
    }

    this.editor.view.dispatch(
      applyUniqueIDUpdates(this.editor.state.tr, updates).setMeta(
        uniqueIDPluginKey,
        true,
      ),
    );
  },

  addProseMirrorPlugins() {
    if (!this.options.updateDocument) {
      return [];
    }

    return [
      new Plugin({
        key: uniqueIDPluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (transactions.some((transaction) => transaction.getMeta(uniqueIDPluginKey))) {
            return null;
          }

          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          if (
            this.options.filterTransaction
            && !transactions.every((transaction) => this.options.filterTransaction!(transaction))
          ) {
            return null;
          }

          const updates = collectUniqueIDUpdates(newState.doc, this.options);

          if (!updates.length) {
            return null;
          }

          return applyUniqueIDUpdates(newState.tr, updates).setMeta(
            uniqueIDPluginKey,
            true,
          );
        },
      }),
    ];
  },
});
