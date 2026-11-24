"use client";

import { includes } from "games-common/language";
import { useEffect } from "react";

import { locales, baseLocale } from "@/dictionary/runtime";
export default function Entry() {
  useEffect(() => {
    const preferred = [localStorage.language, ...navigator.languages]
      .filter(Boolean)
      .map((l) => l.split("-")[0]?.toLowerCase() ?? "")
      .find((l) => includes(locales, l));
    window.location.replace(
      "/" + (preferred || baseLocale) + "/" + location.search + location.hash,
    );
  }, []);
  return (
    <nav aria-label="Language">
      {locales.map((l) => (
        <a key={l} href={"/" + l + "/"}>
          {l.toUpperCase()}{" "}
        </a>
      ))}
    </nav>
  );
}
