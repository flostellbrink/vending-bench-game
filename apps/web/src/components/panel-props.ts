import type { Report, Snapshot } from "games-common/benchmark";

import type { GuiResponse } from "@/game/receipt-routing.ts";
import type { Money } from "@/localization/messages.ts";
export interface ObservationProps {
  report: Report;
  reports: Report[];
  state: Snapshot;

  money: Money;
  runCommand: (command: string, response?: GuiResponse) => void;
  disabled: boolean;
}
