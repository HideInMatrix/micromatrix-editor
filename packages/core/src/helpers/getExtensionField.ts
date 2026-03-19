import type {
  AnyExtension,
  ExtensionConfig,
  MarkConfig,
  NodeConfig,
} from "../types";

type ExtensionField =
  | keyof ExtensionConfig<any, any>
  | keyof NodeConfig<any, any>
  | keyof MarkConfig<any, any>;

export function getExtensionField(
  extension: AnyExtension,
  field: ExtensionField,
  context: object = {},
): any {
  const value = extension.config[field as keyof typeof extension.config];

  if (value === undefined && extension.parent) {
    return getExtensionField(extension.parent, field, context);
  }

  if (typeof value === "function") {
    return value.bind({
      ...context,
      parent: extension.parent
        ? getExtensionField(extension.parent, field, context)
        : null,
    });
  }

  return value;
}
