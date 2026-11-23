import type { MessagePart } from "messageformat";

import { MessageFormat } from "messageformat";
import { DraftFunctions } from "messageformat/functions";

import type { LocalizedMessage } from "./schema.ts";
export type { LocalizedMessage } from "./schema.ts";

import { assertUnreachable, type Optional, entries, hasValue } from "games-common/language";

/** Patterns of one message by locale. */
export type MessageLocales = Partial<Record<string, string>>;
/** Patterns by dictionary, locale and message id. */
export type Translations = Record<string, Record<string, Record<string, string>>>;

type Format = Optional<"string" | "parts">;
type Resolved<TFormat extends Format> = TFormat extends "parts"
  ? MessagePart<never>[]
  : LocalizedMessage;

export interface MessageOptions<TFormat extends Format> {
  format?: TFormat;
  locale?: string;
}

export type MessageWrapperRequired<TParams> = <TFormat extends Format = undefined>(
  arg: TParams,
  options?: MessageOptions<TFormat>,
) => Resolved<TFormat>;

export type MessageWrapperOptional<TParams> = <TFormat extends Format = undefined>(
  arg?: TParams,
  options?: MessageOptions<TFormat>,
) => Resolved<TFormat>;

interface CollectedModule {
  id: string;
  data: unknown;
  import: () => Promise<unknown>;
}

const registry: Translations = {};
const localeReader: { read?: () => Optional<string> } = {};

function compile(locale: string, pattern: string) {
  return new MessageFormat(locale, pattern, { functions: DraftFunctions });
}

const formats = new Map<string, ReturnType<typeof compile>>();

/** A pattern compiles once for each locale. A table renders its texts many times a second. */
function compiled(locale: string, pattern: string) {
  const key = `${locale}\u0000${pattern}`;
  const known = formats.get(key);
  if (known) {
    return known;
  }
  const format = compile(locale, pattern);
  formats.set(key, format);
  return format;
}

/** Lets a UI runtime supply the locale of the current render. */
export function setLocaleReader(reader: () => Optional<string>) {
  localeReader.read = reader;
}

/** Adds patterns for messages whose own locales are not bundled, as in the browser. */
export function registerTranslations(translations: Translations) {
  for (const [dictionary, byLocale] of entries(translations)) {
    registry[dictionary] ??= {};
    const target = registry[dictionary];
    for (const [locale, patterns] of entries(byLocale)) {
      target[locale] = { ...target[locale], ...patterns };
    }
  }
}

/** Builds the browser subset of one locale from the modules collected for a route. */
export async function collectTranslations(
  modules: CollectedModule[],
  locale: string,
): Promise<Translations> {
  const translations: Translations = {};
  for (const module of modules) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const { dictionary, id, server } = module.data as {
      dictionary: string;
      id: string;
      server: boolean;
    };
    if (server) {
      continue;
    }

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const { default: locales } = (await module.import()) as { default: MessageLocales };
    const pattern = locales[locale];
    if (!hasValue(pattern)) {
      continue;
    }

    ((translations[dictionary] ??= {})[locale] ??= {})[id] = pattern;
  }
  return translations;
}

export function resolveMessage<TFormat extends Format = undefined>(
  dictionary: string,
  id: string,
  locales: Optional<MessageLocales>,
  arg: Optional<Record<string, unknown>>,
  options?: MessageOptions<TFormat>,
): Resolved<TFormat>;
export function resolveMessage(
  dictionary: string,
  id: string,
  locales: Optional<MessageLocales>,
  arg: Optional<Record<string, unknown>>,
  options?: MessageOptions<Format>,
) {
  const locale = options?.locale ?? localeReader.read?.();
  if (!hasValue(locale)) {
    throw new Error(
      `No locale for ${dictionary} ${id}. Render it under a LocaleProvider or pass { locale }.`,
    );
  }

  const pattern = locales?.[locale] ?? registry[dictionary]?.[locale]?.[id];
  if (!hasValue(pattern)) {
    throw new Error(`Untranslated message ${dictionary} ${id} for ${locale}.`);
  }

  const messageFormat = compiled(locale, pattern);
  const format = options?.format;
  switch (format) {
    case null:
    case undefined:
    case "string": {
      return messageFormat.format(arg ?? undefined);
    }
    case "parts": {
      return messageFormat.formatToParts(arg ?? undefined);
    }
    default: {
      throw assertUnreachable(format);
    }
  }
}
