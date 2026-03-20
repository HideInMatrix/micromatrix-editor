export function isiOS() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const knownPlatforms = [
    "iPad Simulator",
    "iPhone Simulator",
    "iPod Simulator",
    "iPad",
    "iPhone",
    "iPod",
  ];

  return knownPlatforms.includes(navigator.platform)
    || (
      typeof document !== "undefined"
      && navigator.userAgent.includes("Mac")
      && "ontouchend" in document
    );
}
