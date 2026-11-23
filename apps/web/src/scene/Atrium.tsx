import { memo } from "react";

import { Table } from "./Furniture";
import { Box, Floor, Front, Line, Polygon, project, repeat, steel, wood } from "./geometry";
import { Plant } from "./Plant";
import { StreetTree } from "./Street";

const width = 322;
const depth = 90;
const height = 104;
const aisle = depth - 36;
const entry = 28;
const machineX = width - 88;
const bay = width / 7;
const [left, top] = project([0, depth, height]);
const [right, bottom] = project([width, 0, 0]);

export const concourse = {
  width,
  depth,
  aisle,
  entry,
  machineX,
  viewBox: `${left - 55} ${top - depth / 2 - 12} ${right - left + 108} ${bottom + depth / 2 - top + depth / 2 + 49}`,
  previewBox: `${left - 8} ${top - depth / 2 - 6} ${right - left + 16} ${bottom + depth - top + 16}`,
};

export const AtriumShell = memo(function AtriumShell() {
  return (
    <g>
      <Box x={0} y={0} z={-4} w={width} d={depth} h={4} c={["#d7d4bf", "#a7ad9a", "#879383"]} />
      <Floor x={0} y={aisle} w={width} d={23} fill="#adb5a6" />
      {[aisle, aisle + 23].map((y) => (
        <Line key={y} a={[0, y, 0.2]} b={[width, y, 0.2]} color="#f1e5c9" width="2" />
      ))}
      {repeat(15, (i) => (
        <Line a={[i * 23, 0, 0.3]} b={[i * 23, depth, 0.3]} color="#abb09e" width=".6" />
      ))}
      <Box x={-3} y={0} w={3} d={depth} h={15} c={steel} />
      <Polygon
        v={[
          [0, 0, 15],
          [0, depth, 15],
          [0, depth, height],
          [0, 0, height],
        ]}
        fill="#b7ceca"
        opacity=".6"
      />
      {repeat(4, (i) => (
        <Box x={-3} y={(i * (depth - 2)) / 3} w={3} d={2} h={height} c={steel} />
      ))}
      {[42, 77, height].map((z) => (
        <Box key={z} x={-3} y={0} z={z} w={3} d={depth} h={2} c={steel} />
      ))}
      <Box x={0} y={-3} w={width} d={3} h={58} c={["#eee6ce", "#ded8c1", "#a7ad9e"]} />
      {repeat(7, (i) => (
        <g>
          <Front x={i * bay} y={0} z={58} w={bay} h={height - 58} fill="#aec5c2" />
          <Polygon
            v={[
              [i * bay + 2, 0, 63],
              [i * bay + 8, 0, 63],
              [i * bay + 35, 0, 99],
              [i * bay + 29, 0, 99],
            ]}
            fill="#cbdad3"
          />
          <Box x={i * bay} y={-3} z={58} w={2.5} d={4} h={height - 58} c={steel} />
        </g>
      ))}
      {[58, 83, height].map((z) => (
        <Box key={z} x={0} y={-3} z={z} w={width} d={4} h={2} c={steel} />
      ))}
    </g>
  );
});

export const AtriumFurniture = memo(function AtriumFurniture() {
  const [signX, signY] = project([width - 98, 0.25, 67]);
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
      {repeat(3, (i) => (
        <g>
          <Front x={30 + i * 24} y={0.3} z={21} w={20} h={28} fill="#a59777" />
          <Front x={31 + i * 24} y={0.4} z={22} w={18} h={26} fill="#efe6d0" />
          <Polygon
            v={[
              [33 + i * 24, 0.5, 26],
              [43 + i * 24, 0.5, 45],
              [47 + i * 24, 0.5, 26],
            ]}
            fill={i === 1 ? "#a56f54" : "#7d9584"}
          />
          <Front x={33 + i * 24} y={0.6} z={24} w={11} h={1} fill="#8e927d" />
        </g>
      ))}
      {repeat(2, (i) => (
        <g>
          <Table x={bay + 90 * i} y={14} w={61} d={18} h={24} />
          {[6, 46].map((offset) => (
            <Box key={offset} x={bay + 90 * i + offset} y={36} w={3} d={8} h={10} c={steel} />
          ))}
          <Box x={bay + 90 * i + 4} y={35} z={10} w={53} d={9} h={2.8} c={wood} />
          {repeat(3, (seat) => (
            <Box
              x={bay + 90 * i + 5 + seat * 17}
              y={35.3}
              z={12.8}
              w={15.8}
              d={8.5}
              h={1.8}
              c={["#bc896c", "#a16d53", "#895c49"]}
            />
          ))}
        </g>
      ))}
      <Plant x={17} y={25} size={1.2} />
      <Box x={192} y={8} w={24} d={10} h={12} c={wood} />
      <Plant x={198} y={12} size={0.85} />
      <Plant x={211} y={13} size={0.77} />
    </g>
  );
});

export const AtriumRail = memo(function AtriumRail() {
  const c = ["#e9e2ce", "#c3c4b2", "#a1ac9d"] as const;
  return (
    <g>
      <Box x={0} y={depth - 2} w={entry - 15} d={2} h={8} c={c} />
      <Box x={entry + 15} y={depth - 2} w={width - entry - 15} d={2} h={8} c={c} />
      <Box x={width - 2} y={0} w={2} d={depth} h={8} c={c} />
    </g>
  );
});

export function AtriumForecourt({ phase, light }: { phase: number; light: number }) {
  return (
    <g>
      <Floor x={31} y={depth + 6} w={14} d={14} fill="#a6ae9f" />
      {repeat(6, (i) => (
        <Line
          a={[32 + i * 2, depth + 7, 0.2]}
          b={[32 + i * 2, depth + 18, 0.2]}
          color="#7c897b"
          width=".6"
        />
      ))}
      <StreetTree x={38} y={depth + 12} phase={phase} light={light} />
      <Box x={width - 72} y={depth + 4} w={30} d={7} h={6} c={wood} />
      {repeat(3, (i) => (
        <Plant x={width - 68 + i * 10} y={depth + 7} size={0.47} />
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
        w={width + 54}
        d={depth + 48}
        h={3}
        c={["#d2d7cb", "#a3ac9d", "#87978a"]}
      />
      <Floor x={-27} y={-26} w={width + 54} d={10} z={-2.8} fill="#8d9c94" />
      {repeat(17, (i) => (
        <Line
          a={[-25 + i * 23, depth, -2.6]}
          b={[-25 + i * 23, depth + 22, -2.6]}
          color="#b2bbad"
        />
      ))}
      {[entry - 18, width * 0.53, width - 26].map((x) => (
        <StreetTree key={x} x={x} y={-13} phase={phase} light={light} />
      ))}
      {weather === "rainy" && (
        <Floor x={width - 80} y={depth + 8} w={31} d={3} z={-2.5} fill="#acbfbd" />
      )}
    </g>
  );
}
