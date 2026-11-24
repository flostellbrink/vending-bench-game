"use client";
import { first } from "games-common/language";

import type { Locale } from "@/dictionary/runtime";

import { msg } from "@/dictionary";
import { releases } from "@/game/releases";
import { useLocationSearch } from "@/hooks/useSessionStorage";

import { SaveLibrarySection } from "./SaveLibrarySection";
import { StationFrame } from "./StationFrame";

export default function SaveLibrary({ lang }: { lang: Locale }) {
  const params = new URLSearchParams(useLocationSearch());
  const release = releases.find((r) => r.revision === params.get("bench")) ?? first(releases);
  const slot = params.get("slot") ?? undefined;
  const requested = Number(params.get("day"));
  const day =
    Number.isInteger(requested) && requested >= 1 && requested <= release.days
      ? requested
      : undefined;
  return (
    <StationFrame
      lang={lang}
      label={msg.session.library({}, { locale: lang })}
      revision={release.revision}
      slot={slot}
      day={day}
      page="saves"
    >
      <SaveLibrarySection release={release} lang={lang} slot={slot} day={day} />
    </StationFrame>
  );
}
