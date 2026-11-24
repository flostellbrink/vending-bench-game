import type { Release } from "games-common/benchmark";

import { entries } from "games-common/language";
import { useRef, useState, type KeyboardEvent } from "react";

import {
  commandGroups,
  completions,
  local,
  operatorText,
  parse,
  priceOrder,
  syntax,
  toolFor,
} from "@/game/commands";
import { remainingPlan, type PlannedCommand } from "@/game/shift-plan";
import { timeLabel } from "@/game/time-label";
import {
  commandLabel,
  type Lang,
  type ScreenTranslate,
  type Translate,
} from "@/localization/messages";

import type { Navigation } from "./useNavigation";
import type { useRun } from "./useRun";
export type Run = ReturnType<typeof useRun>;
export function useCommandLine(
  run: Run,
  nav: Navigation,
  release: Release,
  lang: Lang,
  t: Translate,
  screen: ScreenTranslate,
) {
  const [line, setLine] = useState(""),
    [caret, setCaret] = useState(0),
    [browse, setBrowse] = useState(false),
    [pick, setPick] = useState(0),
    [recall, setRecall] = useState(-1);
  const prompt = useRef<HTMLTextAreaElement>(null);
  const beforeRecall = useRef({ line: "", caret: 0 });
  const leavePrompt = useRef(false);
  const sequence = useRef(0);
  const [plan, setPlan] = useState<PlannedCommand[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const steps = remainingPlan(plan, run.journal);
  const { state, actions, reports } = run;
  const verb = line.trim().split(/\s+/)[0] ?? "",
    tool = toolFor(verb),
    prefix = line.slice(0, caret);
  const choices = state ? completions(prefix, state, actions, reports) : [];
  const orderEstimate = state ? priceOrder(line, state, actions, reports) : null;
  function edit(value: string, pos = value.length) {
    leavePrompt.current = false;
    setLine(value);
    setCaret(pos);
    setBrowse(!!value);
    setPick(0);
    setRecall(-1);
    run.setError("");
  }
  function complete(value?: string) {
    if (!value) return;
    const left = prefix.replace(/\S*$/, value + " ");
    edit(left + line.slice(caret).replace(/^\S*\s*/, ""), left.length);
    prompt.current?.focus();
    requestAnimationFrame(() => prompt.current?.setSelectionRange(left.length, left.length));
  }
  function stage() {
    if (!state || state.over || run.busy) return;
    const raw = line.trim();
    try {
      const move = parse(raw, state, actions);
      const command = { line: raw, move, verb: raw.split(/\s+/, 1)[0]?.toLowerCase() ?? "" };
      if (editing === null) {
        sequence.current++;
        setPlan([...steps, { ...command, id: sequence.current }]);
      } else {
        setPlan(steps.map((step) => (step.id === editing ? { ...command, id: editing } : step)));
      }
      setEditing(null);
      edit("");
      prompt.current?.focus();
    } catch (error) {
      run.setError(error instanceof Error ? error.message : String(error));
    }
  }
  function editStep(step: PlannedCommand) {
    setEditing(step.id);
    edit(step.line);
    setBrowse(false);
    prompt.current?.focus();
  }
  function cancelEdit() {
    setEditing(null);
    edit("");
    prompt.current?.focus();
  }
  function moveStep(id: number, delta: number) {
    const index = steps.findIndex((step) => step.id === id);
    const step = steps[index],
      target = index + delta;
    if (!step || target < 0 || target >= steps.length) return;
    setPlan(steps.toSpliced(index, 1).toSpliced(target, 0, step));
  }
  function removeStep(id: number) {
    setPlan(steps.filter((step) => step.id !== id));
    if (editing === id) cancelEdit();
  }
  function dispatchFirst() {
    const first = steps[0];
    if (!first || !state || state.over || run.busy || editing !== null) return;
    if (run.submit({ move: first.move, line: first.line })) {
      setPlan(
        steps.map((step) =>
          step === first ? { ...step, dispatchedAt: run.journal.length } : step,
        ),
      );
      nav.followMove(first.move);
    }
  }
  function runCommand(command: string, fromPrompt = false, keepInstrument = false) {
    const raw = command.trim(),
      [name = "", topic, ...extra] = raw.split(/\s+/);
    if (!raw || !state || run.busy) return;
    const commandName = name.toLowerCase();
    run.clearSaveIssue();
    if (local.some((x) => x === commandName)) {
      if (commandName === "help") {
        if (topic && !toolFor(topic) && !local.some((x) => x === topic)) {
          run.setError(syntax("help"));
          return;
        }
        const topicTool = topic ? toolFor(topic) : undefined;
        const description = topicTool ? release.tools[topicTool] : undefined;
        const label = topicTool ? commandLabel(topicTool, lang) : undefined;
        const text = topic
          ? syntax(topic) +
            (label ? " — " + label : "") +
            " · " +
            timeLabel(topic, state, t) +
            (description ? "\n" + operatorText(description) : "")
          : entries(commandGroups)
              .map(
                ([group, names]) =>
                  t(group) + ": " + names.filter((v) => (toolFor(v) ?? "") in actions).join("  "),
              )
              .concat(t("local") + ": " + local.join("  "), syntax("help"), t("planHelp"))
              .join("\n");
        run.appendLocal(raw, text);
      } else if (commandName === "balance" || commandName === "tabs") {
        const day = topic === undefined ? null : Number(topic);
        if (
          extra.length ||
          (day !== null && (!Number.isInteger(day) || day < 0 || day > release.days))
        ) {
          run.setError(syntax(commandName));
          return;
        }
        nav.setBalanceDay(day);
        nav.setTab(commandName === "balance" ? "world" : day === null ? "tabs" : "day:" + day);
      } else if (commandName === "view") {
        const id = Number(topic);
        if (!reports.some((r) => r.id === id)) {
          run.setError(syntax(commandName));
          return;
        }
        nav.setTab(id);
      } else nav.setTab(commandName === "world" ? "desk" : commandName);
      edit("");
      return;
    }
    if (state.over) {
      run.setError(screen("complete"));
      return;
    }
    try {
      const move = parse(raw, state, actions);
      if (run.submit({ move, line: raw }, keepInstrument)) {
        nav.followMove(move);
        if (fromPrompt) edit("");
      }
    } catch (error) {
      run.setError(error instanceof Error ? error.message : String(error));
    }
  }
  function keys(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || editing !== null) stage();
      else runCommand(line, true);
      return;
    }
    if (e.key === "Escape") {
      if (editing !== null) {
        cancelEdit();
        return;
      }
      setBrowse(false);
      setPick(0);
      leavePrompt.current = true;
      return;
    }
    if (leavePrompt.current) {
      leavePrompt.current = false;
      if (e.key === "Tab") return;
    }
    if (e.key === "Tab" && choices.length && !e.shiftKey) {
      e.preventDefault();
      if (browse) complete(choices[pick]);
      else setBrowse(true);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    if (
      !browse &&
      line.includes("\n") &&
      (e.key === "ArrowUp"
        ? line.slice(0, e.currentTarget.selectionStart)
        : line.slice(e.currentTarget.selectionEnd)
      ).includes("\n")
    )
      return;
    e.preventDefault();
    const delta = e.key === "ArrowUp" ? -1 : 1;
    if (browse && choices.length && recall < 0) {
      setPick((pick + delta + choices.length) % choices.length);
      return;
    }
    const index = Math.max(-1, Math.min(run.lines.length - 1, recall - delta));
    if (index === recall) return;
    if (recall < 0) beforeRecall.current = { line, caret };
    const value = index < 0 ? beforeRecall.current.line : (run.lines.at(-index - 1)?.line ?? "");
    const position = index < 0 ? beforeRecall.current.caret : value.length;
    setRecall(index);
    setLine(value);
    setCaret(position);
    requestAnimationFrame(() => prompt.current?.setSelectionRange(position, position));
    setPick(0);
  }
  return {
    line,
    verb,
    tool,
    choices,
    orderEstimate,
    prompt,
    browse,
    pick,
    edit,
    complete,
    runCommand,
    keys,
    setCaret,
    steps,
    editing,
    stage,
    editStep,
    cancelEdit,
    moveStep,
    removeStep,
    dispatchFirst,
  };
}
export type CommandLine = ReturnType<typeof useCommandLine>;
