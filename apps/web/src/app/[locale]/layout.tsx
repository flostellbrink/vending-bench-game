import { LocaleProvider } from "games-localize/react";
import { notFound } from "next/navigation";

import { locales } from "@/dictionary/runtime";
import "@/app/globals.css";
import { isLang } from "@/localization/locale";
export const metadata = { title: "Vending Bench" };
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
export default async function Layout({ params, children }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLang(locale)) notFound();
  return (
    <html lang={locale}>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
