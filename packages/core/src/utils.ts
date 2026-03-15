export function cleanObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
  ) as T;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function matchesAttributes(
  attrs: Record<string, any> | null | undefined,
  criteria: Record<string, any>,
) {
  return Object.entries(criteria).every(([name, value]) =>
    JSON.stringify(attrs?.[name]) === JSON.stringify(value),
  );
}

export function mergeAttributes(
  ...sources: Array<Record<string, string | undefined> | undefined>
): Record<string, string> {
  return sources.reduce<Record<string, string>>((attributes, source) => {
    if (!source) {
      return attributes;
    }

    Object.entries(source).forEach(([key, value]) => {
      if (value !== undefined) {
        attributes[key] = value;
      }
    });

    return attributes;
  }, {});
}

export function escapeMarkdown(value: string) {
  return value.replace(/([\\`*_[\]()>#+.!-])/g, "\\$1");
}
