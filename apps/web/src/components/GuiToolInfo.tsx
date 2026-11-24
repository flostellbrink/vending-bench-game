import type { Release } from "games-common/benchmark";

import { createContext, useContext, type ReactNode } from "react";

import type { Lang } from "@/localization/messages";

import { ToolInfo } from "./ToolInfo";

export const ToolReferenceContext = createContext<{ release: Release; lang: Lang } | null>(null);

export function GuiToolInfo({
  verb,
  children,
  cost,
}: {
  verb: string;
  children?: ReactNode;
  cost?: string;
}) {
  const context = useContext(ToolReferenceContext);
  if (!context) return children ?? null;
  const pair = (
    <span className="tool-action-pair">
      {children}
      <ToolInfo {...context} verb={verb} />
    </span>
  );
  return cost ? (
    <span className="timed-tool-action">
      {pair}
      <small>{cost}</small>
    </span>
  ) : (
    pair
  );
}
