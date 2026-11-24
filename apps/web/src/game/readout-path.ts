export type View = string | number;

export function enterReadout(path: readonly View[], next: View, inspection = false): View[] {
  if (
    typeof next === "string" &&
    !next.startsWith("past:") &&
    !next.startsWith("day:") &&
    !(inspection && next.startsWith("machine:"))
  )
    return [next];
  const existing = path.indexOf(next);
  return existing < 0 ? [...path, next] : path.slice(0, existing + 1);
}
