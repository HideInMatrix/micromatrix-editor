import {
  DOMParser as ProseMirrorDOMParser,
  Fragment,
  Slice,
  type Node as ProseMirrorNode,
  type ParseOptions,
  type Schema,
} from "@mxm-editor/pm";
import type { Content, JSONContent } from "./types";

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

function parseStringContent(
  schema: Schema,
  content: string,
  parseOptions?: ParseOptions,
) {
  if (typeof document === "undefined") {
    return null;
  }

  const element = document.createElement("div");

  element.innerHTML = content;

  return ProseMirrorDOMParser.fromSchema(schema).parseSlice(element, parseOptions);
}

export function createFragmentFromContent(
  schema: Schema,
  content: Content,
  parseOptions?: ParseOptions,
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
    return parseStringContent(schema, content, parseOptions)?.content
      ?? Fragment.empty;
  }

  return Fragment.empty;
}

export function createSliceFromContent(
  schema: Schema,
  content: Content,
  parseOptions?: ParseOptions,
) {
  if (content === null) {
    return Slice.empty;
  }

  if (typeof content === "string") {
    return parseStringContent(schema, content, parseOptions)
      ?? Slice.empty;
  }

  return new Slice(
    createFragmentFromContent(schema, content, parseOptions),
    0,
    0,
  );
}

export function createDocumentFromContent(
  schema: Schema,
  content: Content,
  parseOptions?: ParseOptions,
) {
  if (content === null) {
    return schema.topNodeType.createAndFill() ?? schema.topNodeType.create();
  }

  if (isProseMirrorNode(content)) {
    const normalizedNode = normalizeProseMirrorNode(schema, content);

    if (normalizedNode.type === schema.topNodeType) {
      return normalizedNode;
    }

    return schema.topNodeType.createAndFill(
      null,
      Fragment.from(normalizedNode),
    ) ?? schema.topNodeType.create(null, Fragment.from(normalizedNode));
  }

  if (Array.isArray(content)) {
    return schema.topNodeType.createAndFill(
      null,
      Fragment.fromArray(content.map((item) => schema.nodeFromJSON(item))),
    ) ?? schema.topNodeType.create(
      null,
      Fragment.fromArray(content.map((item) => schema.nodeFromJSON(item))),
    );
  }

  if (isJSONContent(content)) {
    const node = schema.nodeFromJSON(content as JSONContent);

    if (node.type === schema.topNodeType) {
      return node;
    }

    return schema.topNodeType.createAndFill(
      null,
      Fragment.from(node),
    ) ?? schema.topNodeType.create(null, Fragment.from(node));
  }

  if (typeof content === "string" && typeof document !== "undefined") {
    const element = document.createElement("div");

    element.innerHTML = content;

    return ProseMirrorDOMParser.fromSchema(schema).parse(element, parseOptions);
  }

  return schema.topNodeType.createAndFill() ?? schema.topNodeType.create();
}
