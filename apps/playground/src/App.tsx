import type { MouseEvent } from "react";
import { useState } from "react";
import {
  FileText,
  MessageSquareText,
  Moon,
  ScrollText,
  Sun,
  Users,
} from "lucide-react";
import { CollaborationSection } from "./playground/components/CollaborationSection";
import { CommentsSection } from "./playground/components/CommentsSection";
import { LocalEditorSection } from "./playground/components/LocalEditorSection";
import { PagesSection } from "./playground/components/PagesSection";
import {
  getPlaygroundRouteHref,
  usePlaygroundRoute,
  type PlaygroundRouteId,
} from "./playground/router";

type PlaygroundTheme = "dark" | "light";

function RouteIcon({ routeId }: { routeId: PlaygroundRouteId }) {
  if (routeId === "comments") {
    return <MessageSquareText size={16} strokeWidth={2} />;
  }

  if (routeId === "pages") {
    return <ScrollText size={16} strokeWidth={2} />;
  }

  if (routeId === "collaboration") {
    return <Users size={16} strokeWidth={2} />;
  }

  return <FileText size={16} strokeWidth={2} />;
}

export function App() {
  const [theme, setTheme] = useState<PlaygroundTheme>("dark");
  const { route, routes, navigate } = usePlaygroundRoute();

  const renderRoute = () => {
    if (route.id === "comments") {
      return <CommentsSection />;
    }

    if (route.id === "pages") {
      return <PagesSection />;
    }

    if (route.id === "collaboration") {
      return <CollaborationSection />;
    }

    return <LocalEditorSection />;
  };

  return (
    <main
      className="app-shell relative min-h-screen overflow-hidden px-3 py-4 sm:px-6 sm:py-6"
      data-theme={theme}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-12%] h-80 w-80 rounded-full bg-[rgba(120,119,198,0.28)] blur-3xl" />
        <div className="absolute right-[-5%] top-[10%] h-96 w-96 rounded-full bg-[rgba(59,130,246,0.22)] blur-3xl" />
        <div className="absolute bottom-[-18%] left-[18%] h-[24rem] w-[24rem] rounded-full bg-[rgba(236,72,153,0.16)] blur-3xl" />
      </div>

      <div className="playground-shell relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1400px] flex-col gap-4">
        <header className="playground-header">
          <div className="playground-header__copy">
            <div className="playground-header__eyebrow">mxm-editor Playground</div>
            <h1>{route.label}</h1>
            <p>{route.description}</p>
          </div>

          <div className="playground-header__actions">
            <nav className="playground-route-nav" aria-label="Playground Routes">
              {routes.map((routeItem) => (
                <a
                  key={routeItem.id}
                  aria-current={routeItem.id === route.id ? "page" : undefined}
                  className={`playground-route-link${
                    routeItem.id === route.id ? " is-active" : ""
                  }`}
                  href={getPlaygroundRouteHref(routeItem.path)}
                  onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                    if (
                      event.defaultPrevented
                      || event.metaKey
                      || event.ctrlKey
                      || event.shiftKey
                      || event.altKey
                      || event.button !== 0
                    ) {
                      return;
                    }

                    event.preventDefault();
                    navigate(routeItem.id);
                  }}
                >
                  <RouteIcon routeId={routeItem.id} />
                  <span>{routeItem.label}</span>
                </a>
              ))}
            </nav>

            <button
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="playground-theme-toggle"
              onClick={() => {
                setTheme((currentTheme) =>
                  currentTheme === "dark" ? "light" : "dark",
                );
              }}
              type="button"
            >
              {theme === "dark" ? (
                <Sun size={17} strokeWidth={2} />
              ) : (
                <Moon size={17} strokeWidth={2} />
              )}
            </button>
          </div>
        </header>

        <section className="playground-stage">
          {renderRoute()}
        </section>
      </div>
    </main>
  );
}
