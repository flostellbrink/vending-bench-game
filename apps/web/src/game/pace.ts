interface PaceChange {
  day: number;
  player: number;
  rival: number;
  difference: number;
}

/** Compare changes only where both series have two consecutive recorded balances. */
export function largestPaceLoss(player: readonly number[], rival: readonly number[]) {
  let loss: PaceChange | undefined;
  for (let day = 1; day < Math.min(player.length, rival.length); day++) {
    const a = player[day - 1],
      b = player[day],
      c = rival[day - 1],
      d = rival[day];
    if (a === undefined || b === undefined || c === undefined || d === undefined) continue;
    const personal = Math.round(b * 100) - Math.round(a * 100);
    const other = Math.round(d * 100) - Math.round(c * 100);
    const difference = (personal - other) / 100;
    if (difference < 0 && (!loss || difference < loss.difference))
      loss = { day, player: personal / 100, rival: other / 100, difference };
  }
  return loss;
}
