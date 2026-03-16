import {
  type AnyExtension,
  getAttributesFromResolvedExtensions,
  getSchemaByResolvedExtensions,
  resolveExtensions,
  type Extensions,
  type JSONContent,
  type MarkConfig,
  type NodeConfig,
  type ResolvedExtensionAttribute,
} from "@mxm-editor/core";
import type { Editor } from "@mxm-editor/core";
import type {
  DOMOutputSpec,
  Mark as ProseMirrorMark,
  Node as ProseMirrorNode,
} from "@mxm-editor/pm";
import { Node as ProseMirrorNodeCtor } from "@mxm-editor/pm";
import { getHTMLAttributes } from "../helpers";
import type {
  MarkProps,
  NodeProps,
  TiptapStaticRendererOptions,
} from "../json/renderer";

type ResolvedNodeExtension = AnyExtension & {
  type: "node";
  config: NodeConfig<any, any>;
};

type ResolvedMarkExtension = AnyExtension & {
  type: "mark";
  config: MarkConfig<any, any>;
};

export type DomOutputSpecToElement<T> = (
  content: DOMOutputSpec,
) => (children?: T | T[]) => T;

const staticEditor = {} as Editor;

export function mapNodeExtensionToRenderNode<T>(
  domOutputSpecToElement: DomOutputSpecToElement<T>,
  extension: ResolvedNodeExtension,
  extensionAttributes: ResolvedExtensionAttribute[],
  options?: Partial<Pick<TiptapStaticRendererOptions<T, ProseMirrorMark, ProseMirrorNode>, "unhandledNode">>,
): [string, (props: NodeProps<ProseMirrorNode, T | T[]>) => T] {
  const renderHTML = extension.config.renderHTML;
  const context = extension.createContext(staticEditor);

  if (!renderHTML) {
    if (options?.unhandledNode) {
      return [extension.name, options.unhandledNode];
    }

    return [
      extension.name,
      () => {
        throw new Error(
          `[mxm-editor]: Node ${extension.name} cannot be rendered because it is missing renderHTML().`,
        );
      },
    ];
  }

  return [
    extension.name,
    ({ node, children }) =>
      domOutputSpecToElement(
        renderHTML.call(context, {
          node,
          HTMLAttributes: getHTMLAttributes(node, extensionAttributes),
        }),
      )(children),
  ];
}

export function mapMarkExtensionToRenderNode<T>(
  domOutputSpecToElement: DomOutputSpecToElement<T>,
  extension: ResolvedMarkExtension,
  extensionAttributes: ResolvedExtensionAttribute[],
  options?: Partial<Pick<TiptapStaticRendererOptions<T, ProseMirrorMark, ProseMirrorNode>, "unhandledMark">>,
): [string, (props: MarkProps<ProseMirrorMark, T | T[]>) => T] {
  const renderHTML = extension.config.renderHTML;
  const context = extension.createContext(staticEditor);

  if (!renderHTML) {
    if (options?.unhandledMark) {
      return [extension.name, options.unhandledMark];
    }

    return [
      extension.name,
      () => {
        throw new Error(
          `[mxm-editor]: Mark ${extension.name} cannot be rendered because it is missing renderHTML().`,
        );
      },
    ];
  }

  return [
    extension.name,
    ({ mark, children }) =>
      domOutputSpecToElement(
        renderHTML.call(context, {
          mark,
          HTMLAttributes: getHTMLAttributes(mark, extensionAttributes),
        }),
      )(children),
  ];
}

export function renderToElement<T>({
  renderer,
  domOutputSpecToElement,
  mapDefinedTypes,
  content,
  extensions,
  options,
}: {
  renderer: (
    options: TiptapStaticRendererOptions<T, ProseMirrorMark, ProseMirrorNode>,
  ) => (ctx: { content: ProseMirrorNode }) => T;
  domOutputSpecToElement: DomOutputSpecToElement<T>;
  mapDefinedTypes: {
    doc: (props: NodeProps<ProseMirrorNode, T | T[]>) => T;
    text: (props: NodeProps<ProseMirrorNode, T | T[]>) => T;
  };
  content: ProseMirrorNode | JSONContent;
  extensions: Extensions;
  options?: Partial<TiptapStaticRendererOptions<T, ProseMirrorMark, ProseMirrorNode>>;
}) {
  const resolvedExtensions = resolveExtensions(extensions);
  const extensionAttributes = getAttributesFromResolvedExtensions(resolvedExtensions);
  const nodeExtensions = resolvedExtensions.filter(
    (extension): extension is ResolvedNodeExtension =>
      extension.type === "node",
  );
  const markExtensions = resolvedExtensions.filter(
    (extension): extension is ResolvedMarkExtension =>
      extension.type === "mark",
  );

  if (!(content instanceof ProseMirrorNodeCtor)) {
    content = ProseMirrorNodeCtor.fromJSON(
      getSchemaByResolvedExtensions(resolvedExtensions),
      content,
    );
  }

  return renderer({
    ...options,
    nodeMapping: {
      ...Object.fromEntries(
        nodeExtensions
          .filter((extension) => {
            if (extension.name in mapDefinedTypes) {
              return false;
            }

            if (options?.nodeMapping) {
              return !(extension.name in options.nodeMapping);
            }

            return true;
          })
          .map((extension) =>
            mapNodeExtensionToRenderNode(
              domOutputSpecToElement,
              extension,
              extensionAttributes,
              options,
            ),
          ),
      ),
      ...mapDefinedTypes,
      ...options?.nodeMapping,
    },
    markMapping: {
      ...Object.fromEntries(
        markExtensions
          .filter((extension) => {
            if (options?.markMapping) {
              return !(extension.name in options.markMapping);
            }

            return true;
          })
          .map((extension) =>
            mapMarkExtensionToRenderNode(
              domOutputSpecToElement,
              extension,
              extensionAttributes,
              options,
            ),
          ),
      ),
      ...options?.markMapping,
    },
  })({
    content,
  });
}
