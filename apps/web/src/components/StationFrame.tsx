import type { ReactNode } from "react";

import { locales, type Locale } from "@/dictionary/runtime";

import "./station-frame.css";

interface Props {
  lang: Locale;
  revision: string;
  label: string;
  children: ReactNode;
  page?: "run" | "setup";
}
export function StationFrame({ lang, revision, label, children, page = "setup" }: Props) {
  const query = new URLSearchParams({ bench: revision });
  return (
    <main className="station-frame">
      <header className="mast">
        <a className="station-wordmark" href={"/" + lang + "/?" + query}>
          <i className="brand-mark" aria-hidden />
          Vending Bench
        </a>
        <span className="operator">{label}</span>
        <i className="vent" aria-hidden />
        <nav aria-label="Language / Idioma / Sprache">
          {locales.map((l) => (
            <a
              key={l}
              lang={l}
              aria-current={l === lang ? "page" : undefined}
              href={"/" + l + "/" + (page === "run" ? "run/" : "") + "?" + query}
            >
              {l.toUpperCase()}
            </a>
          ))}
        </nav>
      </header>
      {children}
    </main>
  );
}
