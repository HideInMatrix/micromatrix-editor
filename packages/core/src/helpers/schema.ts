import {
  type Mark as ProseMirrorMark,
  type MarkSpec,
  type Node as ProseMirrorNode,
  type NodeSpec,
  type ParseRule,
  Schema,
} from "@mxm-editor/pm";
import type { Editor } from "../Editor";
import type {
  AnyExtension,
  ExtensionAttribute,
  GlobalAttributes,
  MarkConfig,
  NodeConfig,
} from "../types";
import { cleanObject, mergeAttributes } from "../utilities";

export type Extensions = AnyExtension[];

export interface ResolvedExtensionAttribute {
  type: string;
  name: string;
  attribute: ExtensionAttribute;
}

type ResolvedNodeExtension = AnyExtension & {
  type: "node";
  config: NodeConfig<any, any>;
};

type ResolvedMarkExtension = AnyExtension & {
  type: "mark";
  config: MarkConfig<any, any>;
};

type ExtensionContextFactory = (
  extension: AnyExtension,
) => ReturnType<AnyExtension["createContext"]>;

const staticEditor = {} as Editor;

function createStaticContext(extension: AnyExtension) {
  return extension.createContext(staticEditor);
}

function getGlobalAttributesForResolvedExtension(
  extension: AnyExtension,
  extensions: Extensions,
  createContext: ExtensionContextFactory,
) {
  return extensions.reduce<Record<string, ExtensionAttribute>>(
    (attributes, item) => {
      const context = createContext(item);
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

function getAttributesForResolvedExtension(
  extension: AnyExtension,
  extensions: Extensions,
  createContext: ExtensionContextFactory,
) {
  const context = createContext(extension);
  const globalAttributes = getGlobalAttributesForResolvedExtension(
    extension,
    extensions,
    createContext,
  );

  return {
    ...globalAttributes,
    ...(extension.config.addAttributes?.call(context) ?? {}),
  } as Record<string, ExtensionAttribute>;
}

export function createAttributesSpec(
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

export function injectParseAttributes<T extends ParseRule>(
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

        if (
          typeof HTMLElement === "undefined"
          || !(node instanceof HTMLElement)
        ) {
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

export function resolveExtensions(
  extensions: Extensions,
  createContext: ExtensionContextFactory = createStaticContext,
): Extensions {
  const resolved: AnyExtension[] = [];

  const visit = (items: Extensions) => {
    items.forEach((extension) => {
      resolved.push(extension);

      const nested = extension.config.addExtensions?.call(
        createContext(extension),
      );

      if (nested?.length) {
        visit(nested);
      }
    });
  };

  visit(extensions);

  return resolved.sort((a, b) => b.priority - a.priority);
}

export function splitExtensions(
  extensions: Extensions,
  createContext: ExtensionContextFactory = createStaticContext,
) {
  const resolved = resolveExtensions(extensions, createContext);

  return {
    nodeExtensions: resolved.filter(
      (extension): extension is ResolvedNodeExtension => extension.type === "node",
    ),
    markExtensions: resolved.filter(
      (extension): extension is ResolvedMarkExtension => extension.type === "mark",
    ),
  };
}

export function getAttributesForExtension(
  extension: AnyExtension,
  extensions: Extensions,
  createContext: ExtensionContextFactory = createStaticContext,
) {
  const resolved = resolveExtensions(extensions, createContext);

  return getAttributesForResolvedExtension(extension, resolved, createContext);
}

export function getAttributesForExtensionFromResolvedExtensions(
  extension: AnyExtension,
  extensions: Extensions,
  createContext: ExtensionContextFactory = createStaticContext,
) {
  return getAttributesForResolvedExtension(extension, extensions, createContext);
}

export function getAttributesFromResolvedExtensions(
  extensions: Extensions,
  createContext: ExtensionContextFactory = createStaticContext,
): ResolvedExtensionAttribute[] {
  return extensions.flatMap((extension) =>
    Object.entries(
      getAttributesForResolvedExtension(extension, extensions, createContext),
    ).map(([name, attribute]) => ({
      type: extension.name,
      name,
      attribute,
    })),
  );
}

export function getAttributesFromExtensions(
  extensions: Extensions,
  createContext: ExtensionContextFactory = createStaticContext,
): ResolvedExtensionAttribute[] {
  return getAttributesFromResolvedExtensions(
    resolveExtensions(extensions, createContext),
    createContext,
  );
}

export function getRenderedAttributes(
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

export function getSchemaByResolvedExtensions(
  extensions: Extensions,
  createContext: ExtensionContextFactory = createStaticContext,
) {
  const nodes = extensions.filter(
    (extension): extension is ResolvedNodeExtension => extension.type === "node",
  );
  const marks = extensions.filter(
    (extension): extension is ResolvedMarkExtension => extension.type === "mark",
  );
  const topNode = nodes.find((node) => node.config.topNode)?.name;

  return new Schema({
    topNode,
    nodes: Object.fromEntries(
      nodes.map((node) => {
        const context = createContext(node);
        const attributes = getAttributesForResolvedExtension(
          node,
          extensions,
          createContext,
        );
        const group =
          typeof node.config.group === "function"
            ? node.config.group.call(context)
            : node.config.group;
        const inline =
          typeof node.config.inline === "function"
            ? node.config.inline.call(context)
            : node.config.inline;
        const spec: NodeSpec = cleanObject({
          content: node.config.content,
          marks: node.config.marks,
          group,
          inline,
          atom: node.config.atom,
          selectable: node.config.selectable,
          draggable: node.config.draggable,
          code: node.config.code,
          defining: node.config.defining,
          isolating: node.config.isolating,
          attrs: createAttributesSpec(attributes),
          ...(node.config.extendNodeSchema ?? {}),
        });

        if (node.config.parseHTML) {
          spec.parseDOM = injectParseAttributes(
            node.config.parseHTML.call(context),
            attributes,
          );
        }

        if (node.config.renderHTML) {
          spec.toDOM = (pmNode: ProseMirrorNode) =>
            node.config.renderHTML!.call(context, {
              node: pmNode,
              HTMLAttributes: getRenderedAttributes(pmNode.attrs, attributes),
            });
        }

        return [node.name, spec];
      }),
    ),
    marks: Object.fromEntries(
      marks.map((mark) => {
        const context = createContext(mark);
        const attributes = getAttributesForResolvedExtension(
          mark,
          extensions,
          createContext,
        );
        const inclusive =
          typeof mark.config.inclusive === "function"
            ? mark.config.inclusive.call(context)
            : mark.config.inclusive;
        const spec: MarkSpec = cleanObject({
          inclusive,
          excludes: mark.config.excludes,
          group: mark.config.group,
          code: mark.config.code,
          attrs: createAttributesSpec(attributes),
        });

        if (mark.config.parseHTML) {
          spec.parseDOM = injectParseAttributes(
            mark.config.parseHTML.call(context),
            attributes,
          );
        }

        if (mark.config.renderHTML) {
          spec.toDOM = (pmMark: ProseMirrorMark) =>
            mark.config.renderHTML!.call(context, {
              mark: pmMark,
              HTMLAttributes: getRenderedAttributes(pmMark.attrs, attributes),
            });
        }

        return [mark.name, spec];
      }),
    ),
  });
}

export function getSchema(extensions: Extensions) {
  return getSchemaByResolvedExtensions(resolveExtensions(extensions));
}
