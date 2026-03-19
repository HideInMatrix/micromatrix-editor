import { heroCopy } from "../constants";

export function HeroCard() {
  return (
    <section className="hero-card">
      <div className="eyebrow">工程栈：Monorepo + Vite + TypeScript</div>
      <h1>mxm-editor 演示场</h1>
      <p className="hero-copy">{heroCopy}</p>
    </section>
  );
}
