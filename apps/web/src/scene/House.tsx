import { memo, useId } from "react";

import type { Material } from "./geometry.tsx";

import { DeskTerminal } from "./Furniture.tsx";
import { Box, Floor, Front, Line, Polygon, project, repeat, steel } from "./geometry.tsx";

const brick: Material = ["#c69c84", "#af806a", "#a27562"];
const slate: Material = ["#899f9b", "#617c78", "#506a66"];
const desktop: Material = ["#c7b390", "#a28b70", "#857763"];

const room = { depth: 145, width: 222 };
/** Brick walls end at the eaves; the roof rises in sawtooth bays of north lights above them. */
const wall = { eaves: 87 };
const sawtooth = { bays: 3, pitch: 74, ridge: 109, span: 70 };
/** Patterns and lines sit just in front of the surface they mark, so they draw over it. */
const markLift = { edge: 0.2, overlay: 0.1, seam: 0.3 };
/** A wooden walkway crosses the concrete floor from the doorway in the front wall. */
const walkway = { left: 122, right: 199 };
const floorSeams = { count: 7, pitch: 22 };
/** The window in the side wall: its top front corner and its glazing bars. */
const sideWindow = { front: 132, glazingBars: 6, head: 72, paneWidth: 20 };
/** Cards pinned on the board on the back wall, each with a coloured note below it. */
const pinboard = { cardPitch: 16, cardX: 55, noteX: 56, noteZ: 41 };
/** Two rows of desks, three workstations each, with a chair in front of each one. */
const desks = { firstRow: 23, leftLeg: 16, rightLeg: 104, rowPitch: 58 };
const workstation = { pitch: 33, terminalX: 17 };
const chair = { backY: 42, baseX: 20, baseY: 35, seatX: 18, seatY: 32, stemX: 23, stemY: 37 };

export const HouseShell = memo(function HouseShell() {
  const [windowX, windowY] = project([markLift.overlay, sideWindow.front, sideWindow.head]);
  const [wallX, wallY] = project([0, markLift.overlay, wall.eaves]);
  const mortar = useId();
  return (
    <g>
      <Box x={0} y={0} z={-4} w={222} d={145} h={4} c={["#c5c9ba", "#a5ad9e", "#909a8e"]} />
      <Floor x={123} y={0} w={76} d={145} fill="#d9cfb3" />
      {[walkway.left, walkway.right].map((x) => (
        <Line
          key={x}
          a={[x, 0, markLift.edge]}
          b={[x, room.depth, markLift.edge]}
          color="#a9af99"
          width="1.5"
        />
      ))}
      {repeat(floorSeams.count, (i) => (
        <Line
          a={[0, i * floorSeams.pitch, markLift.seam]}
          b={[room.width, i * floorSeams.pitch, markLift.seam]}
          color="#b3b7a5"
          width=".6"
        />
      ))}
      <Box x={-3} y={0} w={3} d={145} h={87} c={brick} />
      <Box x={0} y={-3} w={222} d={3} h={87} c={brick} />
      <defs>
        <pattern id={mortar} width="17" height="13.4" patternUnits="userSpaceOnUse">
          <path
            d="M0 .4 H17 M0 7.1 H17 M.4 0 V7 M8.5 7 V13.4"
            fill="none"
            stroke="#c19c83"
            strokeWidth=".8"
          />
        </pattern>
      </defs>
      <rect
        transform={`matrix(1 .5 0 1 ${wallX} ${wallY})`}
        width="222"
        height="87"
        fill={`url(#${mortar})`}
      />
      <g transform={`matrix(1 -.5 0 1 ${windowX} ${windowY})`}>
        <rect x="-3" y="-3" width="124" height="55" fill="#546d68" />
        <rect width="118" height="49" fill="#b3c9c2" />
        <path d="M0 37 L31 7 L43 7 L5 46 Z M48 42 L85 5 H96 L58 43Z" fill="#c7d5c6" />
        {repeat(sideWindow.glazingBars, (i) => (
          <rect x={i * sideWindow.paneWidth} width="2" height="49" fill="#627a73" />
        ))}
        <rect y="18" width="118" height="2" fill="#627a73" />
      </g>
      {repeat(sawtooth.bays, (i) => {
        const start = i * sawtooth.pitch;
        const end = start + sawtooth.span;
        return (
          <g>
            <Box x={start} y={-3} w={2.5} d={4.5} h={90} c={slate} />
            <Polygon
              v={[
                [start, 0, wall.eaves],
                [end, 0, wall.eaves],
                [end, 0, sawtooth.ridge],
              ]}
              fill="#bccdc3"
            />
            <Line
              a={[start, 0, wall.eaves]}
              b={[end, 0, sawtooth.ridge]}
              color="#627970"
              width="3"
            />
            <Line a={[end, 0, sawtooth.ridge]} b={[end, 0, wall.eaves]} color="#627970" width="3" />
          </g>
        );
      })}
      <Box x={0} y={-3} z={85} w={222} d={4} h={3} c={slate} />
      <Box x={-3} y={0} z={85} w={3} d={145} h={3} c={slate} />
      <Front x={50} y={1} z={30} w={56} h={33} fill="#71847a" />
      <Front x={52} y={1.2} z={32} w={52} h={29} fill="#dce0ca" />
      {repeat(3, (i) => (
        <g>
          <Front
            x={pinboard.cardX + i * pinboard.cardPitch}
            y={1.4}
            z={51}
            w={9}
            h={4}
            fill="#91a397"
          />
          <Front
            x={pinboard.noteX + i * pinboard.cardPitch}
            y={1.4}
            z={pinboard.noteZ + (i % 2) * 3}
            w={5}
            h={5}
            fill="#c6ad75"
          />
        </g>
      ))}
    </g>
  );
});

export const HouseWorkstations = memo(function HouseWorkstations() {
  return (
    <g>
      {repeat(2, (row) => {
        const y = desks.firstRow + row * desks.rowPitch;
        return (
          <g>
            {[desks.leftLeg, desks.rightLeg].map((x) => (
              <Box key={x} x={x} y={y} w={4} d={28} h={23} c={steel} />
            ))}
            <Box x={12} y={y} z={23} w={102} d={29} h={3} c={desktop} />
            {repeat(3, (i) => {
              const x = i * workstation.pitch;
              return (
                <g>
                  <DeskTerminal x={workstation.terminalX + x} y={y + 2} z={26} />
                  <Box x={chair.baseX + x} y={y + chair.baseY} w={9} d={7} h={3} c={steel} />
                  <Box x={chair.stemX + x} y={y + chair.stemY} w={3} d={3} h={12} c={steel} />
                  <Box
                    x={chair.seatX + x}
                    y={y + chair.seatY}
                    z={12}
                    w={14}
                    d={11}
                    h={3}
                    c={slate}
                  />
                  <Box
                    x={chair.seatX + x}
                    y={y + chair.backY}
                    z={14}
                    w={14}
                    d={2.5}
                    h={10}
                    c={slate}
                  />
                </g>
              );
            })}
          </g>
        );
      })}
      <Box x={0} y={143} w={122} d={2} h={8} c={brick} />
      <Box x={199} y={143} w={23} d={2} h={8} c={brick} />
      <Box x={220} y={0} w={2} d={145} h={8} c={brick} />
    </g>
  );
});
