import { CollaborationSection } from "./playground/components/CollaborationSection";
import { HeroCard } from "./playground/components/HeroCard";
import { LocalEditorSection } from "./playground/components/LocalEditorSection";

export function App() {
  return (
    <main className="page-shell">
      <HeroCard />
      <LocalEditorSection />
      <CollaborationSection />
    </main>
  );
}
