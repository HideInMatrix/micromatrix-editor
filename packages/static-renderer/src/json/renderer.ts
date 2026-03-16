export interface NodeProps<TNodeType = any, TChildren = any> {
  node: TNodeType;
  parent?: TNodeType;
  children?: TChildren;
  renderElement: (props: { content: TNodeType; parent?: TNodeType }) => TChildren;
}

export interface MarkProps<TMarkType = any, TChildren = any, TNodeType = any> {
  mark: TMarkType;
  children?: TChildren;
  node: TNodeType;
  parent?: TNodeType;
}

export interface TiptapStaticRendererOptions<
  TReturnType,
  TMarkType extends { type: string | { name: string } } = { type: string },
  TNodeType extends {
    content?: { forEach: (cb: (node: TNodeType) => void) => void };
    marks?: readonly { type: string | { name: string } }[];
    type: string | { name: string };
  } = { type: string },
  TNodeRender extends (
    ctx: NodeProps<TNodeType, TReturnType | TReturnType[]>,
  ) => TReturnType = (
    ctx: NodeProps<TNodeType, TReturnType | TReturnType[]>,
  ) => TReturnType,
  TMarkRender extends (
    ctx: MarkProps<TMarkType, TReturnType | TReturnType[], TNodeType>,
  ) => TReturnType = (
    ctx: MarkProps<TMarkType, TReturnType | TReturnType[], TNodeType>,
  ) => TReturnType,
> {
  nodeMapping: Record<string, TNodeRender>;
  markMapping: Record<string, TMarkRender>;
  unhandledNode?: TNodeRender;
  unhandledMark?: TMarkRender;
}

export function TiptapStaticRenderer<
  TReturnType,
  TMarkType extends { type: string | { name: string } } = { type: string },
  TNodeType extends {
    content?: { forEach: (cb: (node: TNodeType) => void) => void };
    marks?: readonly { type: string | { name: string } }[];
    type: string | { name: string };
  } = { type: string },
  TNodeRender extends (
    ctx: NodeProps<TNodeType, TReturnType | TReturnType[]>,
  ) => TReturnType = (
    ctx: NodeProps<TNodeType, TReturnType | TReturnType[]>,
  ) => TReturnType,
  TMarkRender extends (
    ctx: MarkProps<TMarkType, TReturnType | TReturnType[], TNodeType>,
  ) => TReturnType = (
    ctx: MarkProps<TMarkType, TReturnType | TReturnType[], TNodeType>,
  ) => TReturnType,
>(
  renderComponent: (
    ctx:
      | {
          component: TNodeRender;
          props: NodeProps<TNodeType, TReturnType | TReturnType[]>;
        }
      | {
          component: TMarkRender;
          props: MarkProps<TMarkType, TReturnType | TReturnType[], TNodeType>;
        },
  ) => TReturnType,
  {
    nodeMapping,
    markMapping,
    unhandledNode,
    unhandledMark,
  }: TiptapStaticRendererOptions<
    TReturnType,
    TMarkType,
    TNodeType,
    TNodeRender,
    TMarkRender
  >,
) {
  return function renderContent({
    content,
    parent,
  }: {
    content: TNodeType;
    parent?: TNodeType;
  }): TReturnType {
    const nodeType =
      typeof content.type === "string" ? content.type : content.type.name;
    const NodeHandler = nodeMapping[nodeType] ?? unhandledNode;

    if (!NodeHandler) {
      throw new Error(`missing handler for node type ${nodeType}`);
    }

    const nodeContent = renderComponent({
      component: NodeHandler,
      props: {
        node: content,
        parent,
        renderElement: renderContent,
        get children() {
          const children: TReturnType[] = [];

          content.content?.forEach((child) => {
            children.push(
              renderContent({
                content: child,
                parent: content,
              }),
            );
          });

          return children;
        },
      },
    });

    return content.marks
      ? content.marks.reduce<TReturnType>((acc, mark) => {
          const markType =
            typeof mark.type === "string" ? mark.type : mark.type.name;
          const MarkHandler = markMapping[markType] ?? unhandledMark;

          if (!MarkHandler) {
            throw new Error(`missing handler for mark type ${markType}`);
          }

          return renderComponent({
            component: MarkHandler,
            props: {
              mark: mark as TMarkType,
              parent,
              node: content,
              children: acc,
            },
          });
        }, nodeContent)
      : nodeContent;
  };
}
