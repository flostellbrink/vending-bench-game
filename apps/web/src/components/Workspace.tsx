import type { Release } from "games-common/benchmark";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { ParentBalance } from "@/game/runs";
import type { CommandLine, Run } from "@/hooks/useCommandLine";
import type { Navigation } from "@/hooks/useNavigation";
import type { Lang, Money, ScreenTranslate, Translate } from "@/localization/messages";

import { msg } from "@/dictionary";
import { readoutContext } from "@/game/readout-route";
import { observedSuppliers } from "@/game/suppliers";

import { ToolReferenceContext } from "./GuiToolInfo";
import { ObjectNavigator } from "./ObjectNavigator";
import { OfficeDisplay } from "./OfficeDisplay";
import { QuoteDrafts } from "./QuoteDrafts";
import { WorkspaceReadout } from "./WorkspaceReadout";
import "./mobile-workbench.css";

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
  const toolReference = useMemo(
    () => ({ release, lang, state: run.state, actions: run.actions, t }),
    [release, lang, run.state, run.actions, t],
  );
  const [preview, setPreview] = useState("");
  const context = useMemo(() => readoutContext(nav.tab, run.reports), [nav.tab, run.reports]);
  const suppliers = useMemo(() => observedSuppliers(run.reports), [run.reports]);
  const { rememberObject } = nav;
  useEffect(() => rememberObject(context.object), [context.object, rememberObject]);
  const headingId = useId();
  const directoryId = useId();
  const directory = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = useRef(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  useEffect(() => {
    if (!directoryOpen) return;
    directory.current?.showModal();
    directory.current?.querySelector<HTMLButtonElement>("button[aria-current]")?.focus();
  }, [directoryOpen]);
  const sections = msg.operator.sections({}, { locale: lang });
  useEffect(() => {
    const station = directory.current?.closest<HTMLElement>(".station");
    const phone = matchMedia("(max-width: 600px)");
    const viewport = window.visualViewport;
    if (!station) return undefined;
    function sizeWorkbench() {
      if (!phone.matches && directory.current?.open) directory.current.close();
      if (phone.matches && viewport?.scale === 1)
        station?.style.setProperty("--phone-height", viewport.height + "px");
      else station?.style.removeProperty("--phone-height");
    }
    sizeWorkbench();
    phone.addEventListener("change", sizeWorkbench);
    viewport?.addEventListener("resize", sizeWorkbench);
    return () => {
      phone.removeEventListener("change", sizeWorkbench);
      viewport?.removeEventListener("resize", sizeWorkbench);
      station.style.removeProperty("--phone-height");
    };
  }, []);
  const directoryProps = { state: run.state, suppliers, t, value: context.object };
  const key = String(nav.tab);
  const parent = key.startsWith("supplier:")
    ? { id: "suppliers", label: t("supply") }
    : key === "machines" || key.startsWith("machine:")
      ? { id: "site:depot", label: t("depot") }
      : key === "status" || key === "payments"
        ? { id: "world", label: t("bank") }
        : null;
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
          closeDay={() => shell.runCommand("wait_for_next_day")}
          previewVerb={preview || shell.verb || shell.steps[0]?.verb || ""}
          sceneObject={
            context.object.startsWith("machine:") || context.object === "site:depot"
              ? context.object
              : nav.sceneObject
          }
          onOpen={nav.openObject}
        />
        <div className="desk-trail">
          <button
            className="sections-trigger"
            type="button"
            ref={trigger}
            aria-haspopup="dialog"
            aria-controls={directoryId}
            onClick={() => {
              selected.current = false;
              setDirectoryOpen(true);
            }}
          >
            {sections}
          </button>
          <h2 id={headingId} ref={heading} tabIndex={-1}>
            {title}
          </h2>
          {parent && (
            <button
              type="button"
              onClick={() => {
                nav.openObject(parent.id);
                heading.current?.focus({ preventScroll: true });
              }}
            >
              ↑ {parent.label}
            </button>
          )}
          {context.history.length > 0 && !String(nav.tab).startsWith("past:") && (
            <button className="history-key" onClick={() => nav.setTab("past:" + context.object)}>
              {t("history")} ({context.history.length})
            </button>
          )}
        </div>
        <dialog
          className="sections-dialog"
          id={directoryId}
          ref={directory}
          aria-label={sections}
          onClose={() => {
            setDirectoryOpen(false);
            (selected.current ? heading.current : trigger.current)?.focus({ preventScroll: true });
          }}
        >
          <header>
            <h2>{sections}</h2>
            <button
              type="button"
              aria-label={msg.operator.closeSections({}, { locale: lang })}
              onClick={() => directory.current?.close()}
            >
              ×
            </button>
          </header>
          {directoryOpen && (
            <ObjectNavigator
              {...directoryProps}
              onOpen={(id) => {
                selected.current = true;
                nav.openObject(id);
                directory.current?.close();
              }}
            />
          )}
        </dialog>
        <div className="work-surface">
          <ObjectNavigator {...directoryProps} onOpen={nav.openObject} />
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
