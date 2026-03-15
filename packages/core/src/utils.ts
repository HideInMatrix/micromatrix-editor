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
        if (key === "class" && attributes.class) {
          attributes.class = Array.from(
            new Set(
              `${attributes.class} ${value}`
                .split(/\s+/)
                .map((item) => item.trim())
                .filter(Boolean),
            ),
          ).join(" ");
          return;
        }

        if (key === "style" && attributes.style) {
          const styles = {
            ...parseStyleString(attributes.style),
            ...parseStyleString(value),
          };

          attributes.style = Object.entries(styles)
            .map(([styleName, styleValue]) => `${styleName}: ${styleValue}`)
            .join("; ");
          return;
        }

        attributes[key] = value;
      }
    });

    return attributes;
  }, {});
}

function parseStyleString(style: string) {
  return style
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((declarations, declaration) => {
      const separatorIndex = declaration.indexOf(":");

      if (separatorIndex === -1) {
        return declarations;
      }

      const property = declaration.slice(0, separatorIndex).trim();
      const value = declaration.slice(separatorIndex + 1).trim();

      if (!property || !value) {
        return declarations;
      }

      declarations[property] = value;
      return declarations;
    }, {});
}

export function escapeMarkdown(value: string) {
  return value.replace(/([\\`*_[\]()>#+.!-])/g, "\\$1");
}
