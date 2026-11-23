"use client";
import type { ReactNode } from "react";

import { type Optional, hasValue } from "games-common/language";
import { createContext, use } from "react";

import { registerTranslations, setLocaleReader, type Translations } from "./index.ts";

const LocaleContext = createContext<Optional<string>>(undefined);

setLocaleReader(() => use(LocaleContext));

interface Props {
  locale: string;
  translations?: Translations;
  children: ReactNode;
}

export function LocaleProvider({ locale, translations, children }: Props) {
  if (translations) {
    registerTranslations(translations);
  }
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale() {
  const locale = use(LocaleContext);
  if (!hasValue(locale)) {
    throw new Error("useLocale must be called under a LocaleProvider.");
  }
  return locale;
}
