"use client";
import { redirect, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import type { Lang } from "@/localization/messages";

import { releases } from "@/game/releases";

import { Station } from "./Station";
export default function Game({ lang }: { lang: Lang }) {
  return (
    <Suspense fallback={<main className="run-loading">VENDIX/OS</main>}>
      <ActiveRun lang={lang} />
    </Suspense>
  );
}

function ActiveRun({ lang }: { lang: Lang }) {
  const revision = useSearchParams().get("bench");
  const release = releases.find((entry) => entry.revision === revision);
  if (!release) redirect("/" + lang + "/");
  return (
    <Station
      key={release.revision}
      release={release}
      lang={lang}
      changeLang={(l) => {
        localStorage.language = l;
        window.location.assign("/" + l + "/run/" + location.search + location.hash);
      }}
    />
  );
}
