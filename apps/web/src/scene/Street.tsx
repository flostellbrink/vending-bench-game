import { memo } from "react";

import {
  Box,
  Floor,
  Front,
  Line,
  Polygon,
  repeat,
  project,
  steel,
  type Position,
} from "./geometry";

export function StreetTree({ x, y, phase, light }: Position & { phase: number; light: number }) {
  const [cx, cy] = project([x, y, 0]);
  const branches =
    "M0 0 Q2 -16 -1 -32 T1 -47 M0 -18 L-10 -28 L-16 -43 M-10 -28 L-22 -33 M-15 -38 L-23 -46 M0 -25 L8 -37 L12 -51 M8 -37 L20 -44 M12 -43 L23 -49 M0 -33 L-6 -47 L-5 -57 M-6 -47 L-13 -54 M1 -44 L5 -53";
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <g
        transform={`matrix(.7 .32 ${-0.2 - Math.cos(phase * Math.PI) * 0.8} -.24 1 0)`}
        opacity={light * 0.4}
      >
        <path d={branches} fill="none" stroke="#67726c" strokeWidth="2.5" />
      </g>
      <path d="M-2 0 Q1 -16 -2 -26 L-1 -38 L2 -28 L1 0Z" fill="#716f5f" />
      <path d={branches} fill="none" stroke="#706d5f" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M-14 -40 L-16 -43 M13 -40 L20 -44 M-7 -47 L-13 -54" stroke="#dadfd1" fill="none" />
    </g>
  );
}
function Bicycle({ x, y }: Position) {
  const [cx, cy] = project([x, y, 0]);
  return (
    <g transform={`matrix(.85 .42 0 1 ${cx} ${cy})`}>
      {[0, 18].map((k) => (
        <g key={k}>
          <circle cx={k} cy="-5" r="5.5" fill="none" stroke="#43554e" strokeWidth="1.6" />
          <path d={`M${k - 5} -5 h10 M${k} -10 v10`} stroke="#93a095" strokeWidth=".6" />
        </g>
      ))}
      <path
        d="M0 -5 L5 -13 L10 -5 Z M5 -13 L14 -14 L10 -5 M14 -16 L18 -5 M12 -17 h5 M7 -12 l-2 -4 M2 -16 h6"
        fill="none"
        stroke="#526b63"
        strokeWidth="1.5"
      />
    </g>
  );
}
const Pavement = memo(function Pavement({ weather }: { weather?: string }) {
  return (
    <g>
      <Box x={-43} y={-45} z={-5} w={285} d={223} h={3} c={["#d8dbd0", "#a4ac9e", "#929f93"]} />
      <Floor x={-43} y={-45} w={265} d={13} z={-1.8} fill="#86958d" />
      {weather === "rainy" && (
        <g>
          <Polygon
            v={[
              [98, 150, -1.6],
              [105, 149, -1.6],
              [122, 151, -1.6],
              [125, 154, -1.6],
              [111, 156, -1.6],
              [97, 154, -1.6],
            ]}
            fill="#a9bdbb"
          />
          <Line a={[102, 152, -1.5]} b={[116, 152, -1.5]} color="#e1e7dd" width=".7" />
          <Polygon
            v={[
              [225, 24, -1.6],
              [233, 31, -1.6],
              [231, 47, -1.6],
              [226, 49, -1.6],
              [223, 41, -1.6],
            ]}
            fill="#afc2bf"
          />
        </g>
      )}
      {repeat(15, (i) => (
        <Line
          a={[-39 + i * 20, 145, -1.7]}
          b={[-39 + i * 20, 177, -1.7]}
          color="#b6beb0"
          width=".55"
        />
      ))}
      {repeat(2, (i) => (
        <Line
          a={[-42, 152 + i * 17, -1.7]}
          b={[241, 152 + i * 17, -1.7]}
          color="#b6beb0"
          width=".65"
        />
      ))}
      {repeat(12, (i) => (
        <Line
          a={[222, i * 16 - 14, -1.7]}
          b={[242, i * 16 - 14, -1.7]}
          color="#bcc3b5"
          width=".65"
        />
      ))}
      <Polygon
        v={[
          [11, 153, -1.6],
          [36, 151, -1.6],
          [43, 157, -1.6],
          [67, 157, -1.6],
          [71, 164, -1.6],
          [42, 166, -1.6],
          [18, 163, -1.6],
        ]}
        fill="#eef0e4"
      />
      {repeat(18, (i) => (
        <Line
          a={[-43 + i * 15, -32, -1.7]}
          b={[-43 + i * 15, 0, -1.7]}
          color="#b2bbae"
          width=".65"
        />
      ))}
      {repeat(12, (i) => (
        <Line a={[-43, i * 13 - 8, -1.7]} b={[0, i * 13 - 8, -1.7]} color="#aeb9ad" width=".65" />
      ))}
      <Line a={[-43, -31, -1.5]} b={[222, -31, -1.5]} color="#eef0df" width="2" />
      {repeat(8, (i) => (
        <Line
          a={[-40 + i * 34, -41, -1.7]}
          b={[-25 + i * 34, -41, -1.7]}
          color="#cfd5c8"
          width="1"
        />
      ))}
      <Polygon
        v={[
          [-41, 0, -1.5],
          [-30, 2, -1.5],
          [-25, 25, -1.5],
          [-28, 39, -1.5],
          [-36, 65, -1.5],
          [-41, 70, -1.5],
        ]}
        fill="#e6eada"
      />
    </g>
  );
});

export function Outside({
  phase,
  light,
  depot,
  weather,
}: {
  phase: number;
  light: number;
  depot: boolean;
  weather?: string;
}) {
  return (
    <g>
      <Pavement weather={weather} />
      {(
        [
          [-23, 26],
          [91, -18],
          [201, -17],
        ] as const
      ).map(([x, y]) => (
        <g key={x}>
          <Floor x={x - 7} y={y - 7} w={14} d={14} fill="#a4b09e" />
          {repeat(6, (i) => (
            <Line a={[x - 6 + i * 2, y - 5, 0.3]} b={[x - 6 + i * 2, y + 5, 0.3]} color="#889488" />
          ))}
          <StreetTree {...{ x, y, phase, light }} />
        </g>
      ))}
      <Box x={19} y={-21} w={2} d={2} h={46} c={steel} />
      <Box x={17} y={-21} z={45} w={9} d={4} h={2} c={steel} />
      <Front x={18} y={-17} z={44.7} w={7} h={1.3} fill={light < 0.25 ? "#fff3ba" : "#c5caba"} />
      {!depot && <Bicycle x={145} y={-16} />}
    </g>
  );
}
