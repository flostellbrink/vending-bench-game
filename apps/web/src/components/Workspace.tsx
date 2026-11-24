import type { Release } from "games-common/benchmark";

import { useEffect, useMemo, useState } from "react";

import type { ParentBalance } from "@/game/runs";
import type { CommandLine, Run } from "@/hooks/useCommandLine";
import type { Navigation } from "@/hooks/useNavigation";
import type { Lang, Money, ScreenTranslate, Translate } from "@/localization/messages";

import { readoutContext } from "@/game/readout-route";

import { ObjectNavigator } from "./ObjectNavigator";
import { OfficeDisplay } from "./OfficeDisplay";
import { QuoteDrafts } from "./QuoteDrafts";
import { WorkspaceReadout } from "./WorkspaceReadout";

export interface WorkspaceProps {
  run: Run;
  nav: Navigation;
  shell: CommandLine;
  release: Release;
  lang: Lang;
  t: Translate;
  screen: ScreenTranslate;
  money: Money;
  parentBalance?: ParentBalance;
}

export function Workspace(props: WorkspaceProps) {
  const { run, nav, shell, release, lang, t } = props;
  const [preview, setPreview] = useState("");
  const context = useMemo(() => readoutContext(nav.tab, run.reports), [nav.tab, run.reports]);
  const { rememberObject } = nav;
  useEffect(() => rememberObject(context.object), [context.object, rememberObject]);
  const title = context.name ?? t(context.label);
  function previewFor(target: EventTarget | null) {
    const button = target instanceof Element ? target.closest("[data-clock-verb]") : null;
    setPreview(button?.getAttribute("data-clock-verb") ?? "");
  }
  return (
    <section
      className="workspace"
      onPointerOver={(e) => previewFor(e.target)}
      onPointerLeave={() => setPreview("")}
      onFocusCapture={(e) => previewFor(e.target)}
      onBlurCapture={() => setPreview("")}
    >
      <OfficeDisplay
        state={run.state}
        release={release}
        lang={lang}
        reports={run.reports}
        t={t}
        disabled={run.busy || Boolean(run.runtimeError)}
        closeDay={() => shell.runCommand("close")}
        previewVerb={preview || shell.verb || shell.steps[0]?.verb || ""}
        sceneObject={
          context.object.startsWith("machine:") || context.object === "site:depot"
            ? context.object
            : nav.sceneObject
        }
        onOpen={nav.openObject}
      />
      <nav className="desk-trail" aria-label={t("dispatchDesk")}>
        {nav.tab !== "desk" && (
          <>
            <button onClick={nav.back} aria-label={t("back")}>
              ‹
            </button>
            <button onClick={() => nav.setTab("desk")}>{t("dispatchDesk")}</button>
            <span>/</span>
          </>
        )}
        <b>{title}</b>
        {context.history.length > 0 && !String(nav.tab).startsWith("past:") && (
          <button className="history-key" onClick={() => nav.setTab("past:" + context.object)}>
            {t("history")} ({context.history.length})
          </button>
        )}
        <button className="journal-key" onClick={() => nav.setTab("tabs")}>
          {t("journal")}
        </button>
      </nav>
      <div className="work-surface">
        <ObjectNavigator
          state={run.state}
          reports={run.reports}
          t={t}
          value={context.object}
          onOpen={nav.openObject}
        />
        <QuoteDrafts>
          <div className="readout" key={nav.tab}>
            <WorkspaceReadout {...props} context={context} />
          </div>
        </QuoteDrafts>
      </div>
    </section>
  );
}
