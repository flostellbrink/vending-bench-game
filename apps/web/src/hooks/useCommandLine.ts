import type { Release } from "games-common/benchmark";

import { hasAny, hasValue, keys as keysOf, type Optional } from "games-common/language";
import { useRef, useState, type KeyboardEvent } from "react";

import type { GuiResponse, ResponseDestination } from "@/game/receipt-routing.ts";

import { msg } from "@/dictionary/index.ts";
import {
  commandForMove,
  completions,
  insertCompletion,
  parse,
  priceOrder,
  syntax,
} from "@/game/commands.ts";
import { remainingPlan, type PlannedCommand } from "@/game/shift-plan.ts";
import { useTimeLabel } from "@/game/time-label.ts";
import { toolDefaults } from "@/game/tool-defaults.ts";

import type { Navigation } from "./useNavigation.ts";
import type { useRun } from "./useRun.ts";
export type Run = ReturnType<typeof useRun>;
export function useCommandLine(run: Run, nav: Navigation, release: Release) {
  const timeLabel = useTimeLabel();
  const defaultsLabel = msg.operator.defaults();
  const completeLabel = msg.screen.complete();
  const [line, setLine] = useState("");
  const [caret, setCaret] = useState(0);
  const [browse, setBrowse] = useState(false);
  const [pick, setPick] = useState(0);
  const [recall, setRecall] = useState(-1);
  const prompt = useRef<HTMLTextAreaElement>(null);
  const beforeRecall = useRef({ caret: 0, line: "" });
  const leavePrompt = useRef(false);
  const sequence = useRef(0);
  const [plan, setPlan] = useState<PlannedCommand[]>([]);
  const [editing, setEditing] = useState<Optional<number>>(null);
  const [guiError, setGuiError] = useState("");
  const steps = remainingPlan(plan, run.journal);
  const { state, actions, reports } = run;
  const inputName = line.trim().split(/\s+/)[0] ?? "";
  const tool = Object.hasOwn(actions, inputName) ? inputName : undefined;
  const verb = tool ?? "";
  const prefix = line.slice(0, caret);
  const choices = state ? completions(prefix, state, actions, reports) : [];
  const orderEstimate = state ? priceOrder(line, state, reports) : null;
  function edit(value: string, pos = value.length) {
    leavePrompt.current = false;
    setLine(value);
    setCaret(pos);
    setBrowse(hasAny(value));
    setPick(0);
    setRecall(-1);
    run.setError("");
  }
  function complete(value?: string) {
    if (!value) {
      return;
    }
    const next = insertCompletion(line, caret, value);
    edit(next.line, next.caret);
    prompt.current?.focus();
    requestAnimationFrame(() => prompt.current?.setSelectionRange(next.caret, next.caret));
  }
  function stage() {
    if (!state || state.over || run.busy) {
      return;
    }
    const raw = line.trim();
    try {
      const move = parse(raw, actions);
      const command = {
        line: commandForMove(move, release.toolParameters[move[0]]),
        move,
        verb: move[0],
      };
      if (!hasValue(editing)) {
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
    const step = steps[index];
    const target = index + delta;
    if (!step || target < 0 || target >= steps.length) {
      return;
    }
    setPlan(steps.toSpliced(index, 1).toSpliced(target, 0, step));
  }
  function removeStep(id: number) {
    setPlan(steps.filter((step) => step.id !== id));
    if (editing === id) {
      cancelEdit();
    }
  }
  function dispatchFirst() {
    const [first] = steps;
    if (!first || !state || state.over || run.busy || hasValue(editing)) {
      return;
    }
    if (run.submit({ line: first.line, move: first.move }, "console")) {
      setPlan(
        steps.map((step) =>
          step === first ? { ...step, dispatchedAt: run.journal.length } : step,
        ),
      );
      nav.followMove(first.move);
    }
  }
  function execute(command: string, destination: ResponseDestination) {
    const fromPrompt = destination === "console";
    const raw = command.trim();
    const [name = "", topic, ...extra] = raw.split(/\s+/);
    if (!raw || !state || run.busy) {
      return;
    }
    const commandName = name.toLowerCase();
    run.clearSaveIssue();
    if (commandName === "help") {
      if (extra.length || (topic && topic !== "help" && !Object.hasOwn(actions, topic))) {
        run.setError(syntax("help"));
        return;
      }
      const defaults = toolDefaults(release, topic);
      const text = topic
        ? [
            syntax(topic, actions),
            release.tools[topic],
            timeLabel(topic, state),
            defaults && `${defaultsLabel}: ${defaults}`,
          ]
            .filter((part) => hasAny(part))
            .join("\n")
        : [...keysOf(actions), syntax("help")].join("  ");
      run.appendLocal(raw, text);
      if (fromPrompt) {
        edit("");
      }
      return;
    }
    if (state.over) {
      run.setError(completeLabel);
      return;
    }
    try {
      const move = parse(raw, actions);
      const entry = { line: commandForMove(move, release.toolParameters[move[0]]), move };
      if (run.submit(entry, destination)) {
        nav.followMove(move);
        if (fromPrompt) {
          edit("");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      run.setError(message);
      if (!fromPrompt) {
        setGuiError(message);
      }
    }
  }
  function keys(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) {
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || hasValue(editing)) {
        stage();
      } else {
        execute(line, "console");
      }
      return;
    }
    if (e.key === "Escape") {
      if (hasValue(editing)) {
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
      if (e.key === "Tab") {
        return;
      }
    }
    if (e.key === "Tab" && choices.length && !e.shiftKey) {
      e.preventDefault();
      if (browse) {
        complete(choices[pick]);
      } else {
        setBrowse(true);
      }
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") {
      return;
    }
    if (
      !browse &&
      line.includes("\n") &&
      (e.key === "ArrowUp"
        ? line.slice(0, e.currentTarget.selectionStart)
        : line.slice(e.currentTarget.selectionEnd)
      ).includes("\n")
    ) {
      return;
    }
    e.preventDefault();
    const delta = e.key === "ArrowUp" ? -1 : 1;
    if (browse && choices.length && recall < 0) {
      setPick((pick + delta + choices.length) % choices.length);
      return;
    }
    const index = Math.max(-1, Math.min(run.lines.length - 1, recall - delta));
    if (index === recall) {
      return;
    }
    if (recall < 0) {
      beforeRecall.current = { caret, line };
    }
    const value = index < 0 ? beforeRecall.current.line : (run.lines.at(-index - 1)?.line ?? "");
    const position = index < 0 ? beforeRecall.current.caret : value.length;
    setRecall(index);
    setLine(value);
    setCaret(position);
    requestAnimationFrame(() => prompt.current?.setSelectionRange(position, position));
    setPick(0);
  }
  return {
    browse,
    cancelEdit,
    choices,
    complete,
    dismissGuiError: () => setGuiError(""),
    dispatchFirst,
    edit,
    editStep,
    editing,
    guiError,
    keys,
    line,
    moveStep,
    orderEstimate,
    pick,
    prompt,
    removeStep,
    runCommand: (command: string, response: GuiResponse = "dialog") => execute(command, response),
    setCaret,
    stage,
    steps,
    tool,
    verb,
  };
}
export type CommandLine = ReturnType<typeof useCommandLine>;
