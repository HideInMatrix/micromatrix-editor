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

export function mergeAttributes(
  ...sources: Array<Record<string, string | undefined> | undefined>
): Record<string, string> {
  return sources.reduce<Record<string, string>>((attributes, source) => {
    if (!source) {
      return attributes;
    }

    Object.entries(source).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }

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
    });

    return attributes;
  }, {});
}
