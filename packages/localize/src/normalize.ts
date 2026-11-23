import { entries, fromEntries, keys } from "games-common/language";
import * as v from "valibot";

import type { ContentKey } from "./schema-helpers.ts";
import type { Group, Locale, Message, RootLocales, RootNode } from "./schema.ts";

import {
  baseLocalePrefix,
  isMessage,
  localeSchema,
  messageIdKey,
  messageInputsKey,
  nodeInfoKey,
  rootLocalesKey,
} from "./schema.ts";

export const rootBaseLocaleKey = ".baseLocale";
export type NormalizedRootNode = RootNode & { [rootBaseLocaleKey]: Locale };

/**
 * Extract base locale and remove its prefix.
 */
export function normalizeDictionary(root: RootNode): NormalizedRootNode {
  const { [rootLocalesKey]: locales, [nodeInfoKey]: info, $schema, ...children } = root;
  return {
    $schema,
    [rootLocalesKey]: normalizeLocaleKeys(locales),
    [rootBaseLocaleKey]: findBaseLocale(locales),
    [nodeInfoKey]: info,
    ...normalizeGroup(children),
  };
}

function normalizeGroup(group: Group): Group {
  return fromEntries(
    entries(group).map(([name, child]) => [
      name,
      isMessage(child) ? normalizeMessage(child) : normalizeGroup(child),
    ]),
  );
}

function normalizeMessage(message: Message): Message {
  const {
    [messageIdKey]: id,
    [messageInputsKey]: inputs,
    [nodeInfoKey]: info,
    ...locales
  } = message;
  return {
    [messageIdKey]: id,
    [messageInputsKey]: inputs,
    [nodeInfoKey]: info,
    ...normalizeLocaleKeys(locales),
  };
}

function normalizeLocaleKeys<T>(values: Record<ContentKey, T>): Record<ContentKey, T> {
  return fromEntries(
    entries<ContentKey, T>(values).map(([locale, value]) => [normalizeLocale(locale), value]),
  );
}

function normalizeLocale(locale: string): Locale {
  return v.parse(localeSchema, locale.replace(baseLocalePrefix, ""));
}

function findBaseLocale(locales: RootLocales) {
  const baseLocale = keys(locales).find((locale) => locale.startsWith(baseLocalePrefix));
  if (!baseLocale) {
    throw new Error("No base locale specified. Schema should have caught this.");
  }

  return normalizeLocale(baseLocale);
}
