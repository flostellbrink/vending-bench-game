import type { Optional } from "games-common/language";

import { concourse } from "./Atrium";
import { Box, Line, project, steel, wood, type Position } from "./geometry";

export interface ServiceMotion {
  drink: boolean;
  progress: number;
  open: number;
}

export function Person({
  x,
  y,
  walk = 0,
  coat = "#697f83",
  facing = 1,
}: Position & { walk?: number; coat?: string; facing?: number }) {
  const [cx, cy] = project([x, y, 0]);
  const step = Math.sin(walk) * 2.1;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${facing * 1.72} 1.72)`}>
      <ellipse cx="1.5" cy=".5" rx="6.6" ry="2.2" fill="#5f7064" opacity=".3" />
      <path
        d={`M-2 -13 L${-2 - step} -5 L${-2 - step * 1.35} -1 M2 -13 L${2 + step * 0.5} -7 L${2 + step * 1.35} -1`}
        fill="none"
        stroke="#43545a"
        strokeWidth="2.7"
      />
      <path
        d={`M${-3 - step * 1.35} -.6 h3 M${1 + step * 1.35} -.6 h3`}
        stroke="#364744"
        strokeWidth="1.6"
      />
      <path d="M-3.8 -24 Q-.5 -26 3 -23 L4.5 -12 Q1 -10 -4 -12Z" fill={coat} />
      <path d="M-3 -22 L-4 -17 L-1 -14" fill="none" stroke="#526567" strokeWidth="2.2" />
      <path d="M1 -24 L3 -22 L1 -17" stroke="#c3ad88" strokeWidth="1.5" fill="none" />
      <path d="M-2 -29 Q1 -31 3 -28 L3 -26 L4 -25.5 L2 -24 L-.5 -24 L-2 -26Z" fill="#bd957c" />
      <path d="M-2.6 -27 Q-3 -30 0 -30.5 Q3 -31 3.4 -28 L.5 -28 L-.8 -26Z" fill="#58554b" />
    </g>
  );
}
export function ServiceVisit({
  service,
  atrium,
}: {
  service: Optional<ServiceMotion>;
  atrium: boolean;
}) {
  if (!service) return null;
  const offset = Math.max(0, 1 - Math.min(service.progress, 1 - service.progress) * 5);
  const cabinetX = (atrium ? concourse.machineX : 126) + (service.drink ? 51 : 15);
  const x = atrium
    ? cabinetX + (concourse.entry - cabinetX) * Math.min(1, offset * 1.25)
    : cabinetX;
  const y = atrium
    ? concourse.aisle - 6 + Math.max(0, offset - 0.8) * 5 * (concourse.depth - concourse.aisle)
    : 49 + offset * 37;
  return (
    <g>
      <Box x={x + 8} y={y + 4} w={13} d={8} z={2} h={2} c={steel} />
      <Box x={x + 9} y={y + 5} w={10} d={7} z={4} h={7} c={wood} />
      <Line a={[x + 20, y + 5, 3]} b={[x + 20, y + 5, 31]} color="#586c63" width="1.5" />
      <Line a={[x + 20, y + 5, 31]} b={[x + 20, y + 11, 31]} color="#67796e" width="1.5" />
      <Person x={x + 5} y={y + 9} walk={offset * 12} coat="#697e69" />
    </g>
  );
}
