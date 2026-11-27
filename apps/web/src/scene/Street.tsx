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
  type Vertex,
} from "./geometry.tsx";

/** A tree's shadow leans with the sun over the day and is strongest in full daylight. */
const treeShadow = { lean: -0.2, strength: 0.4, sweep: 0.8 };
const bicycleWheelbase = 18;
/** Heights of the marks on the pavement surface. Marks drawn later sit higher. */
const surface = {
  frontPatch: -1.6,
  glint: -1.5,
  joints: -1.7,
  kerbLine: -1.5,
  puddles: -1.6,
  sidePatch: -1.5,
};
/** Joints across the pavement in front of the building, from its front wall to the edge. */
const frontJoints = { count: 15, edge: 177, first: -39, pitch: 20, wall: 145 };
/** The two joints along the front pavement. */
const frontRows = { count: 2, first: 152, left: -42, pitch: 17, right: 241 };
/** Joints of the pavement along the right side of the building. */
const rightJoints = { count: 12, edge: 242, first: -14, pitch: 16, wall: 222 };
/** Joints of the pavement behind the building, between the kerb and the back wall. */
const backJoints = { count: 18, first: -43, kerb: -32, pitch: 15 };
/** Joints of the pavement along the left side of the building. */
const leftJoints = { count: 12, edge: -43, first: -8, pitch: 13 };
const kerbLine = { left: -43, right: 222, y: -31 };
/** The dashed centre line of the road behind the building. */
const roadDashes = { count: 8, first: -40, length: 15, pitch: 34, y: -41 };
/** After rain: a puddle on the front pavement with a glint, and one on the right side. */
const frontPuddle = [
  { x: 98, y: 150 },
  { x: 105, y: 149 },
  { x: 122, y: 151 },
  { x: 125, y: 154 },
  { x: 111, y: 156 },
  { x: 97, y: 154 },
];
const puddleGlint = { left: 102, right: 116, y: 152 };
const sidePuddle = [
  { x: 225, y: 24 },
  { x: 233, y: 31 },
  { x: 231, y: 47 },
  { x: 226, y: 49 },
  { x: 223, y: 41 },
];
/** Worn, paler paving on the front and the left pavement. */
const frontPatch = [
  { x: 11, y: 153 },
  { x: 36, y: 151 },
  { x: 43, y: 157 },
  { x: 67, y: 157 },
  { x: 71, y: 164 },
  { x: 42, y: 166 },
  { x: 18, y: 163 },
];
const sidePatch = [
  { x: -41, y: 0 },
  { x: -30, y: 2 },
  { x: -25, y: 25 },
  { x: -28, y: 39 },
  { x: -36, y: 65 },
  { x: -41, y: 70 },
];
const streetTrees = [
  { x: -23, y: 26 },
  { x: 91, y: -18 },
  { x: 201, y: -17 },
];
/** A square tree pit around each street tree, covered by a grating. */
const treePit = { bars: 6, firstBar: 6, halfSize: 7, lift: 0.3, reach: 5 };
/** The street lamp is on while daylight is below this level. */
const lampOnBelow = 0.25;

/** The vertices of an outline that lies flat at height z. */
function flat(z: number, outline: readonly Position[]): Vertex[] {
  return outline.map(({ x, y }) => [x, y, z]);
}

export function StreetTree({ x, y, phase, light }: Position & { phase: number; light: number }) {
  const [cx, cy] = project([x, y, 0]);
  const branches =
    "M0 0 Q2 -16 -1 -32 T1 -47 M0 -18 L-10 -28 L-16 -43 M-10 -28 L-22 -33 M-15 -38 L-23 -46 M0 -25 L8 -37 L12 -51 M8 -37 L20 -44 M12 -43 L23 -49 M0 -33 L-6 -47 L-5 -57 M-6 -47 L-13 -54 M1 -44 L5 -53";
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <g
        transform={`matrix(.7 .32 ${treeShadow.lean - Math.cos(phase * Math.PI) * treeShadow.sweep} -.24 1 0)`}
        opacity={light * treeShadow.strength}
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
      {[0, bicycleWheelbase].map((k) => (
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
          <Polygon v={flat(surface.puddles, frontPuddle)} fill="#a9bdbb" />
          <Line
            a={[puddleGlint.left, puddleGlint.y, surface.glint]}
            b={[puddleGlint.right, puddleGlint.y, surface.glint]}
            color="#e1e7dd"
            width=".7"
          />
          <Polygon v={flat(surface.puddles, sidePuddle)} fill="#afc2bf" />
        </g>
      )}
      {repeat(frontJoints.count, (i) => (
        <Line
          a={[frontJoints.first + i * frontJoints.pitch, frontJoints.wall, surface.joints]}
          b={[frontJoints.first + i * frontJoints.pitch, frontJoints.edge, surface.joints]}
          color="#b6beb0"
          width=".55"
        />
      ))}
      {repeat(frontRows.count, (i) => (
        <Line
          a={[frontRows.left, frontRows.first + i * frontRows.pitch, surface.joints]}
          b={[frontRows.right, frontRows.first + i * frontRows.pitch, surface.joints]}
          color="#b6beb0"
          width=".65"
        />
      ))}
      {repeat(rightJoints.count, (i) => (
        <Line
          a={[rightJoints.wall, i * rightJoints.pitch + rightJoints.first, surface.joints]}
          b={[rightJoints.edge, i * rightJoints.pitch + rightJoints.first, surface.joints]}
          color="#bcc3b5"
          width=".65"
        />
      ))}
      <Polygon v={flat(surface.frontPatch, frontPatch)} fill="#eef0e4" />
      {repeat(backJoints.count, (i) => (
        <Line
          a={[backJoints.first + i * backJoints.pitch, backJoints.kerb, surface.joints]}
          b={[backJoints.first + i * backJoints.pitch, 0, surface.joints]}
          color="#b2bbae"
          width=".65"
        />
      ))}
      {repeat(leftJoints.count, (i) => (
        <Line
          a={[leftJoints.edge, i * leftJoints.pitch + leftJoints.first, surface.joints]}
          b={[0, i * leftJoints.pitch + leftJoints.first, surface.joints]}
          color="#aeb9ad"
          width=".65"
        />
      ))}
      <Line
        a={[kerbLine.left, kerbLine.y, surface.kerbLine]}
        b={[kerbLine.right, kerbLine.y, surface.kerbLine]}
        color="#eef0df"
        width="2"
      />
      {repeat(roadDashes.count, (i) => (
        <Line
          a={[roadDashes.first + i * roadDashes.pitch, roadDashes.y, surface.joints]}
          b={[
            roadDashes.first + roadDashes.length + i * roadDashes.pitch,
            roadDashes.y,
            surface.joints,
          ]}
          color="#cfd5c8"
          width="1"
        />
      ))}
      <Polygon v={flat(surface.sidePatch, sidePatch)} fill="#e6eada" />
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
      {streetTrees.map(({ x, y }) => (
        <g key={x}>
          <Floor x={x - treePit.halfSize} y={y - treePit.halfSize} w={14} d={14} fill="#a4b09e" />
          {repeat(treePit.bars, (i) => (
            <Line
              a={[x - treePit.firstBar + i * 2, y - treePit.reach, treePit.lift]}
              b={[x - treePit.firstBar + i * 2, y + treePit.reach, treePit.lift]}
              color="#889488"
            />
          ))}
          <StreetTree light={light} phase={phase} x={x} y={y} />
        </g>
      ))}
      <Box x={19} y={-21} w={2} d={2} h={46} c={steel} />
      <Box x={17} y={-21} z={45} w={9} d={4} h={2} c={steel} />
      <Front
        x={18}
        y={-17}
        z={44.7}
        w={7}
        h={1.3}
        fill={light < lampOnBelow ? "#fff3ba" : "#c5caba"}
      />
      {!depot && <Bicycle x={145} y={-16} />}
    </g>
  );
}
