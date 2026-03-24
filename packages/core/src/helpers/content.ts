import {
  DOMParser as ProseMirrorDOMParser,
  Fragment,
  Schema,
  Slice,
  type Node as ProseMirrorNode,
  type ParseOptions,
} from "@mxm-editor/pm";
import type {
  Content,
  ContentType,
  JSONContent,
  MarkdownParser,
} from "../types";

export interface ContentParseOptions {
  parseOptions?: ParseOptions;
  contentType?: ContentType;
  markdown?: MarkdownParser | null;
  errorOnInvalidContent?: boolean;
}

const invalidJsonContentErrorMessage = "[mxm-editor error]: Invalid JSON content";
const invalidHtmlContentErrorMessage = "[mxm-editor error]: Invalid HTML content";

function isJSONContent(value: Content): value is JSONContent {
  return Boolean(
    value
      && typeof value === "object"
      && !Array.isArray(value)
      && !("nodeSize" in value),
  );
}

function isProseMirrorNode(value: Content): value is ProseMirrorNode {
  return Boolean(
    value
      && typeof value === "object"
      && !Array.isArray(value)
      && "nodeSize" in value,
  );
}

function normalizeProseMirrorNode(
  schema: Schema,
  node: ProseMirrorNode,
) {
  return node.type.schema === schema
    ? node
    : schema.nodeFromJSON(node.toJSON() as JSONContent);
}

function createEmptyDocument(schema: Schema) {
  return schema.topNodeType.createAndFill() ?? schema.topNodeType.create();
}

function createContentError(message: string, cause: unknown) {
  return new Error(message, {
    cause: cause instanceof Error ? cause : undefined,
  });
}

function warnInvalidContent(content: Content, error: unknown) {
  console.warn("[mxm-editor warn]: Invalid content.", "Passed value:", content, "Error:", error);
}

function createInvalidJSONContentFallback(
  schema: Schema,
  content: Content,
  options: ContentParseOptions | undefined,
  error: unknown,
) {
  if (options?.errorOnInvalidContent) {
    throw createContentError(invalidJsonContentErrorMessage, error);
  }

  warnInvalidContent(content, error);

  return createEmptyDocument(schema);
}

function createContentElement(content: string) {
  const element = document.createElement("div");

  element.innerHTML = content;

  return element;
}

function ensureValidNode(
  node: ProseMirrorNode,
  errorOnInvalidContent: boolean | undefined,
  message: string,
) {
  if (!errorOnInvalidContent) {
    return node;
  }

  try {
    node.check();
    return node;
  } catch (error) {
    throw createContentError(message, error);
  }
}

function ensureValidFragment(
  fragment: Fragment,
  errorOnInvalidContent: boolean | undefined,
  message: string,
) {
  if (!errorOnInvalidContent) {
    return fragment;
  }

  try {
    fragment.forEach((node) => {
      node.check();
    });

    return fragment;
  } catch (error) {
    throw createContentError(message, error);
  }
}

function validateHTMLContent(
  schema: Schema,
  content: string,
  parseOptions: ParseOptions | undefined,
) {
  if (typeof document === "undefined") {
    return;
  }

  let hasInvalidContent = false;
  let invalidContent = "";
  const contentCheckSchema = new Schema({
    topNode: schema.spec.topNode,
    marks: schema.spec.marks,
    nodes: schema.spec.nodes.append({
      __mxm_editor_private_unknown_catch_all_node: {
        content: "inline*",
        group: "block",
        parseDOM: [
          {
            tag: "*",
            getAttrs: (value) => {
              hasInvalidContent = true;
              invalidContent = typeof value === "string"
                ? value
                : value instanceof HTMLElement
                  ? value.outerHTML
                  : String(value);
              return null;
            },
          },
        ],
      },
    }),
  });

  ProseMirrorDOMParser.fromSchema(contentCheckSchema).parse(
    createContentElement(content),
    parseOptions,
  );

  if (hasInvalidContent) {
    throw createContentError(
      invalidHtmlContentErrorMessage,
      new Error(`Invalid element found: ${invalidContent}`),
    );
  }
}

export function isInvalidContentError(error: unknown): error is Error {
  return error instanceof Error
    && [
      invalidJsonContentErrorMessage,
      invalidHtmlContentErrorMessage,
    ].includes(error.message);
}

function parseStringContent(
  schema: Schema,
  content: string,
  options?: ContentParseOptions,
) {
  if (options?.contentType === "markdown") {
    if (!options.markdown) {
      throw new Error("Markdown content requires the Markdown extension.");
    }

    const document = normalizeProseMirrorNode(
      schema,
      options.markdown.parse(content),
    );

    return new Slice(document.content, 0, 0);
  }

  if (typeof document === "undefined") {
    return null;
  }

  const element = createContentElement(content);

  return ProseMirrorDOMParser.fromSchema(schema).parseSlice(
    element,
    options?.parseOptions,
  );
}

export function createFragmentFromContent(
  schema: Schema,
  content: Content,
  options?: ContentParseOptions,
) {
  if (content === null) {
    return Fragment.empty;
  }

  if (Array.isArray(content)) {
    return Fragment.fromArray(
      content.map((item) => schema.nodeFromJSON(item)),
    );
  }

  if (isProseMirrorNode(content)) {
    const normalizedNode = normalizeProseMirrorNode(schema, content);

    return normalizedNode.type === schema.topNodeType
      ? normalizedNode.content
      : Fragment.from(normalizedNode);
  }

  if (isJSONContent(content)) {
    const node = schema.nodeFromJSON(content as JSONContent);

    return node.type === schema.topNodeType
      ? node.content
      : Fragment.from(node);
  }

  if (typeof content === "string") {
    return parseStringContent(schema, content, options)?.content
      ?? Fragment.empty;
  }

  return Fragment.empty;
}

export function createSliceFromContent(
  schema: Schema,
  content: Content,
  options?: ContentParseOptions,
) {
  if (content === null) {
    return Slice.empty;
  }

  if (typeof content === "string") {
    try {
      if (options?.errorOnInvalidContent && options.contentType !== "markdown") {
        validateHTMLContent(schema, content, options.parseOptions);
      }

      const slice = parseStringContent(schema, content, options)
        ?? Slice.empty;

      ensureValidFragment(
        slice.content,
        options?.errorOnInvalidContent,
        options?.contentType === "markdown"
          ? invalidJsonContentErrorMessage
          : invalidHtmlContentErrorMessage,
      );

      return slice;
    } catch (error) {
      if (options?.errorOnInvalidContent && isInvalidContentError(error)) {
        throw error;
      }

      if (options?.errorOnInvalidContent) {
        throw createContentError(
          options?.contentType === "markdown"
            ? invalidJsonContentErrorMessage
            : invalidHtmlContentErrorMessage,
          error,
        );
      }

      warnInvalidContent(content, error);

      return Slice.empty;
    }
  }

  try {
    const fragment = createFragmentFromContent(schema, content, options);

    return new Slice(
      ensureValidFragment(
        fragment,
        options?.errorOnInvalidContent,
        invalidJsonContentErrorMessage,
      ),
      0,
      0,
    );
  } catch (error) {
    if (options?.errorOnInvalidContent && isInvalidContentError(error)) {
      throw error;
    }

    if (options?.errorOnInvalidContent) {
      throw createContentError(invalidJsonContentErrorMessage, error);
    }

    warnInvalidContent(content, error);

    return Slice.empty;
  }
}

export function createDocumentFromContent(
  schema: Schema,
  content: Content,
  options?: ContentParseOptions,
) {
  if (content === null) {
    return createEmptyDocument(schema);
  }

  if (isProseMirrorNode(content)) {
    try {
      const normalizedNode = normalizeProseMirrorNode(schema, content);
      const documentNode = normalizedNode.type === schema.topNodeType
        ? normalizedNode
        : (
          schema.topNodeType.createAndFill(
            null,
            Fragment.from(normalizedNode),
          ) ?? schema.topNodeType.create(null, Fragment.from(normalizedNode))
        );

      return ensureValidNode(
        documentNode,
        options?.errorOnInvalidContent,
        invalidJsonContentErrorMessage,
      );
    } catch (error) {
      return createInvalidJSONContentFallback(schema, content, options, error);
    }
  }

  if (Array.isArray(content)) {
    try {
      const documentNode = schema.topNodeType.createAndFill(
        null,
        Fragment.fromArray(content.map((item) => schema.nodeFromJSON(item))),
      ) ?? schema.topNodeType.create(
        null,
        Fragment.fromArray(content.map((item) => schema.nodeFromJSON(item))),
      );

      return ensureValidNode(
        documentNode,
        options?.errorOnInvalidContent,
        invalidJsonContentErrorMessage,
      );
    } catch (error) {
      return createInvalidJSONContentFallback(schema, content, options, error);
    }
  }

  if (isJSONContent(content)) {
    try {
      const node = schema.nodeFromJSON(content as JSONContent);
      const documentNode = node.type === schema.topNodeType
        ? node
        : (
          schema.topNodeType.createAndFill(
            null,
            Fragment.from(node),
          ) ?? schema.topNodeType.create(null, Fragment.from(node))
        );

      return ensureValidNode(
        documentNode,
        options?.errorOnInvalidContent,
        invalidJsonContentErrorMessage,
      );
    } catch (error) {
      return createInvalidJSONContentFallback(schema, content, options, error);
    }
  }

  if (typeof content === "string" && options?.contentType === "markdown") {
    if (!options.markdown) {
      throw new Error("Markdown content requires the Markdown extension.");
    }

    try {
      const node = normalizeProseMirrorNode(
        schema,
        options.markdown.parse(content),
      );
      const documentNode = node.type === schema.topNodeType
        ? node
        : (
          schema.topNodeType.createAndFill(
            null,
            Fragment.from(node),
          ) ?? schema.topNodeType.create(null, Fragment.from(node))
        );

      return ensureValidNode(
        documentNode,
        options?.errorOnInvalidContent,
        invalidJsonContentErrorMessage,
      );
    } catch (error) {
      return createInvalidJSONContentFallback(schema, content, options, error);
    }
  }

  if (typeof content === "string" && typeof document !== "undefined") {
    if (options?.errorOnInvalidContent) {
      validateHTMLContent(schema, content, options.parseOptions);
    }

    return ensureValidNode(
      ProseMirrorDOMParser.fromSchema(schema).parse(
        createContentElement(content),
        options?.parseOptions,
      ),
      options?.errorOnInvalidContent,
      invalidHtmlContentErrorMessage,
    );
  }

  return createEmptyDocument(schema);
}
