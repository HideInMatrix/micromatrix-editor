import { heroCopy } from "../constants";

export function HeroCard() {
  return (
    <section className="hero-card">
      <div className="eyebrow">Monorepo + Vite + TypeScript</div>
      <h1>mxm-editor Playground</h1>
      <p className="hero-copy">{heroCopy}</p>
    </section>
  );
}
