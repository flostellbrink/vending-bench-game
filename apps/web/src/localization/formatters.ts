import { useLocale } from "games-localize/react";
import { useMemo } from "react";

export function useCurrency(currency: string, whole = false) {
  const locale = useLocale();
  return useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        currency,
        style: "currency",
        ...(whole && { maximumFractionDigits: 0, minimumFractionDigits: 0 }),
      }),
    [locale, currency, whole],
  );
}

export function useFormatters() {
  const locale = useLocale();
  return useMemo(
    () => ({
      collator: new Intl.Collator(locale, { numeric: true }),
      date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }),
      number: new Intl.NumberFormat(locale),
    }),
    [locale],
  );
}
