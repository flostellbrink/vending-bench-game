import type { Release } from "games-common/benchmark";

import { useMemo, useState } from "react";

import type { CommandLine, Run } from "@/hooks/useCommandLine";
import type { Navigation } from "@/hooks/useNavigation";
import type { Lang, Money, ScreenTranslate, Translate } from "@/localization/messages";

import { readoutContext } from "@/game/readout-route";

import { ObjectNavigator } from "./ObjectNavigator";
import { OfficeDisplay } from "./OfficeDisplay";
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
}

export function Workspace(props: WorkspaceProps) {
  const { run, nav, shell, release, lang, t } = props;
  const [tree, setTree] = useState(true);
  const [preview, setPreview] = useState("");
  const context = useMemo(() => readoutContext(nav.tab, run.reports), [nav.tab, run.reports]);
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
        line={shell.line || shell.steps[0]?.line || ""}
        reports={run.reports}
        t={t}
        previewVerb={preview || shell.verb || shell.steps[0]?.verb || ""}
        selectedSite={nav.site}
        onSiteSelect={nav.openSite}
      />
      <nav className="desk-trail" aria-label={t("dispatchDesk")}>
        <button aria-label={t("network")} aria-expanded={tree} onClick={() => setTree((v) => !v)}>
          ☷
        </button>
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
      <div className={"work-surface" + (tree ? " navigable" : "")}>
        {tree && (
          <ObjectNavigator
            state={run.state}
            reports={run.reports}
            t={t}
            value={context.object}
            onOpen={nav.openObject}
          />
        )}
        <div className="readout" key={nav.tab}>
          <WorkspaceReadout {...props} context={context} />
        </div>
      </div>
    </section>
  );
}
