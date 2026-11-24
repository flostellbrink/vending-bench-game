"use client";
import { first } from "games-common/language";
import { useId, useState } from "react";

import type { Locale } from "@/dictionary/runtime";

import { msg } from "@/dictionary";
import { releases } from "@/game/releases";
import { forkRun, readSlotSnapshot, slotSnapshot } from "@/game/runs";
import { unavailable, useLocationSearch, useStoredText } from "@/hooks/useSessionStorage";

import SaveTree from "./SaveTree";
import { StationFrame } from "./StationFrame";
import "./save-tree.css";

export default function SaveLibrary({ lang }: { lang: Locale }) {
  const params = new URLSearchParams(useLocationSearch());
  const release = releases.find((r) => r.revision === params.get("bench")) ?? first(releases);
  const slot = params.get("slot") ?? undefined,
    requested = Number(params.get("day"));
  const day =
    Number.isInteger(requested) && requested >= 1 && requested <= release.days
      ? requested
      : undefined;
  const snapshot = useStoredText(() => slotSnapshot(localStorage, release));
  const runs = typeof snapshot === "string" ? readSlotSnapshot(snapshot) : [];
  const [problem, setProblem] = useState(false),
    [sending, setSending] = useState(false);
  const options = { locale: lang };
  const newForm = useId();
  function branch(id: string, startDay: number) {
    if (sending || typeof snapshot !== "string") return;
    setSending(true);
    try {
      const child = forkRun(localStorage, release, id, startDay);
      location.assign(
        "/" + lang + "/run/?" + new URLSearchParams({ bench: release.revision, slot: child }),
      );
    } catch {
      setProblem(true);
      setSending(false);
    }
  }
  return (
    <StationFrame
      lang={lang}
      label={msg.session.library({}, options)}
      revision={release.revision}
      slot={slot}
      day={day}
      page="saves"
    >
      <section className="save-console">
        <header>
          <div>
            <h1>{msg.session.library({}, options)}</h1>
            <p>{msg.session.saveTimeline({}, options)}</p>
          </div>
          <small>
            {msg.session.version({}, options)} {release.id} · {msg.session.seed({}, options)}{" "}
            {release.seed}
          </small>
        </header>
        {snapshot === unavailable ? (
          <p role="alert">{msg.session.unavailable({}, options)}</p>
        ) : (
          <SaveTree
            key={release.revision + ":" + (slot ?? "latest") + ":" + (day ?? "tip")}
            release={release}
            slots={runs}
            lang={lang}
            activeSlot={slot}
            initialDay={day}
            newForm={newForm}
            disabled={sending || typeof snapshot !== "string"}
            branch={branch}
          />
        )}
        {problem && <p role="alert">{msg.session.branchFailed({}, options)}</p>}
        <div className="save-console-actions">
          <a
            href={
              "/" +
              lang +
              "/?" +
              new URLSearchParams({ bench: release.revision, ...(slot ? { slot } : {}) })
            }
          >
            {msg.session.back({}, options)}
          </a>
          <form id={newForm} action={"/" + lang + "/run/"} method="get">
            <input type="hidden" name="bench" value={release.revision} />
            <input type="hidden" name="slot" value="new" />
            {!runs.length && <button type="submit">{msg.session.again({}, options)}</button>}
          </form>
        </div>
      </section>
    </StationFrame>
  );
}
