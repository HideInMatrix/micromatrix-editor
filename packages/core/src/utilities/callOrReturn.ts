export function callOrReturn<T>(
  value: T | ((...args: any[]) => T),
  ...args: any[]
): T {
  return typeof value === "function"
    ? (value as (...callbackArgs: any[]) => T)(...args)
    : value;
}
