import { memo } from "react";

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
  type Material,
} from "./geometry.tsx";
import { Plant } from "./Plant.tsx";
import { StreetTree } from "./Street.tsx";

const width = 322;
const depth = 90;
const height = 104;
/** A walkway runs along the concourse, this far behind its front edge. */
const walkway = { fromFront: 36, width: 23 };
const aisle = depth - walkway.fromFront;
const entry = 28;
/** The vending cabinets stand in the right-hand corner of this width. */
const vendingCorner = 88;
const machineX = width - vendingCorner;
const [left, top] = project([0, depth, height]);
const [right, bottom] = project([width, 0, 0]);
/** Space around the drawn concourse in the small preview and in the full view. */
const previewMargin = { bottom: 10, side: 8, top: 6 };
const viewMargin = { bottom: 37, left: 55, right: 53, top: 12 };

export const concourse = {
  aisle,
  depth,
  entry,
  machineX,
  previewBox: `${left - previewMargin.side} ${top - depth / 2 - previewMargin.top} ${right - left + 2 * previewMargin.side} ${bottom + depth - top + (previewMargin.top + previewMargin.bottom)}`,
  viewBox: `${left - viewMargin.left} ${top - depth / 2 - viewMargin.top} ${right - left + (viewMargin.left + viewMargin.right)} ${bottom + depth / 2 - top + depth / 2 + (viewMargin.top + viewMargin.bottom)}`,
  width,
};

/** Lines on a floor sit just above it, so that they draw over it. */
const floorMarkLift = { edge: 0.2, seam: 0.3 };
const floorTiles = { count: 15, pitch: 23 };
/** The glass side wall stands on a low plinth, with two transoms below the roof. */
const sideGlazing = { highTransom: 77, lowTransom: 42, plinth: 15 };
/** Above the solid back wall, glass bays run up to the roof, with one clerestory transom. */
const backWall = { clerestoryTransom: 83, glassBays: 7, height: 58 };
const bay = width / backWall.glassBays;
/** A slanted streak of reflected light on each back wall pane, from its foot to its head. */
const glare = { foot: 63, footLeft: 2, footRight: 8, head: 99, headLeft: 29, headRight: 35 };
/** The direction sign hangs on the back wall this far from the right end. */
const sign = { fromRight: 98, lift: 0.25, z: 67 };
/** Framed posters on the back wall, each with a mountain print and a caption line. */
const posters = {
  frameX: 30,
  paperX: 31,
  peakFoot: 26,
  peakLeft: 33,
  peakRight: 47,
  peakTop: 45,
  peakX: 43,
  pitch: 24,
  printLift: 0.5,
};
const oxblood: Material = ["#965e56", "#804a43", "#603a38"];
const seatLeather: Material = ["#cb9080", "#ac7163", "#8c584e"];
/** A banquette: its back on the side away from the table and two seat cushions. */
const banquette = { backInset: 21, cushionInset: 7, cushionPitch: 21, cushionY: 7 };
/** The booth table and the pendant lamp above it, hung from an arm on the back wall. */
const booth = { armHeight: 71, centreX: 111, lampHeight: 59, lampY: 26, tableTop: 24, tableY: 28 };
/** The rail opening at the entry reaches this far each side of the entry. */
const entryHalfWidth = 15;
/** A street tree in a square pit with a grating, in front of the entry. */
const treePit = { barEnd: 18, barStart: 7, bars: 6, firstBar: 32, front: 6, treeX: 38, treeY: 12 };
/** A planter by the right end of the forecourt. */
const planter = { firstPlant: 68, fromRight: 72, front: 4, plantFront: 7 };
/** The pavement around the concourse and the paving joints in front of it. */
const pavement = { back: 26, front: 22, jointLift: -2.6, jointPitch: 23, joints: 17, side: 27 };
const firstJoint = -25;
/** Street trees behind the concourse: near the entry, near the middle and near the right end. */
const streetTrees = { fromEntry: 18, fromRight: 26, middle: 0.53 };
const puddle = { fromRight: 80, front: 8 };

export const AtriumShell = memo(function AtriumShell() {
  return (
    <g>
      <Box x={0} y={0} z={-4} w={width} d={depth} h={4} c={["#d7d4bf", "#a7ad9a", "#879383"]} />
      <Floor x={0} y={aisle} w={width} d={23} fill="#adb5a6" />
      {[aisle, aisle + walkway.width].map((y) => (
        <Line
          key={y}
          a={[0, y, floorMarkLift.edge]}
          b={[width, y, floorMarkLift.edge]}
          color="#f1e5c9"
          width="2"
        />
      ))}
      {repeat(floorTiles.count, (i) => (
        <Line
          a={[i * floorTiles.pitch, 0, floorMarkLift.seam]}
          b={[i * floorTiles.pitch, depth, floorMarkLift.seam]}
          color="#abb09e"
          width=".6"
        />
      ))}
      <Box x={-3} y={0} w={3} d={depth} h={15} c={steel} />
      <Polygon
        v={[
          [0, 0, sideGlazing.plinth],
          [0, depth, sideGlazing.plinth],
          [0, depth, height],
          [0, 0, height],
        ]}
        fill="#b7ceca"
        opacity=".6"
      />
      {repeat(4, (i) => (
        <Box x={-3} y={(i * (depth - 2)) / 3} w={3} d={2} h={height} c={steel} />
      ))}
      {[sideGlazing.lowTransom, sideGlazing.highTransom, height].map((z) => (
        <Box key={z} x={-3} y={0} z={z} w={3} d={depth} h={2} c={steel} />
      ))}
      <Box x={0} y={-3} w={width} d={3} h={58} c={["#eee6ce", "#ded8c1", "#a7ad9e"]} />
      {repeat(backWall.glassBays, (i) => (
        <g>
          <Front x={i * bay} y={0} z={58} w={bay} h={height - backWall.height} fill="#aec5c2" />
          <Polygon
            v={[
              [i * bay + glare.footLeft, 0, glare.foot],
              [i * bay + glare.footRight, 0, glare.foot],
              [i * bay + glare.headRight, 0, glare.head],
              [i * bay + glare.headLeft, 0, glare.head],
            ]}
            fill="#cbdad3"
          />
          <Box x={i * bay} y={-3} z={58} w={2.5} d={4} h={height - backWall.height} c={steel} />
        </g>
      ))}
      {[backWall.height, backWall.clerestoryTransom, height].map((z) => (
        <Box key={z} x={0} y={-3} z={z} w={width} d={4} h={2} c={steel} />
      ))}
    </g>
  );
});

export const AtriumFurniture = memo(function AtriumFurniture() {
  const [signX, signY] = project([width - sign.fromRight, sign.lift, sign.z]);
  return (
    <g>
      <g transform={`matrix(1 .5 0 1 ${signX} ${signY})`}>
        <rect
          y="-9"
          width="83"
          height="11"
          rx="1"
          fill="#344c40"
          stroke="#899584"
          strokeWidth=".8"
        />
        <text x="4" y="-1" fill="#f0e7ce" fontFamily="monospace" fontSize="7" letterSpacing="1.3">
          ATRIUM
        </text>
        <path d="M62 -4 h14 m-4 -3 4 3 -4 3" stroke="#d6c6a1" fill="none" />
      </g>
      {repeat(3, (i) => {
        const offset = i * posters.pitch;
        return (
          <g>
            <Front x={posters.frameX + offset} y={0.3} z={21} w={20} h={28} fill="#a59777" />
            <Front x={posters.paperX + offset} y={0.4} z={22} w={18} h={26} fill="#efe6d0" />
            <Polygon
              v={[
                [posters.peakLeft + offset, posters.printLift, posters.peakFoot],
                [posters.peakX + offset, posters.printLift, posters.peakTop],
                [posters.peakRight + offset, posters.printLift, posters.peakFoot],
              ]}
              fill={i === 1 ? "#a56f54" : "#7d9584"}
            />
            <Front x={posters.peakLeft + offset} y={0.6} z={24} w={11} h={1} fill="#8e927d" />
          </g>
        );
      })}
      <DiningBooth />
      <Plant x={17} y={25} size={1.2} />
      <Box x={192} y={8} w={24} d={10} h={12} c={wood} />
      <Plant x={198} y={12} size={0.85} />
      <Plant x={211} y={13} size={0.77} />
    </g>
  );
});

function Banquette({ x, facesRight }: { x: number; facesRight: boolean }) {
  const back = facesRight ? x : x + banquette.backInset;
  return (
    <g>
      <Box x={x + 2} y={8} w={24} d={40} h={8} c={steel} />
      <Box x={x} y={6} z={8} w={28} d={44} h={7} c={oxblood} />
      {facesRight && <Box x={back} y={6} z={14} w={7} d={44} h={23} c={oxblood} />}
      {[0, 1].map((seat) => (
        <Box
          key={seat}
          x={facesRight ? x + banquette.cushionInset : x}
          y={banquette.cushionY + seat * banquette.cushionPitch}
          z={15}
          w={21}
          d={20}
          h={4}
          c={seatLeather}
        />
      ))}
      {!facesRight && <Box x={back} y={6} z={14} w={7} d={44} h={23} c={oxblood} />}
      <Box x={back} y={6} z={37} w={7} d={44} h={2} c={seatLeather} />
    </g>
  );
}

function DiningBooth() {
  const [cx, cy] = project([booth.centreX, booth.tableY, booth.tableTop]);
  const [lx, ly] = project([booth.centreX, booth.lampY, booth.lampHeight]);
  return (
    <g>
      <Floor x={48} y={3} w={127} d={49} fill="#9aa59a" />
      <Banquette x={55} facesRight />
      <Box x={100} y={21} w={23} d={16} h={3} c={steel} />
      <Box x={106} y={24} z={3} w={10} d={9} h={19} c={steel} />
      <g transform={`matrix(1 .5 -1 .5 ${cx} ${cy})`}>
        <ellipse rx={38} ry={22} cy={3} fill="#97785c" />
        <ellipse rx={38} ry={22} fill="#ecddba" stroke="#c4b08c" strokeWidth="1" />
      </g>
      <Banquette x={140} facesRight={false} />
      <Line
        a={[booth.centreX, 0, booth.armHeight]}
        b={[booth.centreX, booth.lampY, booth.armHeight]}
        color="#525e54"
        width="2.4"
      />
      <Line
        a={[booth.centreX, booth.lampY, booth.armHeight]}
        b={[booth.centreX, booth.lampY, booth.lampHeight]}
        color="#3b4c44"
        width="1.5"
      />
      <g transform={`translate(${lx} ${ly})`}>
        <path
          d="M-16 7 Q-13 -6 0 -7 Q13 -6 16 7 Q0 15 -16 7 Z"
          fill="#47695e"
          stroke="#374f46"
          strokeWidth="1.3"
        />
        <ellipse cy="7" rx="15" ry="4" fill="#f0d9a2" />
      </g>
    </g>
  );
}

const railing: Material = ["#e9e2ce", "#c3c4b2", "#a1ac9d"];

export const AtriumRail = memo(function AtriumRail() {
  return (
    <g>
      <Box x={0} y={depth - 2} w={entry - entryHalfWidth} d={2} h={8} c={railing} />
      <Box
        x={entry + entryHalfWidth}
        y={depth - 2}
        w={width - entry - entryHalfWidth}
        d={2}
        h={8}
        c={railing}
      />
      <Box x={width - 2} y={0} w={2} d={depth} h={8} c={railing} />
    </g>
  );
});

export function AtriumForecourt({ phase, light }: { phase: number; light: number }) {
  return (
    <g>
      <Floor x={31} y={depth + treePit.front} w={14} d={14} fill="#a6ae9f" />
      {repeat(treePit.bars, (i) => (
        <Line
          a={[treePit.firstBar + i * 2, depth + treePit.barStart, floorMarkLift.edge]}
          b={[treePit.firstBar + i * 2, depth + treePit.barEnd, floorMarkLift.edge]}
          color="#7c897b"
          width=".6"
        />
      ))}
      <StreetTree x={treePit.treeX} y={depth + treePit.treeY} phase={phase} light={light} />
      <Box x={width - planter.fromRight} y={depth + planter.front} w={30} d={7} h={6} c={wood} />
      {repeat(3, (i) => (
        <Plant x={width - planter.firstPlant + i * 10} y={depth + planter.plantFront} size={0.47} />
      ))}
    </g>
  );
}

export function AtriumOutside({
  phase,
  light,
  weather,
}: {
  phase: number;
  light: number;
  weather?: string;
}) {
  return (
    <g>
      <Box
        x={-27}
        y={-26}
        z={-6}
        w={width + 2 * pavement.side}
        d={depth + (pavement.back + pavement.front)}
        h={3}
        c={["#d2d7cb", "#a3ac9d", "#87978a"]}
      />
      <Floor x={-27} y={-26} w={width + 2 * pavement.side} d={10} z={-2.8} fill="#8d9c94" />
      {repeat(pavement.joints, (i) => (
        <Line
          a={[firstJoint + i * pavement.jointPitch, depth, pavement.jointLift]}
          b={[firstJoint + i * pavement.jointPitch, depth + pavement.front, pavement.jointLift]}
          color="#b2bbad"
        />
      ))}
      {[
        entry - streetTrees.fromEntry,
        width * streetTrees.middle,
        width - streetTrees.fromRight,
      ].map((x) => (
        <StreetTree key={x} x={x} y={-13} phase={phase} light={light} />
      ))}
      {weather === "rainy" && (
        <Floor
          x={width - puddle.fromRight}
          y={depth + puddle.front}
          w={31}
          d={3}
          z={-2.5}
          fill="#acbfbd"
        />
      )}
    </g>
  );
}
