export function isMacOS() {
  return typeof navigator !== "undefined"
    ? /Mac/i.test(navigator.platform)
    : false;
}
