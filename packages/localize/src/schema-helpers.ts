import { keys } from "games-common/language";
import * as v from "valibot";

type Chars<S extends string, Acc = never> = S extends `${infer C}${infer Rest}`
  ? Chars<Rest, Acc | C>
  : Acc;

export type ContentKey =
  `${Chars<"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_^">}${string}`;
export function isContentKey(key: string): key is ContentKey {
  return /^[A-Za-z_^]/.test(key);
}
export const contentKeySchema = v.pipe(v.string(), v.guard(isContentKey));

export function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

type DotObjectOutput<
  TEntries extends v.ObjectEntries,
  TRest extends v.GenericSchema,
> = v.InferOutput<v.ObjectSchema<TEntries, undefined>> & Record<ContentKey, v.InferOutput<TRest>>;

export function dotObject<
  const TEntries extends v.ObjectEntries,
  const TRest extends v.GenericSchema,
>(entries: TEntries, rest: TRest, restKeyRegex: RegExp) {
  const entryKeys = keys(entries).map(escapeRegex);
  const keyRegex = new RegExp(`^(?:${entryKeys.join("|")})$|${restKeyRegex.source}`);
  return v.intersect([
    v.pipe(
      v.objectWithRest(entries, rest),
      v.transform((input): DotObjectOutput<TEntries, TRest> => input),
    ),
    v.pipe(
      v.record(v.pipe(v.string(), v.regex(keyRegex)), v.unknown()),
      v.transform((): object => ({})),
    ),
  ]);
}
