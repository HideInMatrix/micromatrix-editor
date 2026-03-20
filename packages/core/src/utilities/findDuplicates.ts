export function findDuplicates<T>(items: T[]): T[] {
  const duplicates = items.filter((item, index) => items.indexOf(item) !== index);

  return Array.from(new Set(duplicates));
}
