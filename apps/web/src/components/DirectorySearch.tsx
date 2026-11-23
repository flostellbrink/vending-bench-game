import type { Snapshot } from "games-common/benchmark";

import type { Translate } from "@/localization/messages";

import { timeLabel } from "@/game/time-label";

interface Props {
  state: Snapshot;
  t: Translate;
  disabled: boolean;
  commandLine: string;
  stageCommand: (line: string) => void;
  runCommand: (line: string, fromPrompt?: boolean) => void;
}
export function DirectorySearch({
  state,
  t,
  disabled,
  commandLine,
  stageCommand,
  runCommand,
}: Props) {
  const query = /^find\s/i.test(commandLine) ? commandLine.replace(/^find\s+/i, "") : "";
  return (
    <form
      className="dispatch-search"
      onSubmit={(e) => {
        e.preventDefault();
        if (query.trim()) runCommand("find " + query.trim(), true);
      }}
    >
      <label>
        {t("searchSuppliers")}
        <input
          value={query}
          placeholder={t("searchExample")}
          onChange={(e) => stageCommand("find " + e.currentTarget.value)}
        />
      </label>
      <button disabled={disabled || !query.trim()} data-clock-verb="find">
        {t("execute")} · {timeLabel("find", state, t)}
      </button>
    </form>
  );
}
