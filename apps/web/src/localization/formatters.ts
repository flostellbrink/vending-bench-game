import { useLocale } from "games-localize/react";
import { useMemo } from "react";

export function useCurrency(currency: string, whole = false) {
  const locale = useLocale();
  return useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        ...(whole && { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      }),
    [locale, currency, whole],
  );
}

export function useFormatters() {
  const locale = useLocale();
  return useMemo(
    () => ({
      number: new Intl.NumberFormat(locale),
      date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }),
      collator: new Intl.Collator(locale, { numeric: true }),
    }),
    [locale],
  );
}
