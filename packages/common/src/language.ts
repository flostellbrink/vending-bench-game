// MARK: Type checks

export type Assert<T extends true> = T;
/** The brackets stop the check from running once for each member of a union. */
export type IsAssignable<A, B> = [A] extends [B] ? true : false;
export type IsEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// MARK: Time

export const msPerSecond = 1000;
export const msPerMinute = 60 * msPerSecond;
export const msPerHour = 60 * msPerMinute;
export const hoursPerDay = 24;
export const msPerDay = hoursPerDay * msPerHour;
export const daysPerWeek = 7;
export const daysPerQuarter = 90;

type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (
  arg: infer I,
) => void
  ? I
  : never;
type LastOf<U> =
  UnionToIntersection<U extends unknown ? () => U : never> extends () => infer L ? L : never;
type UnionToTuple<U, T extends unknown[] = []> = [U] extends [never]
  ? T
  : UnionToTuple<Exclude<U, LastOf<U>>, [LastOf<U>, ...T]>;

// MARK: Errors and text

export function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return jsonStringifyPretty(error) ?? String(error);
  } catch {
    return String(error);
  }
}

/** The JSON text of a value, or undefined for a value with no JSON, such as a function. */
export function jsonStringifyPretty(value: unknown) {
  const space = 2;
  const text: Optional<string> = JSON.stringify(value, null, space);
  return text;
}

export function classNames(...classes: Optional<string | false>[]) {
  return classes.filter((value) => value !== false && hasAny(value)).join(" ");
}

// MARK: Optional values

export type Optional<T> = T | undefined | null;
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasValue<T>(value: Optional<T>): value is T {
  return value != undefined;
}

export function assertValue<T>(value: Optional<T>): T {
  if (!hasValue(value)) {
    throw new Error("Missing value");
  }
  return value;
}

export function assertUnique<T>(values: T[]): T[] {
  const set = new Set();
  for (const value of values) {
    if (set.has(value)) {
      // oxlint-disable-next-line typescript/restrict-template-expressions
      throw new Error(`values are not unique (duplicate: ${value})`);
    }
    set.add(value);
  }
  return values;
}

export function assertUniqueBy<T>(values: T[], selector: (value: T) => unknown): T[] {
  assertUnique(values.map(selector));
  return values;
}

/** Each value but null and undefined, as `NonNullable<unknown>`. */
type Present = bigint | boolean | number | object | string | symbol;

export function mapValue<T extends Present, U>(value: T, callback: (value: T) => U): U;
export function mapValue<T extends Present, U>(
  value: T | null,
  callback: (value: T) => U,
): U | null;
export function mapValue<T extends Present, U>(
  value: T | undefined,
  callback: (value: T) => U,
): U | undefined;
export function mapValue<T extends Present, U>(
  value: Optional<T>,
  callback: (value: T) => U,
): Optional<U>;
export function mapValue<T, U>(value: Optional<T>, callback: (value: T) => U): Optional<U> {
  return hasValue(value) ? callback(value) : value;
}

export type MaybeArray<T> = T | T[];

export function flatMapMaybeArray<T, U>(value: MaybeArray<T>, map: (value: T) => U): U[] {
  if (Array.isArray(value)) {
    return value.map(map);
  }
  return [map(value)];
}

export function recordValuesOnly<T>(value: T): T {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.fromEntries(
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    Object.entries(value as Record<string, unknown>).filter(([_, v]) => hasValue(v)),
  ) as T;
}

// MARK: Numbers and waits

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function delay(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) {
    return;
  }

  return new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

export function assertUnreachable(x: never): Error {
  // oxlint-disable-next-line typescript/restrict-template-expressions
  throw new Error(`Unexpected: ${x}`);
}

// MARK: Lists and records

export function hasAny<T>(value: Optional<T[]>): value is T[];
export function hasAny(value: Optional<string>): value is string;
export function hasAny(value: Optional<unknown[] | string>) {
  return hasValue(value) && value.length > 0;
}

export function mapAny<T, U>(array: Optional<T[]>, callback: (array: T[]) => U): Optional<U> {
  return hasAny(array) ? callback(array) : undefined;
}

export function first<T>(array: T[]): T {
  if (!array.length) {
    throw new Error("Array is empty");
  }
  return assertValue(array[0]);
}

export function last<T>(array: T[]): T {
  if (!array.length) {
    throw new Error("Array is empty");
  }
  return assertValue(array[array.length - 1]);
}

export function single<T>(array: Optional<T[]>): T {
  if (!hasValue(array)) {
    throw new Error("Array is missing");
  }
  if (!array.length) {
    throw new Error("Array is empty");
  }
  if (array.length > 1) {
    throw new Error("Array has more than one element");
  }
  return assertValue(array[0]);
}

type StringKey<T> = Extract<T, string> | `${Extract<T, number>}`;

export function keys<T extends object>(values: T) {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.keys(values) as StringKey<keyof T>[];
}

export function entries<TKey extends string | number, TValue>(
  values: Partial<Record<TKey, TValue>>,
): [StringKey<TKey>, TValue][];
export function entries<T extends object>(values: T): [StringKey<keyof T>, T[keyof T]][];
export function entries<TKey extends string | number, TValue>(
  values: Partial<Record<TKey, TValue>>,
): [StringKey<TKey>, TValue][] {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.entries(values) as [StringKey<TKey>, TValue][];
}

export function fromEntries<T extends readonly [string | number, unknown]>(
  values: Iterable<T>,
): Record<T[0], T[1]> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.fromEntries(values) as Record<T[0], T[1]>;
}

export function includes<T>(array: readonly T[], value: unknown): value is T {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return array.includes(value as T);
}

export function stringEnumValues<T extends string>(enumObject: Record<string, T>): UnionToTuple<T> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.values(enumObject) as UnionToTuple<T>;
}

export function concat<TA, TB>(a: TA[], ...b: TB[] | TB[][]) {
  const result: (TA | TB)[] = [];
  return result.concat(a).concat(...b);
}

export function sequenceEquals<T>(a: T[], b: T[], predicate: (a: T, b: T) => boolean) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (!predicate(assertValue(a[i]), assertValue(b[i]))) {
      return false;
    }
  }
  return true;
}

export function chunkify<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// MARK: Async lists

export function mapAsync<T, U>(
  array: T[],
  callback: (value: T, index: number, array: T[]) => Promise<U>,
) {
  return Promise.all(array.map(callback));
}

export async function mapAsyncSerial<T, U>(
  array: T[],
  callback: (value: T, index: number, array: T[]) => Promise<U>,
) {
  const results: U[] = [];
  for (const [i, entry] of array.entries()) {
    results.push(await callback(entry, i, array));
  }
  return results;
}

export function upsertByKey<TValue, TKey>(
  array: TValue[],
  key: TKey,
  getKey: (value: TValue) => TKey,
  value: (previous: Optional<TValue>) => TValue,
) {
  array = array.slice();
  const index = array.findIndex((item) => getKey(item) === key);
  if (index !== -1) {
    array[index] = value(array[index]);
  } else {
    array.push(value(null));
  }
  return array;
}

export function filterAsync<T>(
  array: T[],
  callback: (value: T, index: number, array: T[]) => Promise<boolean>,
) {
  return Promise.all(array.map(callback)).then((results) =>
    array.filter((_, index) => results[index]),
  );
}

export function mapSum<T>(array: T[], callback: (value: T, index: number, array: T[]) => number) {
  return array.reduce((sum, value, index) => sum + callback(value, index, array), 0);
}

const defaultBufferSize = 2;

export async function* buffer<T>(
  iterator: AsyncIterableIterator<T>,
  size = defaultBufferSize,
): AsyncIterableIterator<T> {
  const queue = [];
  for (let i = 0; i < size; i++) {
    queue.push(iterator.next());
  }
  while (true) {
    const current = assertValue(queue.shift());
    queue.push(iterator.next());

    const result = await current;
    if (result.done) {
      break;
    }

    yield result.value;
  }
}

// MARK: Nesting, hashes and weights

// oxlint-disable-next-line no-magic-numbers
type MinusOne = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
type NestedArray<T, D extends number> = D extends 0 ? T[] : T[] | NestedArray<T[], MinusOne[D]>;

// oxlint-disable-next-line no-magic-numbers
export function isFlat<T>(array: NestedArray<T, 10>): array is T[] {
  return !array.some(Array.isArray);
}

export function stringHash(str: string): number {
  // 32-bit FNV-1a hash
  // oxlint-disable-next-line no-magic-numbers
  let h = 2_166_136_261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // oxlint-disable-next-line no-magic-numbers
    h = Math.imul(h, 16_777_619) >>> 0;
  }

  // Mulberry32 PRNG seeded with the hash
  let seed = h >>> 0;
  // Avoid zero-seed behavior
  // oxlint-disable-next-line no-magic-numbers
  seed = (seed + 0x6d_2b_79_f5) >>> 0;

  // Single-sample generator
  // oxlint-disable-next-line no-magic-numbers
  seed = (seed + 0x6d_2b_79_f5) >>> 0;
  // oxlint-disable-next-line no-magic-numbers
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed) >>> 0;
  // oxlint-disable-next-line no-magic-numbers operator-assignment
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  // oxlint-disable-next-line no-magic-numbers
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
}

export type SetStoredAction<T> = (previous: Optional<T>) => Optional<T>;

// MARK: Caches

export function lazy<T>(getter: () => T): () => T {
  let cached: { result: T } | undefined = undefined;

  return () => {
    if (hasValue(cached)) {
      return cached.result;
    }

    cached = { result: getter() };
    return cached.result;
  };
}
