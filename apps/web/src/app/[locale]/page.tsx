import { notFound } from "next/navigation";

import BenchmarkLanding from "@/components/BenchmarkLanding";
import { isLang } from "@/localization/locale";

export default async function Page({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLang(locale)) notFound();
  return <BenchmarkLanding />;
}
