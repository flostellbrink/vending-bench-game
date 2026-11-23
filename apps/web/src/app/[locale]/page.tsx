import { notFound } from "next/navigation";

import SessionSetup from "@/components/SessionSetup";
import { isLang } from "@/localization/locale";

export default async function Page({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLang(locale)) notFound();
  return <SessionSetup lang={locale} />;
}
