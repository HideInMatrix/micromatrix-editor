import { describe, expect, it } from "vitest";
import {
  getPlaygroundRouteHref,
  playgroundRoutes,
  resolvePlaygroundRoute,
} from "../apps/playground/src/playground/router";

describe("P19 playground pages route", () => {
  it("registers the pages demo route and resolves its href", () => {
    expect(playgroundRoutes.some((route) => route.id === "pages")).toBe(true);
    expect(resolvePlaygroundRoute("/pages").id).toBe("pages");
    expect(getPlaygroundRouteHref("/pages")).toBe("/pages");
  });
});
