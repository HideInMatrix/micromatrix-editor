export function matchesAttributes(
  attrs: Record<string, any> | null | undefined,
  criteria: Record<string, any>,
) {
  return Object.entries(criteria).every(([name, value]) =>
    JSON.stringify(attrs?.[name]) === JSON.stringify(value),
  );
}
