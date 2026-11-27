import type { Optional } from "games-common/language";

import { concourse } from "./Atrium.tsx";
import { Box, Line, project, steel, wood, type Position } from "./geometry.tsx";

export interface ServiceMotion {
  drink: boolean;
  progress: number;
  inspecting: boolean;
  open: number;
}

const figure = {
  footReach: 1.35,
  hand: { lift: 4, reach: 5, x: 6, y: -18 },
  lean: 16,
  rearKnee: 0.5,
  scale: 1.72,
  shoe: -3,
  stride: 2.1,
};
const visit = {
  aisleSide: 6,
  aisleTurn: 0.8,
  behindTrolley: 9,
  besideTrolley: 5,
  drinkStandX: 51,
  inspectStart: 0.25,
  roomCabinetX: 126,
  roomCabinetY: 49,
  roomWalk: 37,
  snackStandX: 15,
  strides: 15,
  walkSpeed: 1.25,
};
const trolley = {
  base: { x: 8, y: 4 },
  crate: { x: 9, y: 5 },
  handle: { foot: 3, grip: 11, top: 31, x: 20, y: 5 },
};

export function Person({
  x,
  y,
  walk = 0,
  coat = "#697f83",
  facing = 1,
  check = 0,
}: Position & { walk?: number; coat?: string; facing?: number; check?: number }) {
  const [cx, cy] = project([x, y, 0]);
  const step = Math.sin(walk) * figure.stride;
  const hand = {
    x: figure.hand.x + check * figure.hand.reach,
    y: figure.hand.y - check * figure.hand.lift,
  };
  return (
    <g transform={`translate(${cx} ${cy}) scale(${facing * figure.scale} ${figure.scale})`}>
      <ellipse cx="1.5" cy=".5" rx="6.6" ry="2.2" fill="#5f7064" opacity=".3" />
      <path
        d={`M-2 -13 L${-2 - step} -5 L${-2 - step * figure.footReach} -1 M2 -13 L${2 + step * figure.rearKnee} -7 L${2 + step * figure.footReach} -1`}
        fill="none"
        stroke="#43545a"
        strokeWidth="2.7"
      />
      <path
        d={`M${figure.shoe - step * figure.footReach} -.6 h3 M${1 + step * figure.footReach} -.6 h3`}
        stroke="#364744"
        strokeWidth="1.6"
      />
      <g transform={`rotate(${check * figure.lean} 0 -12)`}>
        <path d="M-3.8 -24 Q-.5 -26 3 -23 L4.5 -12 Q1 -10 -4 -12Z" fill={coat} />
        {check > 0 ? (
          <g>
            <path
              d={`M1 -22 L5 -18 L${hand.x} ${hand.y}`}
              fill="none"
              stroke={coat}
              strokeWidth="2.8"
            />
            <circle cx={hand.x} cy={hand.y} r="1.4" fill="#c09d80" />
          </g>
        ) : (
          <path d="M-3 -22 L-4 -17 L-1 -14" fill="none" stroke="#526567" strokeWidth="2.2" />
        )}
        <path d="M1 -24 L3 -22 L1 -17" stroke="#c3ad88" strokeWidth="1.5" fill="none" />
        <path d="M-2 -29 Q1 -31 3 -28 L3 -26 L4 -25.5 L2 -24 L-.5 -24 L-2 -26Z" fill="#bd957c" />
        <path d="M-2.6 -27 Q-3 -30 0 -30.5 Q3 -31 3.4 -28 L.5 -28 L-.8 -26Z" fill="#58554b" />
      </g>
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
  if (!service) {
    return null;
  }
  const offset = Math.max(0, 1 - Math.min(service.progress, 1 - service.progress) * 4);
  const cabinetX =
    (atrium ? concourse.machineX : visit.roomCabinetX) +
    (service.drink ? visit.drinkStandX : visit.snackStandX);
  const x = atrium
    ? cabinetX + (concourse.entry - cabinetX) * Math.min(1, offset * visit.walkSpeed)
    : cabinetX;
  const y = atrium
    ? concourse.aisle -
      visit.aisleSide +
      Math.max(0, offset - visit.aisleTurn) * 5 * (concourse.depth - concourse.aisle)
    : visit.roomCabinetY + offset * visit.roomWalk;
  const { base, crate, handle } = trolley;
  return (
    <g>
      {!service.inspecting && (
        <>
          <Box x={x + base.x} y={y + base.y} w={13} d={8} z={2} h={2} c={steel} />
          <Box x={x + crate.x} y={y + crate.y} w={10} d={7} z={4} h={7} c={wood} />
          <Line
            a={[x + handle.x, y + handle.y, handle.foot]}
            b={[x + handle.x, y + handle.y, handle.top]}
            color="#586c63"
            width="1.5"
          />
          <Line
            a={[x + handle.x, y + handle.y, handle.top]}
            b={[x + handle.x, y + handle.grip, handle.top]}
            color="#67796e"
            width="1.5"
          />
        </>
      )}
      <Person
        x={x + visit.besideTrolley}
        y={y + (service.inspecting ? 0 : visit.behindTrolley)}
        walk={offset * visit.strides}
        check={
          service.inspecting && offset === 0
            ? Math.sin((service.progress - visit.inspectStart) * Math.PI * 2)
            : 0
        }
        coat={service.inspecting ? "#9d6d46" : "#697e69"}
      />
    </g>
  );
}
