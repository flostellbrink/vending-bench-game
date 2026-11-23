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
  const { state, actions, reports } = run;
  const verb = line.trim().split(/\s+/)[0] ?? "",
    tool = toolFor(verb),
    prefix = line.slice(0, caret);
  const choices = state ? completions(prefix, state, actions, reports) : [];
  const orderEstimate = state ? priceOrder(line, state, actions, reports) : null;
  function edit(value: string, pos = value.length) {
    if (value) nav.setSite(null);
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
  function runCommand(command: string, fromPrompt = false) {
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
              .concat(t("local") + ": " + local.join("  "), syntax("help"))
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
      if (run.submit({ move, line: raw })) {
        nav.setSite(null);
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
      runCommand(line, true);
      return;
    }
    if (e.key === "Escape") {
      setBrowse(false);
      setPick(0);
      return;
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
    const index = Math.max(-1, Math.min(run.journal.length - 1, recall - delta));
    const value = index < 0 ? "" : (run.journal.at(-index - 1)?.line ?? "");
    setRecall(index);
    setLine(value);
    setCaret(value.length);
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
  };
}
export type CommandLine = ReturnType<typeof useCommandLine>;
