import { notFound } from "next/navigation";

import SaveLibrary from "@/components/SaveLibrary";
import { isLang } from "@/localization/locale";

export default async function Page({ params }: PageProps<"/[locale]/saves">) {
  const { locale } = await params;
  if (!isLang(locale)) notFound();
  return <SaveLibrary lang={locale} />;
}
