export type Attributes = Record<string, any>;

export type DOMOutputSpecElement = 0 | Attributes | DOMOutputSpecArray;

export type DOMOutputSpecArray =
  | [string]
  | [string, Attributes]
  | [string, 0]
  | [string, Attributes, 0]
  | [string, Attributes, DOMOutputSpecArray | 0]
  | [string, DOMOutputSpecArray];

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
  export type Element = DOMOutputSpecArray;

  export interface IntrinsicElements {
    [key: string]: any;
  }

  export interface ElementChildrenAttribute {
    children: unknown;
  }
}

export type JSXRenderer = (
  tag: "slot" | string | ((props?: Attributes) => DOMOutputSpecArray | DOMOutputSpecElement),
  props?: Attributes,
  ...children: JSXRenderer[]
) => DOMOutputSpecArray | DOMOutputSpecElement;

export function Fragment(props: { children: JSXRenderer[] }) {
  return props.children;
}

export const h: JSXRenderer = (tag, attributes) => {
  if (tag === "slot") {
    return 0;
  }

  if (tag instanceof Function) {
    return tag(attributes);
  }

  const { children, ...rest } = attributes ?? {};

  if (tag === "svg") {
    throw new Error(
      "SVG elements are not supported in the JSX syntax, use the array syntax instead",
    );
  }

  return [tag, rest, children];
};

export {
  h as createElement,
  h as jsx,
  h as jsxDEV,
  h as jsxs,
};
