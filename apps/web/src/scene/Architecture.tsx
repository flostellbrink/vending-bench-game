import { assertValue } from "games-common/language";
import { memo } from "react";

import { concourse } from "./Atrium.tsx";
import { ContactShadow, Shelves } from "./Furniture.tsx";
import { Box, Front, Line, Polygon, project, repeat, type Vertex } from "./geometry.tsx";

const room = { depth: 145, width: 222 };
const floorBoards = { acrossDepth: 7, acrossWidth: 11, size: 21 };
const wallpaper = { bottom: 6, first: 8, lift: 0.1, pitch: 20, stripes: 11, top: 82 };
const pictureRail = { height: 81, lift: 0.2 };
const skirtingHeight = 4;
/** The window in the left wall, drawn at its own width and then mapped onto the wall. */
const sideWindow = {
  backY: 34,
  drawingWidth: 110,
  frontY: 93,
  mullionPitch: 23,
  mullionStart: 21,
  top: 67,
};
const wallClock = {
  hourDegreesPerDay: 720,
  minuteDegreesPerDay: 8640,
  position: { x: 35, y: 1, z: 62 },
  tickDegrees: 30,
  ticks: 12,
};
const sunbeams = {
  count: 5,
  far: { bottom: 23, top: 43, x: 61 },
  near: { bottom: 8, top: 28 },
  pitch: 22,
  slope: 0.6,
  strength: 0.64,
};
const roomCabinetX = 125;
const cabinetShadow = { base: 4, swing: 15 };
const shelfShadow = { base: 2, swing: 9 };
const noticeBoard = {
  left: 24,
  notes: 5,
  perRow: 3,
  pitch: 7,
  rowPitch: 9,
  tapeLeft: 25,
  tapeTop: 38,
  top: 33,
};

function vertex({ x, y, z }: { x: number; y: number; z: number }): Vertex {
  return [x, y, z];
}

function Window({ id }: { id: string }) {
  const a = project([0, sideWindow.frontY, sideWindow.top]);
  const b = project([0, sideWindow.backY, sideWindow.top]);
  const scale = sideWindow.drawingWidth;
  const matrix = `matrix(${(b[0] - a[0]) / scale} ${(b[1] - a[1]) / scale} 0 1 ${a[0]} ${a[1]})`;
  return (
    <g transform={matrix}>
      <defs>
        <clipPath id={id}>
          <rect width="110" height="54" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="110" height="54" fill="#a6c6bd" opacity=".19" />
        <path
          d="M4 40 L37 0 H42 L8 42Z M61 54 L94 12 L99 12 L66 54Z"
          fill="#fff9e9"
          opacity=".25"
        />
      </g>
      <rect width="110" height="54" fill="none" stroke="#566d64" strokeWidth="3" />
      {repeat(4, (i) => (
        <rect
          x={sideWindow.mullionStart + i * sideWindow.mullionPitch}
          width="2"
          height="54"
          fill="#72867b"
        />
      ))}
      <rect y="14" width="110" height="2" fill="#74897e" />
      <rect y="53" width="111" height="3" fill="#a0aea0" />
    </g>
  );
}
export function WallClock({ phase }: { phase: number }) {
  const [x, y] = project(vertex(wallClock.position));
  return (
    <g transform={`matrix(1 .5 0 1 ${x} ${y})`}>
      <circle r="8.2" fill="#5a6b62" />
      <circle r="7" fill="#efe9d5" />
      {repeat(wallClock.ticks, (i) => (
        <path
          transform={`rotate(${wallClock.tickDegrees * i})`}
          d="M0 -6.6 v1"
          stroke="#758078"
          strokeWidth=".65"
        />
      ))}
      <path
        transform={`rotate(${phase * wallClock.hourDegreesPerDay})`}
        d="M0 1 V-3.8"
        stroke="#37483f"
        strokeWidth="1.1"
      />
      <path
        transform={`rotate(${phase * wallClock.minuteDegreesPerDay})`}
        d="M0 1 V-5.5"
        stroke="#45584d"
        strokeWidth=".7"
      />
    </g>
  );
}
export const RoomShell = memo(function RoomShell({ id }: { id: string }) {
  return (
    <>
      <Box x={0} y={0} z={-4} w={222} d={145} h={4} c={["#d2d0b9", "#9a9e8d", "#7f8c81"]} />
      {repeat(floorBoards.acrossWidth, (i) => (
        <Line
          a={vertex({ x: i * floorBoards.size, y: 0, z: 0 })}
          b={vertex({ x: i * floorBoards.size, y: room.depth, z: 0 })}
          color="#afb3a0"
          width=".55"
        />
      ))}
      {repeat(floorBoards.acrossDepth, (i) => (
        <Line
          a={vertex({ x: 0, y: i * floorBoards.size, z: 0 })}
          b={vertex({ x: room.width, y: i * floorBoards.size, z: 0 })}
          color="#b5b9a5"
          width=".55"
        />
      ))}
      <Box x={-3} y={0} w={3} d={145} h={13} c={["#d1c7ae", "#adac98", "#e5dcc6"]} />
      <Box x={-3} y={0} w={3} d={34} h={84} c={["#e3dac5", "#bdbba9", "#dfd8c2"]} />
      <Box x={-3} y={93} w={3} d={52} h={84} c={["#e3dac5", "#bdbba9", "#dfd8c2"]} />
      <Box x={-3} y={34} z={67} w={3} d={59} h={17} c={["#e3dac5", "#bdbba9", "#dfd8c2"]} />
      <Box x={0} y={-3} w={222} d={3} h={84} c={["#f0e9d6", "#e8dfca", "#b4b9a8"]} />
      {repeat(wallpaper.stripes, (i) => (
        <Line
          a={vertex({
            x: wallpaper.first + i * wallpaper.pitch,
            y: wallpaper.lift,
            z: wallpaper.bottom,
          })}
          b={vertex({
            x: wallpaper.first + i * wallpaper.pitch,
            y: wallpaper.lift,
            z: wallpaper.top,
          })}
          color="#d8cdb7"
          width=".55"
        />
      ))}
      <Line
        a={vertex({ x: 0, y: pictureRail.lift, z: pictureRail.height })}
        b={vertex({ x: room.width, y: pictureRail.lift, z: pictureRail.height })}
        color="#fff5df"
        width="1.3"
      />
      <Window id={`${id}window`} />
      <Line
        a={[0, 0, skirtingHeight]}
        b={[room.width, 0, skirtingHeight]}
        color="#95a38e"
        width="2"
      />
      <Line
        a={[0, 0, skirtingHeight]}
        b={[0, room.depth, skirtingHeight]}
        color="#98a490"
        width="2"
      />
    </>
  );
});

export function Sunlight({
  id,
  x,
  light,
  phase,
  atrium,
}: {
  id: string;
  x: number;
  light: number;
  phase: number;
  atrium: boolean;
}) {
  const { far, near, pitch, slope } = sunbeams;
  return (
    <>
      <g clipPath={`url(#${id}floor)`} opacity={light * sunbeams.strength}>
        {repeat(sunbeams.count, (i) => (
          <Polygon
            v={[
              vertex({ x: 0, y: near.bottom + i * pitch, z: 0 }),
              vertex({ x: 0, y: near.top + i * pitch, z: 0 }),
              vertex({ x: far.x + x, y: far.top + i * pitch - x * slope, z: 0 }),
              vertex({ x: far.x + x, y: far.bottom + i * pitch - x * slope, z: 0 }),
            ]}
            fill="#fff2c8"
          />
        ))}
      </g>
      <ContactShadow
        x={atrium ? concourse.machineX : roomCabinetX}
        y={13}
        w={68}
        d={21}
        amount={cabinetShadow.base + cabinetShadow.swing * Math.cos(phase * Math.PI)}
      />
      {!atrium && (
        <ContactShadow
          x={67}
          y={6}
          w={31}
          d={12}
          amount={shelfShadow.base + shelfShadow.swing * Math.cos(phase * Math.PI)}
        />
      )}
      <WallClock phase={phase} />
    </>
  );
}

const noteColors = ["#e5dfcd", "#c0ceba", "#e2cf9b"];

export const BackWall = memo(function BackWall() {
  const { perRow, pitch, rowPitch } = noticeBoard;
  return (
    <>
      <Front x={22} y={0.5} z={22} w={26} h={23} fill="#a89577" />
      {repeat(noticeBoard.notes, (i) => (
        <g>
          <Front
            x={noticeBoard.left + (i % perRow) * pitch}
            y={1}
            z={noticeBoard.top - Math.floor(i / perRow) * rowPitch}
            w={6}
            h={8}
            fill={assertValue(noteColors[i % perRow])}
          />
          <Front
            x={noticeBoard.tapeLeft + (i % perRow) * pitch}
            y={1.1}
            z={noticeBoard.tapeTop - Math.floor(i / perRow) * rowPitch}
            w={3.8}
            h={0.5}
            fill="#879381"
          />
        </g>
      ))}
      <Shelves x={66} y={3} />
    </>
  );
});
