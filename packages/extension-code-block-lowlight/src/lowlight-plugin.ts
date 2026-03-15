import { findChildren } from "@mxm-editor/core";
import { Decoration, DecorationSet, Plugin, PluginKey } from "@mxm-editor/pm";

interface LowlightLike {
  highlight: (language: string, value: string) => any;
  highlightAuto: (value: string) => any;
  listLanguages: () => string[];
}

function parseNodes(
  nodes: any[],
  classNames: string[] = [],
): Array<{ text: string; classes: string[] }> {
  return nodes.flatMap((node) => {
    const classes = [
      ...classNames,
      ...(
        Array.isArray(node?.properties?.className)
          ? node.properties.className
          : []
      ),
    ];

    if (Array.isArray(node?.children)) {
      return parseNodes(node.children, classes);
    }

    return typeof node?.value === "string"
      ? [
          {
            text: node.value,
            classes,
          },
        ]
      : [];
  });
}

function getHighlightNodes(result: any) {
  return result?.value ?? result?.children ?? [];
}

function getDecorations({
  doc,
  name,
  lowlight,
  defaultLanguage,
}: {
  doc: any;
  name: string;
  lowlight: LowlightLike;
  defaultLanguage?: string | null;
}) {
  const decorations: Decoration[] = [];

  findChildren(doc, (node) => node.type.name === name).forEach((block) => {
    let from = block.pos + 1;
    const language = block.node.attrs.language || defaultLanguage;
    const hasLanguage =
      typeof language === "string"
      && lowlight.listLanguages().includes(language);
    const nodes = hasLanguage
      ? getHighlightNodes(lowlight.highlight(language, block.node.textContent))
      : getHighlightNodes(lowlight.highlightAuto(block.node.textContent));

    parseNodes(nodes).forEach((item) => {
      const to = from + item.text.length;

      if (item.classes.length) {
        decorations.push(
          Decoration.inline(from, to, {
            class: item.classes.join(" "),
          }),
        );
      }

      from = to;
    });
  });

  return DecorationSet.create(doc, decorations);
}

export interface LowlightPluginOptions {
  name: string;
  lowlight: LowlightLike;
  defaultLanguage?: string | null;
}

export function LowlightPlugin({
  name,
  lowlight,
  defaultLanguage = null,
}: LowlightPluginOptions) {
  if (
    typeof lowlight?.highlight !== "function"
    || typeof lowlight?.highlightAuto !== "function"
    || typeof lowlight?.listLanguages !== "function"
  ) {
    throw new Error(
      "You should provide a lowlight instance to use the code-block-lowlight extension.",
    );
  }

  const pluginKey = new PluginKey("lowlight");

  return new Plugin({
    key: pluginKey,
    state: {
      init: (_, state) =>
        getDecorations({
          doc: state.doc,
          name,
          lowlight,
          defaultLanguage,
        }),
      apply: (transaction, decorationSet) => {
        if (!transaction.docChanged) {
          return decorationSet.map(transaction.mapping, transaction.doc);
        }

        return getDecorations({
          doc: transaction.doc,
          name,
          lowlight,
          defaultLanguage,
        });
      },
    },
    props: {
      decorations(state) {
        return pluginKey.getState(state);
      },
    },
  });
}
