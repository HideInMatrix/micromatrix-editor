import {
  type Mark as ProseMirrorMark,
  type MarkSpec,
  type Node as ProseMirrorNode,
  type NodeSpec,
  type ParseRule,
  Schema,
} from "@mxm-editor/pm";
import type { Editor } from "./Editor";
import type {
  AnyExtension,
  ExtensionAttribute,
  GlobalAttributes,
  MarkConfig,
  NodeConfig,
} from "./types";
import { cleanObject, mergeAttributes } from "./utils";

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

const staticEditor = {} as Editor;

function createStaticContext(extension: AnyExtension) {
  return extension.createContext(staticEditor);
}

function getAttributesForResolvedExtension(
  extension: AnyExtension,
  extensions: Extensions,
) {
  const context = createStaticContext(extension);
  const globalAttributes = getGlobalAttributesForResolvedExtension(
    extension,
    extensions,
  );

  return {
    ...globalAttributes,
    ...(extension.config.addAttributes?.call(context) ?? {}),
  } as Record<string, ExtensionAttribute>;
}

function getGlobalAttributesForResolvedExtension(
  extension: AnyExtension,
  extensions: Extensions,
) {
  return extensions.reduce<Record<string, ExtensionAttribute>>(
    (attributes, item) => {
      const context = createStaticContext(item);
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

function createAttributesSpec(
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

function injectParseAttributes<T extends ParseRule>(
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

export function resolveExtensions(extensions: Extensions): Extensions {
  const resolved: AnyExtension[] = [];

  const visit = (items: Extensions) => {
    items.forEach((extension) => {
      resolved.push(extension);

      const nested = extension.config.addExtensions?.call(
        createStaticContext(extension),
      );

      if (nested?.length) {
        visit(nested);
      }
    });
  };

  visit(extensions);

  return resolved.sort((a, b) => b.priority - a.priority);
}

export function splitExtensions(extensions: Extensions) {
  const resolved = resolveExtensions(extensions);

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
) {
  const resolved = resolveExtensions(extensions);

  return getAttributesForResolvedExtension(extension, resolved);
}

export function getAttributesForExtensionFromResolvedExtensions(
  extension: AnyExtension,
  extensions: Extensions,
) {
  return getAttributesForResolvedExtension(extension, extensions);
}

export function getAttributesFromResolvedExtensions(
  extensions: Extensions,
): ResolvedExtensionAttribute[] {
  return extensions.flatMap((extension) =>
    Object.entries(getAttributesForResolvedExtension(extension, extensions)).map(
      ([name, attribute]) => ({
        type: extension.name,
        name,
        attribute,
      }),
    ),
  );
}

export function getAttributesFromExtensions(
  extensions: Extensions,
): ResolvedExtensionAttribute[] {
  return getAttributesFromResolvedExtensions(resolveExtensions(extensions));
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

export function getSchemaByResolvedExtensions(extensions: Extensions) {
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
        const context = createStaticContext(node);
        const attributes = getAttributesForResolvedExtension(node, extensions);
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
        const context = createStaticContext(mark);
        const attributes = getAttributesForResolvedExtension(mark, extensions);
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
