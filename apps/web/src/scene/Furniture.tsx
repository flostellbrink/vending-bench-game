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
  type Vertex,
} from "./geometry.tsx";
import { Plant, BorderPlanting } from "./Plant.tsx";

interface Offset {
  x: number;
  y: number;
  z: number;
}

const sofa = {
  backCushion: { bottom: 14, frontY: 6, top: 23, topY: 4 },
  cushionGap: 0.7,
  cushionInset: 3,
  cushions: 3,
  pillow: [
    { x: 8, y: 9, z: 14 },
    { x: 20, y: 9, z: 14 },
    { x: 19, y: 4, z: 23 },
    { x: 9, y: 4, z: 24 },
  ],
};
const cafeChairs = [
  { back: "M-6 -11 Q-11 -17 -7 -22 Q-4 -23 -2 -21 L-2 -12Z", x: -20, y: -4 },
  { back: "M3 -9 L6 -18 Q10 -24 12 -19 Q12 -11 8 -8Z", x: 20, y: 5 },
];
const tableHeight = 16;
const tableTop = { onTop: 2.6 };
const tablePapers = { across: 0.4, along: 0.4 };
const tableCup = { across: 0.6, along: 0.25 };
const terminal = {
  bezel: { x: 1.5, y: 12.1, z: 5 },
  keyRows: { length: 14, lift: 1.1, pitch: 1.2, y: 16.7 },
  keyboardY: 16,
  screen: { x: 2.4, y: 12.2, z: 6 },
  text: { lineGap: 1.65, top: 11.8, x: 3.4, y: 12.3 },
};
const cartonSize = { depth: 16, height: 14, width: 22 };
const carton = {
  barcode: { lift: 0.2, x: 2.7, z: 3.6 },
  faceLift: 0.1,
  labelWidth: 0.3,
  lidLift: 0.15,
  tapeStart: 0.43,
  tapeWidth: 0.14,
};
const shadowLift = 0.12;
const bookcase = {
  itemHeight: 7,
  itemPitch: 3.8,
  items: 7,
  labelInset: 2.3,
  labelY: 8.1,
  labelZ: 7,
  shelfPitch: 14,
  uprightSpan: 29,
};
const rug = { first: 48, left: 25, lift: 0.2, lines: 16, pitch: 3.6, right: 120 };
const planter = { firstPlant: 172, plantPitch: 12 };

function offset(x: number, y: number, part: Offset): Vertex {
  return [x + part.x, y + part.y, part.z];
}

export function Sofa({ x, y, w, orange = false }: Position & { w: number; orange?: boolean }) {
  const fabric: Material = orange
    ? ["#c78b69", "#a86950", "#884f40"]
    : ["#e3dcca", "#d1c8b5", "#aaa996"];
  const { backCushion, cushionInset, cushions } = sofa;
  const span = w - 2 * cushionInset;
  return (
    <g>
      <Box x={x + 2} y={y + 2} w={w - 4} d={20} h={4} c={wood} />
      <Box x={x} y={y} z={4} w={w} d={24} h={7} c={fabric} />
      <Box x={x + 1} y={y} z={10} w={w - 2} d={5} h={14} c={fabric} />
      {repeat(cushions, (i) => (
        <Box
          x={x + cushionInset + (i * span) / cushions}
          y={y + backCushion.frontY}
          z={11}
          w={span / cushions - sofa.cushionGap}
          d={16}
          h={3}
          c={fabric}
        />
      ))}
      {repeat(cushions, (i) => (
        <Polygon
          v={[
            [x + cushionInset + (i * span) / cushions, y + backCushion.frontY, backCushion.bottom],
            [x + 2 + ((i + 1) * span) / cushions, y + backCushion.frontY, backCushion.bottom],
            [x + 1 + ((i + 1) * span) / cushions, y + backCushion.topY, backCushion.top],
            [x + 4 + (i * span) / cushions, y + backCushion.topY, backCushion.top],
          ]}
          fill={fabric[0]}
          stroke={fabric[1]}
          strokeWidth=".65"
        />
      ))}
      {repeat(2, (i) => (
        <Box x={x + i * (w - 4)} y={y + 1} z={10} w={4} d={23} h={8} c={fabric} />
      ))}
      <Polygon v={sofa.pillow.map((corner) => offset(x, y, corner))} fill="#647f71" />
    </g>
  );
}
function CafeSet({ x, y }: Position) {
  const [cx, cy] = project([x, y, 0]);
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {cafeChairs.map((chair) => (
        <g key={chair.x} transform={`translate(${chair.x} ${chair.y})`}>
          <path
            d="M-5 -10 L-7 0 M4 -10 L7 1 M-2 -9 L-1 3"
            fill="none"
            stroke="#6b7567"
            strokeWidth="1.1"
          />
          <ellipse rx="7" ry="3.4" cy="-10" fill="#b89d74" />
          <path d={chair.back} fill="#a97655" stroke="#866448" strokeWidth=".65" />
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
export function Table({
  x,
  y,
  w,
  d,
  h = tableHeight,
}: Position & { w: number; d: number; h?: number }) {
  const surface = h + tableTop.onTop;
  return (
    <g>
      {[2, w - 4].map((i) =>
        [2, d - 4].map((j) => (
          <Box key={`${i},${j}`} x={x + i} y={y + j} w={2} d={2} h={h} c={pine} />
        )),
      )}
      <Box d={d} w={w} x={x} y={y} z={h} h={2.5} c={wood} />
      {repeat(4, (i) => (
        <Line
          a={[x + 4, y + 2 + (i * d) / 5, surface]}
          b={[x + w - 3 - i, y + 2 + (i * d) / 5, surface]}
          color="#b99673"
          width=".4"
        />
      ))}
      <Box
        x={x + w * tablePapers.across}
        y={y + d * tablePapers.along}
        z={surface}
        w={9}
        d={6}
        h={1.2}
        c={["#ede4c9", "#d0c0a5", "#9aab9c"]}
      />
      <Box
        x={x + w * tableCup.across}
        y={y + d * tableCup.along}
        z={surface}
        w={3}
        d={3}
        h={3.7}
        c={steel}
      />
    </g>
  );
}
export function DeskTerminal({ x, y, z }: Position & { z: number }) {
  const shell: Material = ["#d9d7bf", "#bcbda8", "#949e8d"];
  const { bezel, keyRows, screen, text } = terminal;
  return (
    <g>
      <Box x={x + 2} y={y + 1} z={z} w={14} d={10} h={2} c={shell} />
      <Box x={x} y={y} z={z + 2} w={18} d={12} h={14} c={shell} />
      <Front x={x + bezel.x} y={y + bezel.y} z={z + bezel.z} w={14.8} h={9.5} fill="#67776c" />
      <Front x={x + screen.x} y={y + screen.y} z={z + screen.z} w={13.1} h={7.8} fill="#314a43" />
      {repeat(3, (i) => (
        <Front
          x={x + text.x}
          y={y + text.y}
          z={z + text.top - i * text.lineGap}
          w={4 + (i % 2) * 4}
          h={0.5}
          fill="#a0ba9b"
        />
      ))}
      <Box x={x - 1} y={y + terminal.keyboardY} z={z} w={17} d={5} h={1} c={shell} />
      {repeat(3, (i) => (
        <Line
          a={[x, y + keyRows.y + i * keyRows.pitch, z + keyRows.lift]}
          b={[x + keyRows.length, y + keyRows.y + i * keyRows.pitch, z + keyRows.lift]}
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
  w = cartonSize.width,
  d = cartonSize.depth,
  h = cartonSize.height,
}: Position & { z?: number; w?: number; d?: number; h?: number }) {
  const { barcode } = carton;
  return (
    <g>
      <Box d={d} h={h} w={w} x={x} y={y} z={z} c={["#c69e70", "#b68a5b", "#9d744f"]} edge />
      <Floor
        x={x + w * carton.tapeStart}
        y={y}
        z={z + h + carton.lidLift}
        w={w * carton.tapeWidth}
        d={d}
        fill="#dbc296"
      />
      <Front
        x={x + w * carton.tapeStart}
        y={y + d + carton.faceLift}
        z={z + h - 4}
        w={w * carton.tapeWidth}
        h={4}
        fill="#ceb080"
      />
      <Front
        x={x + 2}
        y={y + d + carton.faceLift}
        z={z + 3}
        w={w * carton.labelWidth}
        h={4}
        fill="#ece4c9"
      />
      {repeat(4, (i) => (
        <Front
          x={x + barcode.x + i}
          y={y + d + barcode.lift}
          z={z + barcode.z}
          w={0.4}
          h={2.5}
          fill="#655e4c"
        />
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
        [x, y, shadowLift],
        [x + w, y, shadowLift],
        [x + w + amount, y + d + 4, shadowLift],
        [x + amount, y + d + 4, shadowLift],
      ]}
      fill="#536154"
      opacity=".19"
    />
  );
}
const bookColors = [steel, pine, wood];

export function Shelves({ x, y }: Position) {
  const { itemPitch, shelfPitch } = bookcase;
  return (
    <g>
      {repeat(2, (i) => (
        <Box x={x + i * bookcase.uprightSpan} y={y} w={2} d={12} h={49} c={wood} />
      ))}
      {repeat(4, (r) => (
        <g>
          <Box x={x} y={y} z={3 + r * shelfPitch} w={32} d={12} h={2} c={wood} />
          {repeat(bookcase.items, (i) => (
            <g>
              <Box
                x={x + 2 + i * itemPitch}
                y={y + 2}
                z={5 + r * shelfPitch}
                w={2.8}
                d={6}
                h={bookcase.itemHeight + (i % 4)}
                c={assertValue(bookColors[(i + r) % 3])}
              />
              <Front
                x={x + bookcase.labelInset + i * itemPitch}
                y={y + bookcase.labelY}
                z={bookcase.labelZ + r * shelfPitch}
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
        {repeat(rug.lines, (i) => (
          <Line
            a={[rug.left, rug.first + i * rug.pitch, rug.lift]}
            b={[rug.right, rug.first + i * rug.pitch, rug.lift]}
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
        <Plant x={planter.firstPlant + i * planter.plantPitch} y={112} size={0.48} />
      ))}
      <Box x={0} y={143} w={150} d={2} h={8} c={["#e6ddc5", "#c5c4b0", "#a4ae9d"]} />
      <Box x={189} y={143} w={33} d={2} h={8} c={["#e6ddc5", "#c5c4b0", "#a4ae9d"]} />
      <Box x={220} y={0} w={2} d={145} h={9} c={["#e6ddc5", "#c5c4b0", "#a4ae9d"]} />
      <BorderPlanting x={77} y={160} />
      <BorderPlanting x={215} y={157} />
    </>
  );
});
