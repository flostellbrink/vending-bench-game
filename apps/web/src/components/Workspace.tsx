import type { Release } from "games-common/benchmark";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { ParentBalance } from "@/game/runs";
import type { CommandLine, Run } from "@/hooks/useCommandLine";
import type { Navigation } from "@/hooks/useNavigation";
import type { Money } from "@/localization/messages";

import { msg } from "@/dictionary";
import { readoutContext } from "@/game/readout-route";
import { observedSuppliers } from "@/game/suppliers";

import { ActionButton } from "./FormControls";
import { ToolReferenceContext } from "./GuiToolInfo";
import { ObjectNavigator } from "./ObjectNavigator";
import { OfficeDisplay } from "./OfficeDisplay";
import { QuoteDrafts } from "./QuoteDrafts";
import { ResultDialog, resultTitle } from "./ResultDialog";
import { WorkspaceReadout } from "./WorkspaceReadout";
import "./mobile-workbench.css";

export interface WorkspaceProps {
  run: Run;
  nav: Navigation;
  shell: CommandLine;
  release: Release;

  money: Money;
  parentBalance?: ParentBalance;
}

export function Workspace(props: WorkspaceProps) {
  const { run, nav, shell, release } = props;
  const toolReference = useMemo(
    () => ({ release, state: run.state, actions: run.actions }),
    [release, run.state, run.actions],
  );
  const [preview, setPreview] = useState("");
  const section = nav.path[0] ?? nav.tab;
  const context = useMemo(() => readoutContext(section, run.reports), [section, run.reports]);
  const suppliers = useMemo(() => observedSuppliers(run.reports), [run.reports]);
  const { rememberObject } = nav;
  useEffect(() => rememberObject(context.object), [context.object, rememberObject]);
  const headingId = useId();
  const directoryId = useId();
  const directory = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement>(null);
  const selected = useRef(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  useEffect(() => {
    if (!directoryOpen) return;
    directory.current?.showModal();
    directory.current?.querySelector<HTMLButtonElement>("button[aria-current]")?.focus();
  }, [directoryOpen]);
  const sections = msg.operator.sections();
  useEffect(() => {
    const station = directory.current?.closest<HTMLElement>(".station");
    const phone = matchMedia("(max-width: 760px)");
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
  const directoryProps = { state: run.state, suppliers, value: context.object };
  const supplier = context.object.startsWith("supplier:")
    ? suppliers.find((entry) => entry.id === context.object.slice(9))
    : undefined;
  const title = supplier?.name ?? context.name ?? context.label();
  function previewFor(target: EventTarget | null) {
    const button = target instanceof Element ? target.closest("[data-clock-verb]") : null;
    setPreview(button?.getAttribute("data-clock-verb") ?? "");
  }
  return (
    <ToolReferenceContext value={toolReference}>
      <section
        className="workspace"
        onClickCapture={(event) => {
          const target = event.target;
          if (target instanceof Element) {
            const control = target.closest<HTMLElement>("button, a[href], input, select, textarea");
            if (control) opener.current = control;
          }
        }}
        onSubmitCapture={(event) => {
          const submitter = event.nativeEvent.submitter;
          if (submitter instanceof HTMLElement) opener.current = submitter;
        }}
        onPointerOver={(e) => previewFor(e.target)}
        onPointerLeave={() => setPreview("")}
        onFocusCapture={(e) => previewFor(e.target)}
        onBlurCapture={() => setPreview("")}
      >
        <OfficeDisplay
          state={run.state}
          release={release}

          reports={run.reports}
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
          {context.history.length > 0 && (
            <button
              className="history-key"
              aria-haspopup="dialog"
              onClick={() => nav.setTab("past:" + context.object)}
            >
              {msg.operator.history()} ({context.history.length})
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
              aria-label={msg.operator.closeSections()}
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
            <section className="readout" aria-labelledby={headingId} key={section}>
              <WorkspaceReadout {...props} tab={section} context={context} suppliers={suppliers} />
            </section>
            {nav.path.slice(1).map((view) => {
              const detail = readoutContext(view, run.reports);
              const report = detail.selected;
              const historyView = "past:" + detail.object;
              const owner =
                suppliers.find((entry) => "supplier:" + entry.id === detail.object)?.name ??
                detail.name ??
                detail.label();
              return (
                <ResultDialog
                  key={view}
                  opener={opener}
                  title={resultTitle(view, report, owner)}
                  close={nav.leaveDetail}
                  covered={view !== nav.tab}
                  related={
                    report &&
                    detail.history.length > 1 &&
                    !nav.path.includes(historyView) && (
                      <ActionButton onClick={() => nav.setTab(historyView)}>
                        {msg.operator.history()} ({detail.history.length})
                      </ActionButton>
                    )
                  }
                >
                  <WorkspaceReadout {...props} tab={view} context={detail} suppliers={suppliers} />
                </ResultDialog>
              );
            })}
          </QuoteDrafts>
        </div>
      </section>
    </ToolReferenceContext>
  );
}
