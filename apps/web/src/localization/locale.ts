import { locales, type Locale } from "@/dictionary/runtime";
export function isLang(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}
