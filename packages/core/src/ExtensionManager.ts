import {
  inputRules,
  keymap,
  type ParseRule,
  type Mark as PMMark,
  type MarkSpec,
  type Node as PMNode,
  type NodeViewConstructor,
  Plugin,
  Schema,
  type NodeSpec,
} from "@mxm-editor/pm";
import type { Editor } from "./Editor";
import { pasteRulesPlugin } from "./PasteRule";
import type {
  AnyExtension,
  ExtensionAttribute,
  ExtensionConfig,
  GlobalAttributes,
  MarkConfig,
  NodeViewRenderer,
  NodeConfig,
  RawCommands,
  ExtensionLike,
} from "./types";
import { cleanObject, mergeAttributes } from "./utils";

function includesExtension(
  setting: Editor["options"]["enableInputRules"],
  extension: AnyExtension,
) {
  if (setting === undefined || setting === true) {
    return true;
  }

  if (setting === false) {
    return false;
  }

  return setting.some((item) =>
    typeof item === "string" ? item === extension.name : item.name === extension.name,
  );
}

export class ExtensionManager {
  readonly editor: Editor;

  readonly extensions: AnyExtension[];

  readonly schema: Schema;

  readonly storage: Record<string, unknown>;

  constructor(extensions: AnyExtension[], editor: Editor) {
    this.editor = editor;
    this.extensions = this.resolveExtensions(extensions);
    this.storage = Object.fromEntries(
      this.extensions.map((extension) => [extension.name, extension.storage]),
    );
    this.onExtensionsResolved();
    this.schema = this.createSchema();
  }

  get commands(): RawCommands {
    return this.extensions.reduce<RawCommands>((commands, extension) => {
      const addCommands = extension.config.addCommands;

      if (!addCommands) {
        return commands;
      }

      return {
        ...commands,
        ...addCommands.call(extension.createContext(this.editor)),
      };
    }, {});
  }

  get plugins(): Plugin[] {
    const keyboardPlugins = this.extensions.flatMap((extension) => {
      const context = extension.createContext(this.editor);

      if (!extension.config.addKeyboardShortcuts) {
        return [];
      }

      return [keymap(extension.config.addKeyboardShortcuts.call(context))];
    });
    const inputRulePlugins = this.extensions.flatMap((extension) => {
      if (!includesExtension(this.editor.options.enableInputRules, extension)) {
        return [];
      }

      const context = extension.createContext(this.editor);
      const rules = extension.config.addInputRules?.call(context) ?? [];

      return rules.length ? [inputRules({ rules })] : [];
    });
    const pasteRules = this.extensions.flatMap((extension) => {
      if (!includesExtension(this.editor.options.enablePasteRules, extension)) {
        return [];
      }

      const context = extension.createContext(this.editor);

      return extension.config.addPasteRules?.call(context) ?? [];
    });
    const proseMirrorPlugins = this.extensions.flatMap((extension) => {
      const context = extension.createContext(this.editor);

      return extension.config.addProseMirrorPlugins?.call(context) ?? [];
    });

    return [
      ...keyboardPlugins,
      ...inputRulePlugins,
      ...(pasteRules.length ? [pasteRulesPlugin(pasteRules)] : []),
      ...proseMirrorPlugins,
    ];
  }

  get nodeViews(): Record<string, NodeViewConstructor> {
    const nodes = this.extensions.filter(
      (extension): extension is ExtensionLike<any, any, NodeConfig<any, any>> =>
        extension.type === "node" && Boolean(extension.config.addNodeView),
    );

    return Object.fromEntries(
      nodes.map((node) => {
        const context = node.createContext(this.editor);
        const renderNodeView = node.config.addNodeView?.call(context) as
          | NodeViewRenderer
          | undefined;
        const attributes = this.getAttributes(node);

        const nodeView: NodeViewConstructor = (
          pmNode,
          view,
          getPos,
          decorations,
          innerDecorations,
        ) =>
          renderNodeView!({
            node: pmNode,
            view,
            getPos,
            decorations,
            innerDecorations,
            editor: this.editor,
            extension: node,
            HTMLAttributes: this.getRenderedAttributes(pmNode.attrs, attributes),
            selected: false,
            updateAttributes: (nextAttributes) => {
              const position = typeof getPos === "function" ? getPos() : undefined;

              if (typeof position !== "number") {
                return;
              }

              const currentNode = view.state.doc.nodeAt(position);

              if (!currentNode) {
                return;
              }

              view.dispatch(
                view.state.tr.setNodeMarkup(position, undefined, {
                  ...currentNode.attrs,
                  ...nextAttributes,
                }),
              );
            },
            deleteNode: () => {
              const position = typeof getPos === "function" ? getPos() : undefined;

              if (typeof position !== "number") {
                return;
              }

              const currentNode = view.state.doc.nodeAt(position);

              if (!currentNode) {
                return;
              }

              view.dispatch(
                view.state.tr.delete(position, position + currentNode.nodeSize),
              );
            },
          });

        return [node.name, nodeView];
      }),
    );
  }

  onCreate() {
    this.extensions.forEach((extension) => {
      extension.config.onCreate?.call(extension.createContext(this.editor));
    });
  }

  onUpdate(transaction: Parameters<NonNullable<ExtensionConfig["onUpdate"]>>[0]["transaction"]) {
    this.extensions.forEach((extension) => {
      extension.config.onUpdate?.call(extension.createContext(this.editor), {
        transaction,
      });
    });
  }

  onDestroy() {
    this.extensions.forEach((extension) => {
      extension.config.onDestroy?.call(extension.createContext(this.editor));
    });
  }

  private onExtensionsResolved() {
    this.extensions.forEach((extension) => {
      extension.config.onExtensionsResolved?.call(
        extension.createContext(this.editor),
        {
          extensions: this.extensions,
        },
      );
    });
  }

  private resolveExtensions(extensions: AnyExtension[]) {
    const resolved: AnyExtension[] = [];

    const visit = (items: AnyExtension[]) => {
      items.forEach((extension) => {
        resolved.push(extension);

        const nested = extension.config.addExtensions?.call(
          extension.createContext(this.editor),
        );

        if (nested?.length) {
          visit(nested);
        }
      });
    };

    visit(extensions);

    return resolved.sort((a, b) => b.priority - a.priority);
  }

  private createSchema() {
    const nodes = this.extensions.filter(
      (extension): extension is ExtensionLike<any, any, NodeConfig<any, any>> =>
        extension.type === "node",
    );
    const marks = this.extensions.filter(
      (extension): extension is ExtensionLike<any, any, MarkConfig<any, any>> =>
        extension.type === "mark",
    );
    const topNode = nodes.find((node) => node.config.topNode)?.name;

    return new Schema({
      topNode,
      nodes: Object.fromEntries(
        nodes.map((node) => {
          const context = node.createContext(this.editor);
          const attributes = this.getAttributes(node);
          const spec: NodeSpec = cleanObject({
            content: node.config.content,
            marks: node.config.marks,
            group: node.config.group,
            inline: node.config.inline,
            atom: node.config.atom,
            selectable: node.config.selectable,
            draggable: node.config.draggable,
            code: node.config.code,
            defining: node.config.defining,
            attrs: this.createAttributesSpec(attributes),
            ...(node.config.extendNodeSchema ?? {}),
          });

          if (node.config.parseHTML) {
            spec.parseDOM = this.injectParseAttributes(
              node.config.parseHTML.call(context),
              attributes,
            );
          }

          if (node.config.renderHTML) {
            spec.toDOM = (pmNode: PMNode) =>
              node.config.renderHTML!.call(context, {
                node: pmNode,
                HTMLAttributes: this.getRenderedAttributes(
                  pmNode.attrs,
                  attributes,
                ),
              });
          }

          return [node.name, spec];
        }),
      ),
      marks: Object.fromEntries(
        marks.map((mark) => {
          const context = mark.createContext(this.editor);
          const attributes = this.getAttributes(mark);
          const spec: MarkSpec = cleanObject({
            inclusive: mark.config.inclusive,
            excludes: mark.config.excludes,
            group: mark.config.group,
            code: mark.config.code,
            attrs: this.createAttributesSpec(attributes),
          });

          if (mark.config.parseHTML) {
            spec.parseDOM = this.injectParseAttributes(
              mark.config.parseHTML.call(context),
              attributes,
            );
          }

          if (mark.config.renderHTML) {
            spec.toDOM = (pmMark: PMMark) =>
              mark.config.renderHTML!.call(context, {
                mark: pmMark,
                HTMLAttributes: this.getRenderedAttributes(
                  pmMark.attrs,
                  attributes,
                ),
              });
          }

          return [mark.name, spec];
        }),
      ),
    });
  }

  private getAttributes(extension: AnyExtension) {
    const context = extension.createContext(this.editor);
    const globalAttributes = this.getGlobalAttributes(extension);

    return {
      ...globalAttributes,
      ...(
        extension.config.addAttributes?.call(context) ?? {}
      ),
    } as Record<string, ExtensionAttribute>;
  }

  private getGlobalAttributes(extension: AnyExtension) {
    return this.extensions.reduce<Record<string, ExtensionAttribute>>(
      (attributes, item) => {
        const context = item.createContext(this.editor);
        const globalAttributes = item.config.addGlobalAttributes?.call(context) ?? [];

        globalAttributes.forEach((globalAttribute: GlobalAttributes) => {
          if (!globalAttribute.types.includes(extension.name)) {
            return;
          }

          Object.assign(attributes, globalAttribute.attributes);
        });

        return attributes;
      },
      {},
    );
  }

  private createAttributesSpec(
    attributes: Record<string, ExtensionAttribute>,
  ): Record<string, { default?: any }> {
    return Object.fromEntries(
      Object.entries(attributes).map(([name, attribute]) => {
        const spec: { default?: any } = {};

        if ("default" in attribute) {
          spec.default = attribute.default;
        }

        return [name, spec];
      }),
    );
  }

  private injectParseAttributes<T extends ParseRule>(
    rules: readonly T[] | undefined,
    attributes: Record<string, ExtensionAttribute>,
  ) {
    if (!rules?.length) {
      return rules;
    }

    return rules.map((rule) => {
      const originalGetAttrs = rule.getAttrs;
      const staticAttrs =
        "attrs" in rule && rule.attrs && typeof rule.attrs === "object"
          ? rule.attrs
          : null;

      return {
        ...rule,
        getAttrs: (node: string | Node) => {
          const derivedAttrs =
            typeof originalGetAttrs === "function"
              ? (originalGetAttrs as (value: unknown) => Record<string, any> | false | null)(node)
              : null;

          const baseAttrs = {
            ...(staticAttrs ?? {}),
            ...(derivedAttrs && typeof derivedAttrs === "object" ? derivedAttrs : {}),
          };

          if (derivedAttrs === false) {
            return false;
          }

          if (!(node instanceof HTMLElement)) {
            return baseAttrs;
          }

          return {
            ...baseAttrs,
            ...Object.fromEntries(
              Object.entries(attributes).map(([name, attribute]) => [
                name,
                attribute.parseHTML
                  ? attribute.parseHTML(node)
                  : baseAttrs[name]
                    ?? node.getAttribute(name)
                    ?? attribute.default,
              ]),
            ),
          };
        },
      };
    }) as T[];
  }

  private getRenderedAttributes(
    attrs: Record<string, any>,
    attributes: Record<string, ExtensionAttribute>,
  ) {
    return Object.entries(attributes).reduce<Record<string, string>>(
      (rendered, [name, attribute]) => {
        const value = attrs[name];

        if (attribute.renderHTML) {
          return mergeAttributes(rendered, attribute.renderHTML(attrs));
        }

        if (value === undefined || value === null) {
          return rendered;
        }

        return mergeAttributes(rendered, {
          [name]: String(value),
        });
      },
      {},
    );
  }
}
