import { useState } from "react";
import { LocalEditorSection } from "./playground/components/LocalEditorSection";

type PlaygroundTheme = "dark" | "light";

export function App() {
  const [theme, setTheme] = useState<PlaygroundTheme>("dark");

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

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1280px] items-center">
        <LocalEditorSection
          theme={theme}
          onToggleTheme={() => {
            setTheme((currentTheme) =>
              currentTheme === "dark" ? "light" : "dark",
            );
          }}
        />
      </div>
    </main>
  );
}
