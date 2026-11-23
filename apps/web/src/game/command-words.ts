/** Split the shell's arguments without running them. Quoted arguments can contain line breaks. */
export function commandWords(line: string, usage = "help"): string[] {
  const words: string[] = [];
  let word = "",
    quoted = false,
    started = false;
  for (let index = 0; index < line.length; index++) {
    const char = line.charAt(index);
    if (char === '"') {
      quoted = !quoted;
      started = true;
      continue;
    }
    const next = line.charAt(index + 1);
    if (quoted && char === "\\" && (next === '"' || next === "\\")) {
      word += next;
      index++;
      continue;
    }
    if (!quoted && /\s/.test(char)) {
      if (started) words.push(word);
      word = "";
      started = false;
    } else {
      word += char;
      started = true;
    }
  }
  if (quoted) throw Error(usage);
  if (started) words.push(word);
  return words;
}

export function quotedWord(value: string): string {
  return '"' + value.replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"';
}
