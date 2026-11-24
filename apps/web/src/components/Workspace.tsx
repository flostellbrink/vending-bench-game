import type { Release } from "games-common/benchmark";

import { useEffect, useId, useMemo, useState } from "react";

import type { ParentBalance } from "@/game/runs";
import type { CommandLine, Run } from "@/hooks/useCommandLine";
import type { Navigation } from "@/hooks/useNavigation";
import type { Lang, Money, ScreenTranslate, Translate } from "@/localization/messages";

import { readoutContext } from "@/game/readout-route";
import { observedSuppliers } from "@/game/suppliers";

import { ToolReferenceContext } from "./GuiToolInfo";
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
  const toolReference = useMemo(() => ({ release, lang }), [release, lang]);
  const [preview, setPreview] = useState("");
  const context = useMemo(() => readoutContext(nav.tab, run.reports), [nav.tab, run.reports]);
  const suppliers = useMemo(() => observedSuppliers(run.reports), [run.reports]);
  const { rememberObject } = nav;
  useEffect(() => rememberObject(context.object), [context.object, rememberObject]);
  const headingId = useId();
  const key = String(nav.tab);
  const supplier = context.object.startsWith("supplier:")
    ? suppliers.find((entry) => entry.id === context.object.slice(9))
    : undefined;
  let title = context.name ?? t(context.label);
  if (typeof nav.tab === "string" && supplier) title = supplier.name;
  if (key.startsWith("day:")) title = t("results") + " · " + t("day") + " " + key.slice(4);
  if (key.startsWith("past:")) title = t("history") + " · " + title;
  function previewFor(target: EventTarget | null) {
    const button = target instanceof Element ? target.closest("[data-clock-verb]") : null;
    setPreview(button?.getAttribute("data-clock-verb") ?? "");
  }
  return (
    <ToolReferenceContext value={toolReference}>
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
        <div className="desk-trail">
          {nav.canGoBack && (
            <button onClick={nav.back} aria-label={t("back")}>
              ‹
            </button>
          )}
          <h2 id={headingId}>{title}</h2>
          {context.history.length > 0 && !String(nav.tab).startsWith("past:") && (
            <button className="history-key" onClick={() => nav.setTab("past:" + context.object)}>
              {t("history")} ({context.history.length})
            </button>
          )}
        </div>
        <div className="work-surface">
          <ObjectNavigator
            state={run.state}
            suppliers={suppliers}
            t={t}
            value={context.object}
            onOpen={nav.openObject}
          />
          <QuoteDrafts>
            <section className="readout" aria-labelledby={headingId} key={nav.tab}>
              <WorkspaceReadout {...props} context={context} suppliers={suppliers} />
            </section>
          </QuoteDrafts>
        </div>
      </section>
    </ToolReferenceContext>
  );
}
