import { notFound } from "next/navigation";

import Game from "@/components/Game";
import { isLang } from "@/localization/locale";

export default async function Run({ params }: PageProps<"/[locale]/run">) {
  const { locale } = await params;
  if (!isLang(locale)) notFound();
  return <Game />;
}
