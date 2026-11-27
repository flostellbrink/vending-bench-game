import type { Report } from "games-common/benchmark";

import { hasValue, type Optional } from "games-common/language";
import { memo } from "react";

import { Carton } from "./Furniture.tsx";
import {
  Box,
  Floor,
  Front,
  Line,
  Polygon,
  project,
  repeat,
  steel,
  wood,
  type Vertex,
} from "./geometry.tsx";
import { minutesPerDay } from "./useClock.ts";

const unitsPerCase = 6;

export function depotObservations(reports: readonly Report[]) {
  return reports
    .filter(
      (report) =>
        report.tool === "get_storage_inventory" &&
        (report.rows.length > 0 || /^(?:Storage is empty\.|Storage at )/.test(report.output)),
    )
    .map((report) => ({
      cases: report.rows.reduce(
        (cases, row) => cases + Math.ceil(Number(row[3]) / unitsPerCase),
        0,
      ),
      time: (report.day - 1) * minutesPerDay + report.minute,
    }));
}

const beam = ["#d6a570", "#b87d50", "#8e6249"] as const;

const hall = { depth: 145, width: 222 };
const floorTiles = { across: 4, along: 6, lift: 0.1, size: 42 };
/** The roller shutter in the left wall, drawn from its top corner. */
const shutter = { slatPitch: 5.4, slats: 12, top: 69, windowPitch: 23, windowStart: 12, y: 124 };
const pillars = { back: 28, front: 130, signStandoff: 5.1 };
const laneArrow = {
  count: 2,
  lift: 0.2,
  outline: [
    { x: 34, y: 80 },
    { x: 45, y: 71 },
    { x: 49, y: 71 },
    { x: 40, y: 80 },
    { x: 49, y: 89 },
    { x: 45, y: 89 },
  ],
  pitch: 82,
};
const rack = {
  bayPitch: 54,
  bays: 3,
  braceTop: 63,
  cartonInset: 3,
  cartonLift: 7,
  cartonPitch: 22,
  cartonsPerShelf: 2,
  firstX: 46,
  levelPitch: 21,
  uprightSpan: 48,
};
const pallet = { boardPitch: 10, slatPitch: 7.5, slats: 7, x: 128, y: 84 };
const palletJack = {
  forkPitch: 10,
  forkY: 90,
  handle: {
    base: { x: 77, y: 96, z: 6 },
    gripLeft: { x: 69, y: 91, z: 28 },
    gripRight: { x: 69, y: 101, z: 28 },
    top: { x: 69, y: 96, z: 28 },
  },
};

function vertex({ x, y, z }: { x: number; y: number; z: number }): Vertex {
  return [x, y, z];
}

export const Depot = memo(function Depot({ cases }: { cases: Optional<number> }) {
  const [doorX, doorY] = project([0, shutter.y, shutter.top]);
  const { handle } = palletJack;
  return (
    <g>
      <Box x={0} y={0} z={-4} w={222} d={145} h={4} c={["#c8ccbd", "#a1a998", "#869386"]} />
      {repeat(floorTiles.along, (i) => (
        <Line
          a={vertex({ x: i * floorTiles.size, y: 0, z: floorTiles.lift })}
          b={vertex({ x: i * floorTiles.size, y: hall.depth, z: floorTiles.lift })}
          color="#a6afa1"
          width=".8"
        />
      ))}
      {repeat(floorTiles.across, (i) => (
        <Line
          a={vertex({ x: 0, y: i * floorTiles.size, z: floorTiles.lift })}
          b={vertex({ x: hall.width, y: i * floorTiles.size, z: floorTiles.lift })}
          color="#a6afa1"
          width=".8"
        />
      ))}
      <Box x={-3} y={0} w={3} d={145} h={84} c={["#d2d6ca", "#9ca99f", "#bac2b5"]} />
      <Box x={0} y={-3} w={222} d={3} h={84} c={["#d9dfd2", "#c7cdc1", "#a1afa4"]} />
      <Front x={0} y={0.1} z={0} w={222} h={17} fill="#93a397" />
      <g transform={`matrix(1 -.5 0 1 ${doorX} ${doorY})`}>
        <rect x="-4" y="-4" width="94" height="73" fill="#687e75" />
        <rect width="86" height="66" fill="#a7b3a9" />
        {repeat(shutter.slats, (i) => (
          <path d={`M0 ${4 + i * shutter.slatPitch} h86`} stroke="#7a8c80" strokeWidth="1.5" />
        ))}
        {repeat(3, (i) => (
          <rect
            x={shutter.windowStart + i * shutter.windowPitch}
            y="23"
            width="15"
            height="7"
            rx="2"
            fill="#5f766e"
            stroke="#c2cbbf"
          />
        ))}
        <rect x="-4" y="65" width="94" height="4" fill="#51685d" />
      </g>
      {[pillars.back, pillars.front].map((y) => (
        <g key={y}>
          <Box x={5} y={y} w={5} d={5} h={20} c={beam} />
          <Front x={5} y={y + pillars.signStandoff} z={12} w={5} h={3} fill="#526254" />
        </g>
      ))}
      <Floor x={15} y={48} w={186} d={2} fill="#ded298" />
      <Floor x={15} y={115} w={186} d={2} fill="#ded298" />
      {repeat(laneArrow.count, (i) => (
        <Polygon
          v={laneArrow.outline.map(({ x, y }) =>
            vertex({ x: x + i * laneArrow.pitch, y, z: laneArrow.lift }),
          )}
          fill="#ded298"
        />
      ))}
      {repeat(rack.bays, (bay) => {
        const x = rack.firstX + bay * rack.bayPitch;
        return (
          <g>
            {repeat(2, (i) => (
              <Box x={x + i * rack.uprightSpan} y={3} w={2} d={2} h={65} c={steel} />
            ))}
            <Line
              a={[x + 1, 5, 4]}
              b={[x + rack.uprightSpan, 5, rack.braceTop]}
              color="#708379"
              width="1.6"
            />
            <Line
              a={[x + rack.uprightSpan, 5, 4]}
              b={[x + 1, 5, rack.braceTop]}
              color="#708379"
              width="1.6"
            />
            {repeat(3, (level) => (
              <g>
                <Box x={x} y={4} z={4 + level * rack.levelPitch} w={50} d={18} h={3} c={beam} />
                {repeat(
                  rack.cartonsPerShelf,
                  (slot) =>
                    hasValue(cases) &&
                    level * rack.bays * rack.cartonsPerShelf + bay * rack.cartonsPerShelf + slot <
                      cases && (
                      <Carton
                        x={x + rack.cartonInset + slot * rack.cartonPitch}
                        y={6}
                        z={rack.cartonLift + level * rack.levelPitch}
                        w={20}
                        d={14}
                        h={15}
                      />
                    ),
                )}
              </g>
            ))}
            {!hasValue(cases) && <Front x={x + 1} y={22} z={6} w={48} h={56} fill="#84988c" />}
            {repeat(2, (i) => (
              <Box x={x + i * rack.uprightSpan} y={21} w={2} d={2} h={65} c={steel} />
            ))}
          </g>
        );
      })}
      {repeat(3, (i) => (
        <Box x={128} y={pallet.y + i * pallet.boardPitch} w={52} d={4} h={3} c={wood} />
      ))}
      {repeat(pallet.slats, (i) => (
        <Box x={pallet.x + i * pallet.slatPitch} y={84} z={3} w={6.2} d={25} h={2} c={wood} />
      ))}
      {repeat(2, (i) => (
        <Box
          x={81}
          y={palletJack.forkY + i * palletJack.forkPitch}
          z={2}
          w={33}
          d={3.5}
          h={2}
          c={beam}
        />
      ))}
      <Box x={76} y={89} z={2} w={9} d={16} h={8} c={beam} />
      <Line a={vertex(handle.base)} b={vertex(handle.top)} color="#566a60" width="3" />
      <Line a={vertex(handle.gripLeft)} b={vertex(handle.gripRight)} color="#566a60" width="3.5" />
    </g>
  );
});
