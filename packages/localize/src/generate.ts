import type { Model } from "messageformat";

import {
  assertValue,
  hasAny,
  keys,
  entries,
  hasValue,
  fromEntries,
  type Optional,
} from "games-common/language";
import { MessageFormat, parseMessage } from "messageformat";
import { DraftFunctions } from "messageformat/functions";
import { hash } from "node:crypto";

import type { Message, Pattern } from "./schema.ts";

import { rootBaseLocaleKey, type NormalizedRootNode } from "./normalize.ts";
import { functionInputs } from "./schema.ts";
import {
  isMatcher,
  isMessage,
  messageIdKey,
  messageInputsKey,
  nodeInfoKey,
  rootLocalesKey,
  type Group,
  type Locale,
} from "./schema.ts";

const messagesPathPrefix = "msg";

interface GeneratorFile {
  path: string;
  lines: string[];
}

function isGeneratorMessage(entry: GeneratorEntry): entry is GeneratorMessage {
  return isMessage(entry.node);
}
type GeneratorEntry = GeneratorGroup | GeneratorMessage;
interface GeneratorGroup {
  key: string;
  path: string;
  node: Group;
}
interface GeneratorMessage {
  key: string;
  path: string;
  node: Message;
}

function messageIdOrHash(message: Message, baseLocale: Locale) {
  return (
    message[messageIdKey] ??
    hash("sha256", JSON.stringify({ base: message[baseLocale], input: message[messageInputsKey] }))
  );
}

export function* generateClient(
  root: NormalizedRootNode,
  dictionary: string,
): IterableIterator<GeneratorFile> {
  yield generateIndex();
  yield generateRuntime(root);

  const {
    $schema: _schema,
    [nodeInfoKey]: _info,
    [rootLocalesKey]: locales,
    [rootBaseLocaleKey]: _baseLocale,
    ...children
  } = root;
  yield* generateGroup({ key: messagesPathPrefix, node: children, path: "" });

  for (const entry of iterateEntries(children)) {
    if (isGeneratorMessage(entry)) {
      yield generateMessage(entry, root[rootBaseLocaleKey], dictionary);
      yield generateMessageLocales(entry, keys(locales), root[rootBaseLocaleKey]);
      continue;
    }

    yield* generateGroup(entry);
  }
}

function generateIndex(): GeneratorFile {
  return {
    lines: [`export * from "./${messagesPathPrefix}/index.ts";`, 'export * from "./runtime.ts";'],
    path: "index.ts",
  };
}

function generateRuntime(root: NormalizedRootNode): GeneratorFile {
  return {
    lines: [
      "export type Locale = (typeof locales)[number];",
      `export const baseLocale = "${root[rootBaseLocaleKey]}";`,
      "export const locales = [",
      ...entries(root[rootLocalesKey]).flatMap(([locale, name]) => [
        `  /** ${name} */`,
        `  "${locale}",`,
      ]),
      "] as const;",
    ],
    path: "runtime.ts",
  };
}

function* iterateEntries(parent: Group, prefix?: string): IterableIterator<GeneratorEntry> {
  for (const [key, node] of entries(parent)) {
    const path = prefix ? `${prefix}/${key}` : key;
    if (isMessage(node)) {
      yield { key, node, path };
      continue;
    }

    yield { key, node, path };
    yield* iterateEntries(node, path);
  }
}

function generateMessage(
  entry: GeneratorMessage,
  baseLocale: Locale,
  dictionary: string,
): GeneratorFile {
  const inputsName = `${capitalize(entry.key)}Inputs`;
  const message = parseMessage(assertValue(getRawMessage(entry.node, baseLocale)));
  const inputs = message.declarations.filter((declaration) => declaration.type === "input");
  const wrapperType = hasAny(inputs) ? "MessageWrapperRequired" : "MessageWrapperOptional";
  const id = messageIdOrHash(entry.node, baseLocale);

  return {
    lines: [
      `import { resolveMessage, type ${wrapperType} } from "games-localize";`,
      "",
      `import translations from "./${entry.key}.locales.ts";`,
      "",
      ...(hasAny(inputs)
        ? [
            `export type ${inputsName} = {`,
            ...inputs.map(
              (declaration) => `  ${declaration.name}: ${functionInput(declaration).type};`,
            ),
            "};",
          ]
        : [`export type ${inputsName} = Record<string, never>;`]),
      "",
      "/**",
      ...describeMessage(message, inputs, baseLocale).map((line) => ` * ${line}`.trimEnd()),
      " */",
      `export const ${entry.key}: ${wrapperType}<${inputsName}> = (arg, options) =>`,
      `  resolveMessage("${dictionary}", "${id}", translations, arg, options);`,
    ],
    path: `${messagesPathPrefix}/${entry.path}.ts`,
  };
}

function functionInput(declaration: Model.InputDeclaration) {
  const functionName = declaration.value.functionRef?.name;
  const input = !hasValue(functionName) ? undefined : functionInputs[functionName];
  if (!hasValue(input)) {
    throw new Error(`Unknown input function: ${functionName}`);
  }
  return input;
}

/** Base locale text with example inputs. Matchers list one line per variant. */
function describeMessage(
  message: Model.Message,
  inputs: Model.InputDeclaration[],
  baseLocale: Locale,
): string[] {
  const examples = fromEntries(
    inputs.map((declaration) => [
      declaration.name,
      functionInput(declaration).example(declaration.name),
    ]),
  );
  const format = (source: Model.Message) =>
    new MessageFormat(baseLocale, source, { bidiIsolation: "none", functions: DraftFunctions })
      .format(examples)
      .replaceAll("*/", String.raw`*\/`);

  // Docs render as Markdown, which joins single line breaks, so lines are separate paragraphs.
  if (message.type === "message") {
    return format(message).split("\n").join("\n\n").split("\n");
  }

  return message.variants.map((variant) => {
    const caseKeys = variant.keys.map((key) => (key.type === "*" ? "*" : key.value)).join(" ");
    const text = format({
      declarations: message.declarations,
      pattern: variant.value,
      type: "message",
    });
    return `- \`${caseKeys}\`: ${text.replaceAll("\n", " ")}`;
  });
}

function generateMessageLocales(
  entry: GeneratorMessage,
  locales: Locale[],
  baseLocale: Locale,
): GeneratorFile {
  return {
    lines: [
      "export default {",
      ...locales.map(
        (locale) =>
          `  ${locale}: ${JSON.stringify(getRawMessage(entry.node, locale) ?? getRawMessage(entry.node, baseLocale))},`,
      ),
      "};",
    ],
    path: `${messagesPathPrefix}/${entry.path}.locales.ts`,
  };
}

function generateGroup(entry: GeneratorGroup): GeneratorFile[] {
  const names: GeneratorFile = {
    lines: entries(entry.node).map(
      ([key, node]) => `export * from "./${key}${isMessage(node) ? ".ts" : "/index.ts"}";`,
    ),
    path: `${messagesPathPrefix}/${entry.path}/names.ts`,
  };

  const index: GeneratorFile = {
    lines: [`export * as ${entry.key} from "./names.ts";`],
    path: `${messagesPathPrefix}/${entry.path}/index.ts`,
  };

  return [names, index];
}

function getRawMessage(message: Message, locale: Locale): Optional<Pattern> {
  const preamble = (message[messageInputsKey] ?? []).flatMap((declaration) =>
    typeof declaration === "string"
      ? [`.input{${declaration}}`]
      : entries(declaration).map(([name, expression]) => `.local ${name}={${expression}}`),
  );

  const pattern = message[locale];
  if (!hasValue(pattern)) {
    return undefined;
  }

  if (isMatcher(pattern)) {
    const [selectors, ...cases] = pattern;
    const built = [
      ...preamble,
      `.match ${selectors} `,
      ...cases.flatMap((entry) =>
        entries(entry).map(([condition, raw]) => `${condition} {{${raw}}}`),
      ),
    ].join("");

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return built as Pattern;
  }

  if (preamble.length === 0) {
    return pattern;
  }

  const built = [...preamble, `{{${pattern}}}`].join("");

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return built as Pattern;
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
