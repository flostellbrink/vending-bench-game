import type { Report, Snapshot } from "games-common/benchmark";

import type { Money } from "@/localization/messages";
export interface ObservationProps {
  report: Report;
  reports: Report[];
  state: Snapshot;

  money: Money;
  runCommand: (command: string, fromPrompt?: false, keepInstrument?: boolean) => void;
  disabled: boolean;
}
