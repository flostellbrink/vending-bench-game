import { fileURLToPath } from "node:url";

interface Options {
  /** Name of the root layout segment that holds the locale, such as `locale` for `app/[locale]`. */
  localeParam: string;
}

const loader = fileURLToPath(new URL("loader.ts", import.meta.url));

const files = {
  all: [
    { not: "foreign" as const },
    {
      any: [
        { content: /\b(?:msg|resolveMessage)\b/ },
        { path: /(?:^|\/)app\/(?:.*\/)?(?:page|layout|not-found)\.tsx$/ },
      ],
    },
  ],
};

/** Turbopack rules for the localize loader, to spread into `turbopack.rules`. */
export function localizeRules({ localeParam }: Options) {
  const rules = [true, false].map((browser) => ({
    condition: { all: [files, browser ? ("browser" as const) : { not: "browser" as const }] },
    loaders: [{ loader, options: { browser, localeParam } }],
  }));
  // Turbopack starts a loader process for each rule key in each context: keep one key.
  return { "*.{ts,tsx}": rules };
}
