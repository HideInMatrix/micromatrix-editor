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
    label: "编辑器",
    description: "基于 mxm-editor 核心扩展栈的富文本编辑演示。",
    path: "/",
  },
  {
    id: "collaboration",
    label: "协同",
    description: "两个桥接编辑器共享文档与 awareness 状态。",
    path: "/collaboration",
  },
  {
    id: "comments",
    label: "评论",
    description: "将讨论串直接锚定到文档范围的行内评论演示。",
    path: "/comments",
  },
  {
    id: "pages",
    label: "分页",
    description: "支持纸张格式、页眉页脚与分页流式布局的页面演示。",
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
