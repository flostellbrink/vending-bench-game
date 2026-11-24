import type { SlotObservation } from "games-common/benchmark";

import { assertValue, type Optional } from "games-common/language";
import { memo } from "react";

import type { CabinetLayout } from "./cabinet-layout";

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
} from "./geometry";

export type CabinetStock = Record<string, SlotObservation>;

const wrappers = ["#73a6a2", "#d4a95d", "#bd775c", "#95a7b4", "#bd8ca4", "#95a86f"];

function wrapperColor(item: string) {
  let hash = 0;
  for (const letter of item) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
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
  const y = 11,
    w = 32,
    d = 21,
    h = 66,
    Y = y + d;
  const ang = open * Math.PI * 0.46;
  const rowHeight = 34.4 / Math.max(1, layout.rows.length);
  const columnWidth = 18.3 / Math.max(1, layout.columns);
  const sx = Math.min(1, columnWidth / 6.1);
  const sy = Math.min(1, rowHeight / 8.6);
  const [sideX, sideY] = project([x + w + 0.1, Y - 1, 53]);
  const illuminated = selected || progress != null;
  const doorPoint = ([u, v]: Point): Vertex => [
    x + 1 + u * Math.cos(ang),
    Y + 0.5 + u * Math.sin(ang),
    v,
  ];
  const panel = (u: number, v: number, width: number, height: number, color: string) => (
    <Polygon
      v={(
        [
          [u, v],
          [u + width, v],
          [u + width, v + height],
          [u, v + height],
        ] as const
      ).map(doorPoint)}
      fill={color}
    />
  );
  return (
    <g>
      <Floor x={x - 1} y={y + 1} w={w + 4} d={d + 4} fill="#8f9684" />
      <Box x={x + 1} y={y + 1} w={w - 2} d={d - 2} h={3} c={pine} />
      <Box {...{ x, y, w, d, h: h - 3 }} z={3} c={pine} edge />
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
      <Front x={x + 1} y={Y} z={4} w={w - 2} h={h - 6} fill={illuminated ? "#536858" : "#263c37"} />
      {layout.rows.map((row, r) => (
        <g key={row.name}>
          {row.cells.map(({ slot, column }) => {
            const item = stock?.[slot];
            const z = 20 + r * rowHeight;
            const left = x + 5 + column * columnWidth + (columnWidth - 6.1 * sx) / 2;
            const [cx, cy] = project([left, Y + 0.2, z]);
            return (
              <g key={slot} transform={`matrix(${sx} ${sx * 0.5} 0 ${sy} ${cx} ${cy})`}>
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
          <Front x={x + 3} y={Y + 0.3} z={20 + r * rowHeight - sy} w={21} h={sy} fill="#829288" />
        </g>
      ))}
      {panel(0, 4, 30, 13, "#304d42")}
      {panel(0, 16, 2.8, 41, "#304d42")}
      {panel(23, 16, 7, 41, "#304d42")}
      {panel(0, 55, 30, 10, "#304d42")}
      {panel(1, 56.5, 28, 7.5, illuminated ? "#fbdda4" : drink ? "#96b2ab" : "#c7a680")}
      {(() => {
        const p = project(doorPoint([2, 58])),
          q = project(doorPoint([3, 58]));
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
        v={(
          [
            [2.8, 17],
            [23, 17],
            [23, 55],
            [2.8, 55],
          ] as const
        ).map(doorPoint)}
        fill="#96bab5"
        opacity=".14"
      />
      <Polygon
        v={(
          [
            [3, 44],
            [10, 55],
            [15, 55],
            [3, 35],
          ] as const
        ).map(doorPoint)}
        fill="#e2f3db"
        opacity=".12"
      />
      {panel(24, 40, 4.4, 7, "#182c29")}
      {panel(24.6, 44, 3, 2, "#a3d5ab")}
      {panel(24, 35, 3.7, 1.3, "#b6c0b5")}
      {panel(5, 8, 17, 5, "#142a25")}
      {repeat(9, (i) =>
        panel(24 + (i % 3) * 1.4, 37 - Math.floor(i / 3) * 1.4, 0.9, 0.8, "#9cae9e"),
      )}
      {repeat(3, (i) => panel(3, 4.8 + i * 0.8, 20, 0.28, "#80968a"))}
      {open > 0 && panel(25, 58, 2, 2, "#ffcb74")}
      {illuminated && panel(2.8, 17, 1.5, 38, "#ffe8ad")}
    </g>
  );
}

export const Machine = memo(Cabinet);
