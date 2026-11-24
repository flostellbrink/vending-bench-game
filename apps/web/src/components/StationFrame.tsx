import type { ReactNode } from "react";

import { useLocale } from "games-localize/react";

import { msg } from "@/dictionary";
import { locales } from "@/dictionary/runtime";

import "./station-frame.css";

interface Props {
  revision: string;
  children: ReactNode;
  page?: "run" | "setup";
  slot?: string;
  day?: number;
}
export function StationFrame({ revision, children, page = "setup", slot, day }: Props) {
  const lang = useLocale();
  const query = new URLSearchParams({ bench: revision });
  if (slot) query.set("slot", slot);
  if (day !== undefined) query.set("day", String(day));
  return (
    <main className="station-frame">
      <header className="mast">
        <a className="station-wordmark" href={"/" + lang + "/?" + query}>
          <i className="brand-mark" aria-hidden />
          Vending Bench
        </a>
        <span className="operator">{msg.landing.human()}</span>
        <i className="vent" aria-hidden />
        <nav aria-label="Language / Idioma / Sprache">
          {locales.map((l) => (
            <a
              key={l}
              lang={l}
              aria-current={l === lang ? "page" : undefined}
              href={"/" + l + "/" + (page === "setup" ? "" : page + "/") + "?" + query}
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
