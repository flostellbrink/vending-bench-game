import { hasAny } from "games-common/language";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

interface LoaderOptions {
  /** Name of the root layout segment that holds the locale, such as `locale` for `app/[locale]`. */
  localeParam?: string;
  browser?: boolean;
}

type Resolve = (context: string, request: string) => Promise<string>;

interface LoaderContext {
  resourcePath: string;
  getOptions: () => LoaderOptions;
  getResolve: () => Resolve;
  async: () => (error: unknown, result?: string) => void;
}

const importPattern = /import\s*\{(?<names>[^}]*)\}\s*from\s*["'](?<specifier>[^"']+)["'];?/g;
const chainPattern = /\bmsg(?<members>(?:\.\w+)+)/g;
const entryPattern = /[\\/]app[\\/](?:.*[\\/])?(?<entry>page|layout|not-found)\.tsx$/;
const directivePattern = /^(?:\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/|["']use [\w ]+["'];?))*/;
const messageModulePattern = /[\\/]dictionary[\\/]msg[\\/]/;
const resolvePattern = /resolveMessage\("(?<dictionary>[^"]+)", "(?<id>[^"]+)"/;
const localesImportPattern = /import (?<name>\w+) from "\.\/\w+\.locales";/;
const resolveCallPattern = /=>\s*(?<call>resolveMessage\([^;]*\));/;

function loader(this: LoaderContext, source: string) {
  const callback = this.async();
  transform(source, this.resourcePath, this.getOptions(), this.getResolve()).then(
    (result) => callback(null, result),
    (error: unknown) => callback(error),
  );
}

export default loader;

async function transform(
  source: string,
  resourcePath: string,
  options: LoaderOptions,
  resolve: Resolve,
) {
  if (messageModulePattern.test(resourcePath)) {
    return emitMessage(source, resourcePath, options.browser ?? false);
  }

  const result = await rewriteMessages(source, resourcePath, resolve);
  const entry = entryPattern.exec(resourcePath)?.groups?.entry;
  if (entry && options.localeParam) {
    return wrapEntry(result, entry, options.localeParam);
  }
  return result;
}

function emitMessage(source: string, resourcePath: string, browser: boolean) {
  const match = resolvePattern.exec(source)?.groups;
  if (!match) {
    return source;
  }

  // Browser bundles get their patterns from the page subset instead of all locales.
  if (browser) {
    source = source.replace(localesImportPattern, "const $<name> = undefined;");
  }

  const { dictionary, id } = match;
  const locales = `./${path.basename(resourcePath, path.extname(resourcePath))}.locales`;
  const emit = [
    `__turbopack_emit__("${locales}", {`,
    '    namespace: "games-localize",',
    `    data: { dictionary: "${dictionary}", id: "${id}", server: import.meta.env.SSR },`,
    "  });",
  ].join("\n");

  // The emit sits inside the message function, where it is not a top-level side effect.
  // Tree-shaking can still drop unused messages behind barrels. Turbopack removes the call.
  return source.replace(
    resolveCallPattern,
    (_, call: string) => `=> {\n  ${emit}\n  return ${call};\n};`,
  );
}

async function resolveDirectory(specifier: string, from: string, resolve: Resolve) {
  try {
    return path.dirname(await resolve(path.dirname(from), specifier));
  } catch {
    return undefined;
  }
}

function isDirectory(file: string) {
  return existsSync(file) && statSync(file).isDirectory();
}

function relativeImport(from: string, to: string) {
  const relative = path.relative(path.dirname(from), to).replaceAll("\\", "/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

async function findDictionaryImport(source: string, resourcePath: string, resolve: Resolve) {
  for (const match of source.matchAll(importPattern)) {
    const [statement] = match;
    const names = (match.groups?.names ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(hasAny);
    if (!names.includes("msg")) {
      continue;
    }
    const directory = await resolveDirectory(match.groups?.specifier ?? "", resourcePath, resolve);
    if (directory && isDirectory(path.join(directory, "msg"))) {
      return { directory, names, statement };
    }
  }
  return undefined;
}

async function rewriteMessages(source: string, resourcePath: string, resolve: Resolve) {
  const dictionaryImport = await findDictionaryImport(source, resourcePath, resolve);
  if (!dictionaryImport) {
    return source;
  }

  const { directory, names, statement } = dictionaryImport;
  const imports = new Map<string, string>();
  const body = source.replace(statement, "").replace(chainPattern, (chain, members: string) => {
    const parts = members.slice(1).split(".");
    let groupDepth = 0;
    for (let depth = 1; depth <= parts.length; depth++) {
      const base = path.join(directory, "msg", ...parts.slice(0, depth));
      if (existsSync(`${base}.ts`)) {
        const local = `__msg_${parts.slice(0, depth).join("_")}`;
        const name = parts[depth - 1];
        imports.set(
          local,
          `import { ${name} as ${local} } from "${relativeImport(resourcePath, base)}";`,
        );
        return [local, ...parts.slice(depth)].join(".");
      }
      if (!isDirectory(base)) {
        break;
      }
      groupDepth = depth;
    }
    if (groupDepth === 0) {
      return chain;
    }
    const group = path.join(directory, "msg", ...parts.slice(0, groupDepth), "names");
    const local = `__msg_${parts.slice(0, groupDepth).join("_")}`;
    imports.set(local, `import * as ${local} from "${relativeImport(resourcePath, group)}";`);
    return [local, ...parts.slice(groupDepth)].join(".");
  });

  const stillUsesBarrel = /\bmsg\b/.test(body);
  const kept = names.filter((name) => name !== "msg" || stillUsesBarrel);
  const specifier = relativeImport(resourcePath, directory);
  const rewritten = kept.length > 0 ? `import { ${kept.join(", ")} } from "${specifier}";` : "";

  const prologue = directivePattern.exec(body)?.[0] ?? "";
  return [prologue, rewritten, ...imports.values(), body.slice(prologue.length)].join("\n");
}

/**
 * Server entries set the request locale before they render or build metadata, because
 * Next may run a page before its layout. Pages also provide the browser subset of the route.
 */
function wrapEntry(source: string, entry: string, localeParam: string) {
  const prologue = directivePattern.exec(source)?.[0] ?? "";
  if (/["']use client["']/.test(prologue)) {
    return source;
  }

  const lines = [
    'import { enterRequest as __enterRequest } from "games-localize";',
    `import { ${localeParam} as __rootLocale } from "next/root-params";`,
  ];

  let result = source;
  if (/export\s+async\s+function\s+generateMetadata\s*\(/.test(result)) {
    result = result.replace(
      /export\s+async\s+function\s+generateMetadata\s*\(/,
      "async function __generateMetadataInner(",
    );
    lines.push(
      "export async function generateMetadata(...args: any[]) {",
      "  __enterRequest(await __rootLocale());",
      "  return (__generateMetadataInner as any)(...args);",
      "}",
    );
  }

  if (/export\s+default\s/.test(result)) {
    result = result.replace(/export\s+default\s/, "const __LocalizedInner = ");
    if (entry === "page") {
      lines.push(
        'import { collectTranslations as __collectTranslations } from "games-localize";',
        'import { LocaleProvider as __LocaleProvider } from "games-localize/react";',
        'const __getTranslationModules = __turbopack_collect__({ namespace: "games-localize" });',
        "export default async function __LocalizedPage(props: any) {",
        "  const locale = await __rootLocale();",
        "  __enterRequest(locale);",
        "  if (locale == undefined) return <__LocalizedInner {...props} />;",
        "  const translations = await __collectTranslations(__getTranslationModules(), locale);",
        "  return (",
        "    <__LocaleProvider locale={locale} translations={translations}>",
        "      <__LocalizedInner {...props} />",
        "    </__LocaleProvider>",
        "  );",
        "}",
      );
    } else {
      lines.push(
        "export default async function __LocalizedEntry(props: any) {",
        "  __enterRequest(await __rootLocale());",
        "  return <__LocalizedInner {...props} />;",
        "}",
      );
    }
  }

  return [result, ...lines].join("\n");
}
