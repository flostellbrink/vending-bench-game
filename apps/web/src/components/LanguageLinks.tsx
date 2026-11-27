import { useLocale } from "games-localize/react";

import { locales } from "@/dictionary/runtime.ts";
import { type Lang } from "@/localization/messages.ts";

import "./language-links.css";

/** One link per interface language; the entry page opens the last language chosen. */
export function LanguageLinks({ href }: { href: (locale: Lang) => string }) {
  const lang = useLocale();
  return (
    <nav className="language-links" aria-label="Language / Idioma / Sprache">
      {locales.map((l) => (
        <a
          key={l}
          lang={l}
          aria-current={l === lang ? "page" : undefined}
          href={href(l)}
          onClick={() => localStorage.setItem("language", l)}
        >
          {l.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
