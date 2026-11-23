import type { SlotObservation } from "games-common/benchmark";

import { assertValue, type Optional } from "games-common/language";
import { memo } from "react";

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

function Cabinet({
  x,
  drink,
  open,
  selected,
  progress,
  stock,
}: {
  x: number;
  drink: boolean;
  open: number;
  selected: boolean;
  progress: Optional<number>;
  stock: Optional<CabinetStock>;
}) {
  const y = 11,
    w = 32,
    d = 21,
    h = 66,
    Y = y + d;
  const ang = open * Math.PI * 0.46;
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
  const packages = drink
    ? ["#6b9391", "#c7a568", "#a66c51", "#8d9fa7"]
    : ["#d29852", "#b3624e", "#8a9d78", "#cbb76e"];
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
      {repeat(4, (r) => (
        <g>
          {repeat(3, (c) => {
            const item = stock?.[String.fromCharCode(68 - r) + (c + 1)];
            const z = 20 + r * 8.6,
              left = x + 5 + c * 6.1;
            if (!item?.qty)
              return <Front x={left} y={Y + 0.1} z={z} w={4.9} h={1.2} fill="#53685c" />;
            return (
              <g>
                <Front
                  x={left}
                  y={Y + 0.1}
                  z={z}
                  w={4.8}
                  h={5.5}
                  fill={assertValue(packages[(r + c) % packages.length])}
                />
                <Front x={left + 0.5} y={Y + 0.2} z={z + 1.8} w={3.7} h={1.6} fill="#ece0bf" />
                {drink && (
                  <Front x={left + 1} y={Y + 0.1} z={z + 5.4} w={2.5} h={1.5} fill="#b2bcaf" />
                )}
              </g>
            );
          })}
          <Front x={x + 3} y={Y + 0.3} z={19 + r * 8.6} w={21} h={1} fill="#829288" />
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
      {progress != null && panel(3.5, 51 - 32 * progress, 19, 2.2, "#f6dba3")}
    </g>
  );
}

export const Machine = memo(Cabinet);
