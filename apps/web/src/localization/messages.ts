import type { MessageWrapperOptional } from "games-localize";

import type { Locale } from "@/dictionary/runtime";
import type { ToolName } from "@/game/commands";

import { stationMessages } from "./station-messages";

export type Lang = Locale;
export type OperatorLabel = keyof typeof stationMessages.operator;
export type Translate = (key: OperatorLabel) => string;
export type ScreenTranslate = (key: keyof typeof stationMessages.screen) => string;
export type Money = (value: number) => string;
function hasKey<T extends object>(group: T, key: string): key is Extract<keyof T, string> {
  return Object.hasOwn(group, key);
}
export function translate(message: MessageWrapperOptional<Record<string, never>>, lang: Lang) {
  return message({}, { locale: lang });
}
export function commandLabel(tool: ToolName | undefined, lang: Lang) {
  return tool && translate(stationMessages.commands[tool], lang);
}
export function fieldLabel(key: string, lang: Lang) {
  if (hasKey(stationMessages.fields, key)) return translate(stationMessages.fields[key], lang);
  if (hasKey(stationMessages.operator, key)) return translate(stationMessages.operator[key], lang);
  return key;
}
export function operatorLabels(lang: Lang): Translate {
  return (key) => translate(stationMessages.operator[key], lang);
}
export function screenLabels(lang: Lang): ScreenTranslate {
  return (key) => translate(stationMessages.screen[key], lang);
}
