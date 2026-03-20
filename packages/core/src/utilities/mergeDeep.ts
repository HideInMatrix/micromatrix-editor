import { isPlainObject } from "./isPlainObject";

export function mergeDeep(
  target: Record<string, any>,
  source: Record<string, any>,
): Record<string, any> {
  const output = { ...target };

  if (!isPlainObject(target) || !isPlainObject(source)) {
    return output;
  }

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      output[key] = mergeDeep(targetValue, sourceValue);
      return;
    }

    output[key] = sourceValue;
  });

  return output;
}
