import { useEffect, useState } from "react";

export type PlaygroundRouteId = "editor" | "collaboration" | "comments" | "pages";

export interface PlaygroundRoute {
  id: PlaygroundRouteId;
  label: string;
  description: string;
  path: string;
}

export const playgroundRoutes: PlaygroundRoute[] = [
  {
    id: "editor",
    label: "Editor",
    description: "Rich text editing with the core mxm-editor extension stack.",
    path: "/",
  },
  {
    id: "collaboration",
    label: "Collaboration",
    description: "Two bridged editors sharing document and awareness state.",
    path: "/collaboration",
  },
  {
    id: "comments",
    label: "Comments",
    description: "Inline discussion threads anchored directly to document ranges.",
    path: "/comments",
  },
  {
    id: "pages",
    label: "Pages",
    description: "Paper-aware layout with page formats, running heads, and paginated flow.",
    path: "/pages",
  },
];

const routeAliases = new Map<string, PlaygroundRouteId>([
  ["/", "editor"],
  ["/editor", "editor"],
  ["/collaboration", "collaboration"],
  ["/comments", "comments"],
  ["/pages", "pages"],
]);

function normalizeBasePath(basePath: string) {
  if (!basePath || basePath === "/") {
    return "/";
  }

  return basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;
}

function normalizePathname(pathname: string) {
  if (!pathname) {
    return "/";
  }

  const withoutTrailingSlash =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  return withoutTrailingSlash || "/";
}

function stripBasePath(pathname: string) {
  const basePath = normalizeBasePath(import.meta.env.BASE_URL ?? "/");
  const normalizedPathname = normalizePathname(pathname);

  if (basePath === "/") {
    return normalizedPathname;
  }

  if (normalizedPathname === basePath) {
    return "/";
  }

  if (normalizedPathname.startsWith(`${basePath}/`)) {
    return normalizePathname(
      normalizedPathname.slice(basePath.length),
    );
  }

  return normalizedPathname;
}

export function resolvePlaygroundRoute(pathname: string) {
  const routeId = routeAliases.get(stripBasePath(pathname)) ?? "editor";

  return playgroundRoutes.find((route) => route.id === routeId) ?? playgroundRoutes[0]!;
}

export function getPlaygroundRouteHref(path: string) {
  const basePath = normalizeBasePath(import.meta.env.BASE_URL ?? "/");

  if (path === "/") {
    return basePath === "/" ? "/" : `${basePath}/`;
  }

  return basePath === "/" ? path : `${basePath}${path}`;
}

export function usePlaygroundRoute() {
  const [route, setRoute] = useState<PlaygroundRoute>(() =>
    resolvePlaygroundRoute(
      typeof window === "undefined" ? "/" : window.location.pathname,
    ),
  );

  useEffect(() => {
    const handlePopState = () => {
      setRoute(resolvePlaygroundRoute(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const navigate = (routeId: PlaygroundRouteId) => {
    const nextRoute = playgroundRoutes.find((route) => route.id === routeId);

    if (!nextRoute) {
      return;
    }

    const nextHref = getPlaygroundRouteHref(nextRoute.path);

    if (window.location.pathname !== nextHref) {
      window.history.pushState({ routeId }, "", nextHref);
    }

    setRoute(nextRoute);
  };

  return {
    route,
    routes: playgroundRoutes,
    navigate,
  };
}
