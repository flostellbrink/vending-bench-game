import type { Release } from "games-common/benchmark";

import { createContext, useContext } from "react";

import type { Lang } from "@/localization/messages";

import { ToolInfo } from "./ToolInfo";

export const ToolReferenceContext = createContext<{ release: Release; lang: Lang } | null>(null);

export function GuiToolInfo({ verb }: { verb: string }) {
  const context = useContext(ToolReferenceContext);
  if (!context) return null;
  return <ToolInfo {...context} verb={verb} />;
}
