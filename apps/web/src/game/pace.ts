import { hasValue, type Optional } from "games-common/language";

interface PaceChange {
  day: number;
  player: number;
  rival: number;
  difference: number;
}

/** Compare changes only where both series have two consecutive recorded balances. */
export function largestPaceLoss(player: readonly number[], rival: readonly number[]) {
  let loss: Optional<PaceChange> = undefined;
  for (let day = 1; day < Math.min(player.length, rival.length); day++) {
    const a = player[day - 1];
    const b = player[day];
    const c = rival[day - 1];
    const d = rival[day];
    if (!hasValue(a) || !hasValue(b) || !hasValue(c) || !hasValue(d)) {
      continue;
    }
    const personal = Math.round(b * 100) - Math.round(a * 100);
    const other = Math.round(d * 100) - Math.round(c * 100);
    const difference = (personal - other) / 100;
    if (difference < 0 && (!loss || difference < loss.difference)) {
      loss = { day, difference, player: personal / 100, rival: other / 100 };
    }
  }
  return loss;
}
