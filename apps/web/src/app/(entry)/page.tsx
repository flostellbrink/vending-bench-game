"use client";

import { hasAny, includes } from "games-common/language";
import { useEffect } from "react";

import { locales, baseLocale } from "@/dictionary/runtime.ts";
export default function Entry() {
  useEffect(() => {
    const preferred = [localStorage.getItem("language"), ...navigator.languages]
      .filter((language) => hasAny(language))
      .map((l) => l.split("-")[0]?.toLowerCase() ?? "")
      .find((l) => includes(locales, l));
    globalThis.location.replace(`/${preferred ?? baseLocale}${location.search}${location.hash}`);
  }, []);
  return (
    <nav aria-label="Language">
      {locales.map((l) => (
        <a key={l} href={`/${l}`}>
          {l.toUpperCase()}{" "}
        </a>
      ))}
    </nav>
  );
}
