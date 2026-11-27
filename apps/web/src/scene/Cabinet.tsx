import type { SlotObservation } from "games-common/benchmark";

import { assertValue, hasValue, type Optional } from "games-common/language";
import { memo } from "react";

import type { CabinetLayout } from "./cabinet-layout.ts";

import {
  Box,
  Floor,
  Front,
  Polygon,
  pine,
  project,
  repeat,
  type Point,
  type Vertex,
} from "./geometry.tsx";

export type CabinetStock = Record<string, SlotObservation>;

const wrappers = ["#73a6a2", "#d4a95d", "#bd775c", "#95a7b4", "#bd8ca4", "#95a86f"];
const wrapperHashFactor = 31;

/** The glass front with its shelves, in cabinet units. */
const shelves = { bottom: 20, height: 34.4, left: 5, width: 18.3 };
const product = { height: 8.6, standoff: 0.2, width: 6.1 };
const shelfRail = { standoff: 0.3 };
/** The isometric shear of a front-facing surface. */
const frontShear = 0.5;
const plinthHeight = 3;
const interiorTrim = 6;
const sidePoster = { gap: 0.1, top: 53 };

interface DoorPart {
  u: number;
  v: number;
  width: number;
  height: number;
}
/** Door parts in door units: u runs from the hinge, v runs up from the floor. */
const door = {
  coinSlot: { height: 1.3, u: 24, v: 35, width: 3.7 },
  controlColumn: { height: 41, u: 23, v: 16, width: 7 },
  display: { height: 7, u: 24, v: 40, width: 4.4 },
  displayReadout: { height: 2, u: 24.6, v: 44, width: 3 },
  doorLamp: { height: 2, u: 25, v: 58, width: 2 },
  hingeStile: { height: 41, u: 0, v: 16, width: 2.8 },
  kickPanel: { height: 13, u: 0, v: 4, width: 30 },
  pickupFlap: { height: 5, u: 5, v: 8, width: 17 },
  sign: { height: 7.5, u: 1, v: 56.5, width: 28 },
  signLabel: { u: 2, v: 58 },
  standoff: 0.5,
  swing: 0.46,
  topRail: { height: 10, u: 0, v: 55, width: 30 },
};
const glass = { bottom: 17, left: 2.8, right: 23, top: 55 };
const glassLight = { width: 1.5 };
const glare = [
  { u: 3, v: 44 },
  { u: 10, v: 55 },
  { u: 15, v: 55 },
  { u: 3, v: 35 },
];
const keypad = { columns: 3, height: 0.8, keys: 9, left: 24, pitch: 1.4, top: 37, width: 0.9 };
const ventSlots = { bottom: 4.8, count: 3, height: 0.28, left: 3, pitch: 0.8, width: 20 };

function wrapperColor(item: string) {
  let hash = 0;
  for (const letter of item) {
    hash = (hash * wrapperHashFactor + letter.charCodeAt(0)) >>> 0;
  }
  return assertValue(wrappers[hash % wrappers.length]);
}

function Cabinet({
  x,
  drink,
  open,
  selected,
  progress,
  stock,
  layout,
}: {
  x: number;
  drink: boolean;
  open: number;
  selected: boolean;
  progress: Optional<number>;
  stock: Optional<CabinetStock>;
  layout: CabinetLayout;
}) {
  const y = 11;
  const w = 32;
  const d = 21;
  const h = 66;
  const Y = y + d;
  const ang = open * Math.PI * door.swing;
  const rowHeight = shelves.height / Math.max(1, layout.rows.length);
  const columnWidth = shelves.width / Math.max(1, layout.columns);
  const sx = Math.min(1, columnWidth / product.width);
  const sy = Math.min(1, rowHeight / product.height);
  const [sideX, sideY] = project([x + w + sidePoster.gap, Y - 1, sidePoster.top]);
  const illuminated = selected || hasValue(progress);
  const unlitSign = drink ? "#96b2ab" : "#c7a680";
  const signColor = illuminated ? "#fbdda4" : unlitSign;
  const doorPoint = ([u, v]: Point): Vertex => [
    x + 1 + u * Math.cos(ang),
    Y + door.standoff + u * Math.sin(ang),
    v,
  ];
  const outline = (corners: { u: number; v: number }[]) =>
    corners.map(({ u, v }) => doorPoint([u, v]));
  const panel = ({ u, v, width, height }: DoorPart, color: string) => (
    <Polygon
      v={outline([
        { u, v },
        { u: u + width, v },
        { u: u + width, v: v + height },
        { u, v: v + height },
      ])}
      fill={color}
    />
  );
  return (
    <g>
      <Floor x={x - 1} y={y + 1} w={w + 4} d={d + 4} fill="#8f9684" />
      <Box x={x + 1} y={y + 1} w={w - 2} d={d - 2} h={plinthHeight} c={pine} />
      <Box d={d} h={h - plinthHeight} w={w} x={x} y={y} z={plinthHeight} c={pine} edge />
      <g transform={`matrix(1 -.5 0 1 ${sideX} ${sideY})`}>
        <rect width="18" height="37" fill={drink ? "#587979" : "#906e54"} />
        <path
          d={
            drink
              ? "M7 5 H11 V10 L13 14 V30 Q9 32 5 30 V14 L7 10 Z"
              : "M3 8 L6 9 L9 8 L12 9 L15 8 L14 18 L15 28 L12 27 L9 28 L6 27 L3 28 L4 18 Z"
          }
          fill="#ded5ad"
        />
        <path
          d={drink ? "M5 18 H13 V23 H5 Z" : "M4 20 L14 14 V18 L4 24 Z"}
          fill={drink ? "#689497" : "#ab7351"}
        />
      </g>
      <Front
        x={x + 1}
        y={Y}
        z={4}
        w={w - 2}
        h={h - interiorTrim}
        fill={illuminated ? "#536858" : "#263c37"}
      />
      {layout.rows.map((row, r) => (
        <g key={row.name}>
          {row.cells.map(({ slot, column }) => {
            const item = stock?.[slot];
            const z = shelves.bottom + r * rowHeight;
            const left =
              x + shelves.left + column * columnWidth + (columnWidth - product.width * sx) / 2;
            const [cx, cy] = project([left, Y + product.standoff, z]);
            return (
              <g key={slot} transform={`matrix(${sx} ${sx * frontShear} 0 ${sy} ${cx} ${cy})`}>
                {drink && (
                  <rect
                    x={-0.7}
                    y={-rowHeight / sy}
                    width=".9"
                    height={rowHeight / sy}
                    fill="#849890"
                  />
                )}
                {item?.qty && item.item ? (
                  <>
                    <rect y="-5.5" width="4.8" height="5.5" fill={wrapperColor(item.item)} />
                    <rect x=".5" y="-3.4" width="3.7" height="1.6" fill="#ece0bf" />
                    {drink && <rect x="1" y="-6.9" width="2.5" height="1.5" fill="#b2bcaf" />}
                  </>
                ) : null}
                {!drink && (
                  <path
                    d="M0 -1 C-1 -6 5 -7 5 -3 C5 0 1 1 1 -2 C1 -4 4 -5 4 -3"
                    stroke="#b8bca5"
                    strokeWidth=".95"
                    fill="none"
                  />
                )}
              </g>
            );
          })}
          <Front
            x={x + 3}
            y={Y + shelfRail.standoff}
            z={shelves.bottom + r * rowHeight - sy}
            w={21}
            h={sy}
            fill="#829288"
          />
        </g>
      ))}
      {panel(door.kickPanel, "#304d42")}
      {panel(door.hingeStile, "#304d42")}
      {panel(door.controlColumn, "#304d42")}
      {panel(door.topRail, "#304d42")}
      {panel(door.sign, signColor)}
      {(() => {
        const p = project(doorPoint([door.signLabel.u, door.signLabel.v]));
        const q = project(doorPoint([door.signLabel.u + 1, door.signLabel.v]));
        return (
          <text
            transform={`matrix(${q[0] - p[0]} ${q[1] - p[1]} 0 1 ${p[0]} ${p[1]})`}
            fontFamily="monospace"
            fontSize="4"
            fontWeight="bold"
            fill="#203e34"
          >
            {drink ? "KOEL / 02" : "VERS / 01"}
          </text>
        );
      })()}
      <Polygon
        v={outline([
          { u: glass.left, v: glass.bottom },
          { u: glass.right, v: glass.bottom },
          { u: glass.right, v: glass.top },
          { u: glass.left, v: glass.top },
        ])}
        fill="#96bab5"
        opacity=".14"
      />
      <Polygon v={outline(glare)} fill="#e2f3db" opacity=".12" />
      {panel(door.display, "#182c29")}
      {panel(door.displayReadout, "#a3d5ab")}
      {panel(door.coinSlot, "#b6c0b5")}
      {panel(door.pickupFlap, "#142a25")}
      {repeat(keypad.keys, (i) =>
        panel(
          {
            height: keypad.height,
            u: keypad.left + (i % keypad.columns) * keypad.pitch,
            v: keypad.top - Math.floor(i / keypad.columns) * keypad.pitch,
            width: keypad.width,
          },
          "#9cae9e",
        ),
      )}
      {repeat(ventSlots.count, (i) =>
        panel(
          {
            height: ventSlots.height,
            u: ventSlots.left,
            v: ventSlots.bottom + i * ventSlots.pitch,
            width: ventSlots.width,
          },
          "#80968a",
        ),
      )}
      {open > 0 && panel(door.doorLamp, "#ffcb74")}
      {illuminated &&
        panel(
          {
            height: glass.top - glass.bottom,
            u: glass.left,
            v: glass.bottom,
            width: glassLight.width,
          },
          "#ffe8ad",
        )}
    </g>
  );
}

export const Machine = memo(Cabinet);
