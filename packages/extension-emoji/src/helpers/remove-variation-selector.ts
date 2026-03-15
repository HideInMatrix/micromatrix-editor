export function removeVariationSelector(value: string) {
  return value.replace("\uFE0E", "").replace("\uFE0F", "");
}
