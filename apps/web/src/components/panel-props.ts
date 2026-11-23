import type { Report, Snapshot } from "games-common/benchmark";

import type { Lang, Money, Translate } from "@/localization/messages";
export interface ObservationProps {
  report: Report;
  reports: Report[];
  state: Snapshot;
  lang: Lang;
  t: Translate;
  money: Money;
  runCommand: (command: string, fromPrompt?: boolean) => void;
  disabled: boolean;
  commandLine: string;
  stageCommand: (command: string) => void;
}
