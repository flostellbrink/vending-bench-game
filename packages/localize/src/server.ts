import { type Optional } from "games-common/language";
import { cache } from "react";

import * as core from "./index.ts";

export * from "./index.ts";

const request = cache((): { locale?: string } => ({}));

/** Sets the locale for the current server request. The loader calls this in each entry. */
export function enterRequest(locale: Optional<string>) {
  request().locale = locale ?? undefined;
}

export const resolveMessage: typeof core.resolveMessage = (dictionary, id, locales, arg, options) =>
  core.resolveMessage(dictionary, id, locales, arg, {
    ...options,
    locale: options?.locale ?? request().locale,
  });
