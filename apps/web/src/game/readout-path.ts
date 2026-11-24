export type View = string | number;

export function enterReadout(path: readonly View[], next: View, inspectObject = false): View[] {
  if (
    typeof next === "string" &&
    !next.startsWith("past:") &&
    !next.startsWith("day:") &&
    !(inspectObject && (next.startsWith("machine:") || next.startsWith("supplier:")))
  )
    return [next];
  const existing = path.indexOf(next);
  return existing < 0 ? [...path, next] : path.slice(0, existing + 1);
}
