import { assertValue } from "games-common/language";
import { memo } from "react";

import {
  Box,
  Floor,
  Front,
  Line,
  Polygon,
  pine,
  steel,
  wood,
  repeat,
  project,
  type Material,
  type Position,
} from "./geometry";
import { Plant, BorderPlanting } from "./Plant";

export function Sofa({ x, y, w, orange = false }: Position & { w: number; orange?: boolean }) {
  const fabric: Material = orange
    ? ["#c78b69", "#a86950", "#884f40"]
    : ["#e3dcca", "#d1c8b5", "#aaa996"];
  return (
    <g>
      <Box x={x + 2} y={y + 2} w={w - 4} d={20} h={4} c={wood} />
      <Box x={x} y={y} z={4} w={w} d={24} h={7} c={fabric} />
      <Box x={x + 1} y={y} z={10} w={w - 2} d={5} h={14} c={fabric} />
      {repeat(3, (i) => (
        <Box
          x={x + 3 + (i * (w - 6)) / 3}
          y={y + 6}
          z={11}
          w={(w - 6) / 3 - 0.7}
          d={16}
          h={3}
          c={fabric}
        />
      ))}
      {repeat(3, (i) => (
        <Polygon
          v={[
            [x + 3 + (i * (w - 6)) / 3, y + 6, 14],
            [x + 2 + ((i + 1) * (w - 6)) / 3, y + 6, 14],
            [x + 1 + ((i + 1) * (w - 6)) / 3, y + 4, 23],
            [x + 4 + (i * (w - 6)) / 3, y + 4, 23],
          ]}
          fill={fabric[0]}
          stroke={fabric[1]}
          strokeWidth=".65"
        />
      ))}
      {repeat(2, (i) => (
        <Box x={x + i * (w - 4)} y={y + 1} z={10} w={4} d={23} h={8} c={fabric} />
      ))}
      <Polygon
        v={[
          [x + 8, y + 9, 14],
          [x + 20, y + 9, 14],
          [x + 19, y + 4, 23],
          [x + 9, y + 4, 24],
        ]}
        fill="#647f71"
      />
    </g>
  );
}
function CafeSet({ x, y }: Position) {
  const [cx, cy] = project([x, y, 0]);
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {[-20, 20].map((side) => (
        <g key={side} transform={`translate(${side} ${side < 0 ? -4 : 5})`}>
          <path
            d="M-5 -10 L-7 0 M4 -10 L7 1 M-2 -9 L-1 3"
            fill="none"
            stroke="#6b7567"
            strokeWidth="1.1"
          />
          <ellipse rx="7" ry="3.4" cy="-10" fill="#b89d74" />
          <path
            d={
              side < 0
                ? "M-6 -11 Q-11 -17 -7 -22 Q-4 -23 -2 -21 L-2 -12Z"
                : "M3 -9 L6 -18 Q10 -24 12 -19 Q12 -11 8 -8Z"
            }
            fill="#a97655"
            stroke="#866448"
            strokeWidth=".65"
          />
        </g>
      ))}
      <ellipse rx="9" ry="4" fill="#7b8879" opacity=".27" />
      <ellipse rx="5.5" ry="2.3" fill="#6c786c" />
      <path d="M-1 0 V-18 H1 V0Z" fill="#788579" />
      <ellipse rx="15" ry="7.5" cy="-17" fill="#9e896a" />
      <ellipse rx="15" ry="7.5" cy="-18.5" fill="#d6bc91" stroke="#b39b76" strokeWidth=".6" />
      <ellipse rx="3.1" ry="1.4" cx="4" cy="-18.8" fill="#ece5ce" />
      <path d="M2 -21 h4 l-.5 2.4 q-1.5 1 -3 0Z" fill="#eae0c6" />
      <ellipse rx="1.7" ry=".65" cx="4" cy="-21" fill="#76654e" />
    </g>
  );
}
export function Table({ x, y, w, d, h = 16 }: Position & { w: number; d: number; h?: number }) {
  return (
    <g>
      {[2, w - 4].map((i) =>
        [2, d - 4].map((j) => (
          <Box key={i + "," + j} x={x + i} y={y + j} w={2} d={2} h={h} c={pine} />
        )),
      )}
      <Box {...{ x, y, w, d }} z={h} h={2.5} c={wood} />
      {repeat(4, (i) => (
        <Line
          a={[x + 4, y + 2 + (i * d) / 5, h + 2.6]}
          b={[x + w - 3 - i, y + 2 + (i * d) / 5, h + 2.6]}
          color="#b99673"
          width=".4"
        />
      ))}
      <Box
        x={x + w * 0.4}
        y={y + d * 0.4}
        z={h + 2.6}
        w={9}
        d={6}
        h={1.2}
        c={["#ede4c9", "#d0c0a5", "#9aab9c"]}
      />
      <Box x={x + w * 0.6} y={y + d * 0.25} z={h + 2.6} w={3} d={3} h={3.7} c={steel} />
    </g>
  );
}
export function DeskTerminal({ x, y, z }: Position & { z: number }) {
  const shell: Material = ["#d9d7bf", "#bcbda8", "#949e8d"];
  return (
    <g>
      <Box x={x + 2} y={y + 1} z={z} w={14} d={10} h={2} c={shell} />
      <Box {...{ x, y }} z={z + 2} w={18} d={12} h={14} c={shell} />
      <Front x={x + 1.5} y={y + 12.1} z={z + 5} w={14.8} h={9.5} fill="#67776c" />
      <Front x={x + 2.4} y={y + 12.2} z={z + 6} w={13.1} h={7.8} fill="#314a43" />
      {repeat(3, (i) => (
        <Front
          x={x + 3.4}
          y={y + 12.3}
          z={z + 11.8 - i * 1.65}
          w={4 + (i % 2) * 4}
          h={0.5}
          fill="#a0ba9b"
        />
      ))}
      <Box x={x - 1} y={y + 16} z={z} w={17} d={5} h={1} c={shell} />
      {repeat(3, (i) => (
        <Line
          a={[x, y + 16.7 + i * 1.2, z + 1.1]}
          b={[x + 14, y + 16.7 + i * 1.2, z + 1.1]}
          color="#838e7e"
          width=".55"
        />
      ))}
    </g>
  );
}
export function Carton({
  x,
  y,
  z = 0,
  w = 22,
  d = 16,
  h = 14,
}: Position & { z?: number; w?: number; d?: number; h?: number }) {
  return (
    <g>
      <Box {...{ x, y, z, w, d, h }} c={["#c69e70", "#b68a5b", "#9d744f"]} edge />
      <Floor x={x + w * 0.43} y={y} z={z + h + 0.15} w={w * 0.14} d={d} fill="#dbc296" />
      <Front x={x + w * 0.43} y={y + d + 0.1} z={z + h - 4} w={w * 0.14} h={4} fill="#ceb080" />
      <Front x={x + 2} y={y + d + 0.1} z={z + 3} w={w * 0.3} h={4} fill="#ece4c9" />
      {repeat(4, (i) => (
        <Front x={x + 2.7 + i} y={y + d + 0.2} z={z + 3.6} w={0.4} h={2.5} fill="#655e4c" />
      ))}
    </g>
  );
}
export function ContactShadow({
  x,
  y,
  w,
  d,
  amount,
}: Position & { w: number; d: number; amount: number }) {
  return (
    <Polygon
      v={[
        [x, y, 0.12],
        [x + w, y, 0.12],
        [x + w + amount, y + d + 4, 0.12],
        [x + amount, y + d + 4, 0.12],
      ]}
      fill="#536154"
      opacity=".19"
    />
  );
}
export function Shelves({ x, y }: Position) {
  return (
    <g>
      {repeat(2, (i) => (
        <Box x={x + i * 29} y={y} w={2} d={12} h={49} c={wood} />
      ))}
      {repeat(4, (r) => (
        <g>
          <Box x={x} y={y} z={3 + r * 14} w={32} d={12} h={2} c={wood} />
          {repeat(7, (i) => (
            <g>
              <Box
                x={x + 2 + i * 3.8}
                y={y + 2}
                z={5 + r * 14}
                w={2.8}
                d={6}
                h={7 + (i % 4)}
                c={assertValue([steel, pine, wood][(i + r) % 3])}
              />
              <Front
                x={x + 2.3 + i * 3.8}
                y={y + 8.1}
                z={7 + r * 14}
                w={2}
                h={0.65}
                fill="#dfd6bc"
              />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}
export const Furniture = memo(function Furniture({ site }: { site: string }) {
  return (
    <>
      <g>
        <Floor x={24} y={47} w={97} d={60} fill="#a4ad98" />
        {repeat(16, (i) => (
          <Line
            a={[25, 48 + i * 3.6, 0.2]}
            b={[120, 48 + i * 3.6, 0.2]}
            color="#b8bba6"
            width=".6"
          />
        ))}
        <ContactShadow x={27} y={44} w={72} d={23} amount={5} />
        <Sofa x={28} y={43} w={70} orange={site === "lounge"} />
        <ContactShadow x={45} y={81} w={44} d={17} amount={2} />
        <Table x={47} y={83} w={43} d={16} h={12} />
      </g>
      {site === "lounge" && <CafeSet x={132} y={94} />}
      <Plant x={13} y={125} size={1.15} />
      <Box x={168} y={109} w={36} d={6} h={9} c={wood} />
      {repeat(3, (i) => (
        <Plant x={172 + i * 12} y={112} size={0.48} />
      ))}
      <Box x={0} y={143} w={150} d={2} h={8} c={["#e6ddc5", "#c5c4b0", "#a4ae9d"]} />
      <Box x={189} y={143} w={33} d={2} h={8} c={["#e6ddc5", "#c5c4b0", "#a4ae9d"]} />
      <Box x={220} y={0} w={2} d={145} h={9} c={["#e6ddc5", "#c5c4b0", "#a4ae9d"]} />
      <BorderPlanting x={77} y={160} />
      <BorderPlanting x={215} y={157} />
    </>
  );
});
