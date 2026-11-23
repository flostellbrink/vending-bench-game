import { keys } from "games-common/language";
import * as v from "valibot";

import type { ContentKey } from "./schema-helpers.ts";

import { schemaExamples } from "./schema-examples.ts";
import { contentKeySchema, dotObject } from "./schema-helpers.ts";

export const defaultSchemaUrl = "../localize/dictionary.schema.yaml";

export const messageIdKey = ".id";
export const nodeInfoKey = ".info";
export const messageInputsKey = ".inputs";
export const rootLocalesKey = ".locales";
export const baseLocalePrefix = "^";
export function isMessage(node: Group | Message): node is Message {
  return v.is(messageSchema, node);
}
export function isMatcher(pattern: Pattern | Matcher): pattern is Matcher {
  return Array.isArray(pattern);
}

const nodeInfoSchema = v.pipe(
  v.string(),
  v.title("Translation information"),
  v.description(
    "Author intent for human or machine translation. Root information gives context to all messages; message information describes specific intent.",
  ),
  v.metadata({ examples: schemaExamples.information }),
);

// https://github.com/unicode-org/message-format-wg/tree/main/spec/functions
// https://github.com/messageformat/messageformat/tree/main/mf2/messageformat/src/functions
// TODO: ideally extract full function definition and params from the spec or reference implementation!
/** Input type of each function, and the example value that message docs show for an input. */
export const functionInputs: Record<string, { type: string; example: (name: string) => unknown }> =
  {
    string: { example: (name) => `{${name}}`, type: "string" },

    currency: { example: () => 10, type: "number" },
    integer: { example: () => 5, type: "number" },
    number: { example: () => 1000, type: "number" },
    offset: { example: () => 1, type: "number" },
    percent: { example: () => 1 / 2, type: "number" },
    unit: { example: () => 5, type: "number" },

    date: { example: () => new Date("2026-01-15T14:30"), type: "Date | number | string" },
    datetime: { example: () => new Date("2026-01-15T14:30"), type: "Date | number | string" },
    time: { example: () => new Date("2026-01-15T14:30"), type: "Date | number | string" },
  };

export const nameRegex = /^(?!\d)\w+$/;

export type MessageKey = v.InferOutput<typeof messageIdSchema>;
export const messageIdLength = 8;
export const messageIdSchema = v.pipe(
  v.string(),
  v.length(messageIdLength),
  v.regex(nameRegex),
  v.brand("id"),
  v.title("Message ID"),
  v.description(`Stable message identifier with ${messageIdLength} characters.`),
);

export type MessageName = v.InferOutput<typeof groupNameSchema>;
export const groupNameSchema = v.pipe(
  contentKeySchema,
  v.regex(nameRegex),
  v.brand("name"),
  v.title("Message or group name"),
  v.description(`Message or group name. Use lower camel case.`),
);

export type Locale = v.InferOutput<typeof localeSchema>;
export const localeRegex = /^(?:\^)?(?<language>[a-z]{2,3})(?:-(?<country>[A-Z]{2}))?$/;
export const localeSchema = v.pipe(
  contentKeySchema,
  v.regex(localeRegex),
  v.brand("locale"),
  v.title("Locale"),
  v.description(
    "Language code with an optional country code, such as en or en-US. Base locale is prefixed with ^.",
  ),
);

export type RootLocales = v.InferOutput<typeof localesSchema>;
const localesSchema = v.pipe(
  v.record(
    localeSchema,
    v.pipe(
      v.string(),
      v.nonEmpty(),
      v.title("Language name"),
      v.description("The language name written in the dictionary's base locale."),
    ),
  ),
  v.minEntries(1),
  v.check(
    (locales) => keys(locales).filter((code) => code.startsWith(baseLocalePrefix)).length === 1,
    "Exactly one locale must have the ^ base-locale prefix.",
  ),
  v.check((locales) => {
    const codes = keys(locales).map((code) => code.replace(/^\^/, ""));
    return new Set(codes).size === codes.length;
  }, "Locales cannot have duplicates."),
  v.title("Supported locales"),
  v.description(
    "Locale codes paired with language names. Mark exactly one base locale with ^. Codes must be unique with the prefix removed; entry order has no meaning.",
  ),
  v.metadata({ examples: schemaExamples.locales }),
);

// https://messageformat.unicode.org/docs/reference/patterns/
export type Pattern = v.InferOutput<typeof patternSchema>;
export const patternSchema = v.pipe(
  v.string(),
  v.brand("pattern"),
  v.title("Pattern"),
  v.description("Text with optional expressions in braces. Variables use a $ prefix."),
  v.metadata({ examples: schemaExamples.patterns }),
);

// https://messageformat.unicode.org/docs/reference/matchers/
const matcherCaseSchema = v.pipe(
  v.record(
    v.pipe(
      v.string(),
      v.title("Case keys"),
      v.description("One key per selector, separated by spaces. * matches any value."),
    ),
    patternSchema,
  ),
  v.minEntries(1),
  v.maxEntries(1),
  v.title("Match case"),
  v.description("One combination of selector keys and its pattern."),
);

export type Matcher = v.InferOutput<typeof matcherSchema>;
export const matcherSchema = v.pipe(
  v.tupleWithRest(
    [
      v.pipe(
        v.string(),
        v.title("Selectors"),
        v.description(
          "Space-separated input or local variables. Their functions determine which variant matches.",
        ),
        v.metadata({ examples: schemaExamples.selectors }),
      ),
      matcherCaseSchema,
    ],
    matcherCaseSchema,
  ),
  v.title("Matcher"),
  v.description(
    "A selector string followed by single-key case objects. Selects a pattern from runtime values.",
  ),
  v.metadata({ examples: schemaExamples.matchers }),
);

export type LocalizedMessage = v.InferOutput<typeof localizedMessageSchema>;
export const localizedMessageSchema = v.pipe(
  v.string(),
  v.brand("localized"),
  v.title("Formatted message"),
  v.description("The text produced after a message is formatted for a locale."),
);

// https://messageformat.unicode.org/docs/reference/variables/
const variableNameSchema = v.pipe(
  v.string(),
  v.startsWith("$"),
  v.title("Variable name"),
  v.description("A variable reference with a $ prefix, such as $count."),
);

// https://messageformat.unicode.org/docs/reference/variables/#input-declarations
// https://messageformat.unicode.org/docs/reference/functions/
const messageInputSchema = v.pipe(
  v.string(),
  v.startsWith("$"),
  v.title("Input declaration"),
  v.description(
    "An input variable with its function and options, without outer braces. Shared by all locales.",
  ),
  v.metadata({ examples: schemaExamples.inputDeclarations }),
);

// https://messageformat.unicode.org/docs/reference/variables/#local-declarations
const messageLocalSchema = v.pipe(
  v.record(
    variableNameSchema,
    v.pipe(
      v.string(),
      v.title("Local expression"),
      v.description(
        "An expression without outer braces. It can refer to inputs or earlier locals.",
      ),
      v.metadata({ examples: schemaExamples.localExpressions }),
    ),
  ),
  v.minEntries(1),
  v.maxEntries(1),
  v.title("Local declaration"),
  v.description("Binds one variable to an expression. It can use earlier declarations."),
  v.metadata({ examples: schemaExamples.localDeclarations }),
);

// Declaration order follows MF2; strings represent inputs and single-key maps represent locals.
// https://messageformat.unicode.org/docs/reference/variables/#declarations
const messageDeclarationsSchema = v.pipe(
  v.array(v.union([messageInputSchema, messageLocalSchema])),
  v.title("Inputs and locals"),
  v.description(
    "Ordered input and local declarations shared by all locales. Strings declare inputs; single-key objects declare locals.",
  ),
  v.metadata({ examples: schemaExamples.declarations }),
);

export type Message = v.InferOutput<typeof messageSchema>;
const messageSchema = v.pipe(
  dotObject(
    {
      [messageIdKey]: v.optional(messageIdSchema),
      [nodeInfoKey]: v.optional(nodeInfoSchema),
      [messageInputsKey]: v.optional(messageDeclarationsSchema),
    },
    v.pipe(
      v.union([patternSchema, matcherSchema]),
      v.title("Locale message"),
      v.description(
        "A pattern or matcher. Use the same locale key as .locales, including ^ for the base locale.",
      ),
    ),
    localeRegex,
  ),
  v.title("Message"),
  v.description(
    "Locale patterns or matchers with a stable ID and shared input and local declarations.",
  ),
  v.metadata({ examples: schemaExamples.messages }),
);

export interface Group {
  [key: ContentKey]: Group | Message;
}
const childNodeSchema = v.pipe(
  v.union([v.lazy(() => groupSchema), messageSchema]),
  v.title("Child node"),
  v.description("A nested group or a message with locale entries."),
);
export const groupSchema: v.GenericSchema<unknown, Group> = v.pipe(
  v.record(groupNameSchema, childNodeSchema),
  v.title("Group"),
  v.description("Groups named messages and nested groups at any depth."),
);

export type RootNode = v.InferOutput<typeof rootNodeSchema>;
export const rootNodeSchema = v.pipe(
  dotObject(
    {
      $schema: v.pipe(
        v.fallback(v.string(), defaultSchemaUrl),
        v.title("Schema reference"),
        v.description("The JSON Schema used by the editor to validate this dictionary."),
      ),
      [nodeInfoKey]: v.optional(nodeInfoSchema),
      [rootLocalesKey]: localesSchema,
    },
    childNodeSchema,
    nameRegex,
  ),
  v.title("Root"),
  v.description(
    "Dictionary metadata and named messages or groups. .locales specifies the languages and base locale.",
  ),
);
