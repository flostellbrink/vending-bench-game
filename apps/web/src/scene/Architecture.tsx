import { assertValue } from "games-common/language";
import { memo } from "react";

import { concourse } from "./Atrium";
import { ContactShadow, Shelves } from "./Furniture";
import { Box, Front, Line, Polygon, project, repeat } from "./geometry";

function Window({ id }: { id: string }) {
  const a = project([0, 93, 67]),
    b = project([0, 34, 67]);
  const matrix = `matrix(${(b[0] - a[0]) / 110} ${(b[1] - a[1]) / 110} 0 1 ${a[0]} ${a[1]})`;
  return (
    <g transform={matrix}>
      <defs>
        <clipPath id={id}>
          <rect width="110" height="54" />
        </clipPath>
      </defs>
      <g clipPath={"url(#" + id + ")"}>
        <rect width="110" height="54" fill="#a6c6bd" opacity=".19" />
        <path
          d="M4 40 L37 0 H42 L8 42Z M61 54 L94 12 L99 12 L66 54Z"
          fill="#fff9e9"
          opacity=".25"
        />
      </g>
      <rect width="110" height="54" fill="none" stroke="#566d64" strokeWidth="3" />
      {repeat(4, (i) => (
        <rect x={21 + i * 23} width="2" height="54" fill="#72867b" />
      ))}
      <rect y="14" width="110" height="2" fill="#74897e" />
      <rect y="53" width="111" height="3" fill="#a0aea0" />
    </g>
  );
}
function WallClock({ phase }: { phase: number }) {
  const [x, y] = project([35, 1, 62]);
  return (
    <g transform={`matrix(1 .5 0 1 ${x} ${y})`}>
      <circle r="8.2" fill="#5a6b62" />
      <circle r="7" fill="#efe9d5" />
      {repeat(12, (i) => (
        <path
          transform={"rotate(" + 30 * i + ")"}
          d="M0 -6.6 v1"
          stroke="#758078"
          strokeWidth=".65"
        />
      ))}
      <path
        transform={"rotate(" + phase * 720 + ")"}
        d="M0 1 V-3.8"
        stroke="#37483f"
        strokeWidth="1.1"
      />
      <path
        transform={"rotate(" + phase * 8640 + ")"}
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
      {repeat(11, (i) => (
        <Line a={[i * 21, 0, 0]} b={[i * 21, 145, 0]} color="#afb3a0" width=".55" />
      ))}
      {repeat(7, (i) => (
        <Line a={[0, i * 21, 0]} b={[222, i * 21, 0]} color="#b5b9a5" width=".55" />
      ))}
      <Box x={-3} y={0} w={3} d={145} h={13} c={["#d1c7ae", "#adac98", "#e5dcc6"]} />
      <Box x={-3} y={0} w={3} d={34} h={84} c={["#e3dac5", "#bdbba9", "#dfd8c2"]} />
      <Box x={-3} y={93} w={3} d={52} h={84} c={["#e3dac5", "#bdbba9", "#dfd8c2"]} />
      <Box x={-3} y={34} z={67} w={3} d={59} h={17} c={["#e3dac5", "#bdbba9", "#dfd8c2"]} />
      <Box x={0} y={-3} w={222} d={3} h={84} c={["#f0e9d6", "#e8dfca", "#b4b9a8"]} />
      {repeat(11, (i) => (
        <Line a={[8 + i * 20, 0.1, 6]} b={[8 + i * 20, 0.1, 82]} color="#d8cdb7" width=".55" />
      ))}
      <Line a={[0, 0.2, 81]} b={[222, 0.2, 81]} color="#fff5df" width="1.3" />
      <Window id={id + "window"} />
      <Line a={[0, 0, 4]} b={[222, 0, 4]} color="#95a38e" width="2" />
      <Line a={[0, 0, 4]} b={[0, 145, 4]} color="#98a490" width="2" />
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
  return (
    <>
      <g clipPath={"url(#" + id + "floor)"} opacity={light * 0.64}>
        {repeat(5, (i) => (
          <Polygon
            v={[
              [0, 8 + i * 22, 0],
              [0, 28 + i * 22, 0],
              [61 + x, 43 + i * 22 - x * 0.6, 0],
              [61 + x, 23 + i * 22 - x * 0.6, 0],
            ]}
            fill="#fff2c8"
          />
        ))}
      </g>
      <ContactShadow
        x={atrium ? concourse.machineX : 125}
        y={13}
        w={68}
        d={21}
        amount={4 + 15 * Math.cos(phase * Math.PI)}
      />
      {!atrium && (
        <ContactShadow x={67} y={6} w={31} d={12} amount={2 + 9 * Math.cos(phase * Math.PI)} />
      )}
      <WallClock phase={phase} />
    </>
  );
}

export const BackWall = memo(function BackWall({ depot }: { depot: boolean }) {
  return (
    <>
      <Front x={22} y={0.5} z={22} w={26} h={23} fill="#a89577" />
      {repeat(5, (i) => (
        <g>
          <Front
            x={24 + (i % 3) * 7}
            y={1}
            z={33 - Math.floor(i / 3) * 9}
            w={6}
            h={8}
            fill={assertValue(["#e5dfcd", "#c0ceba", "#e2cf9b"][i % 3])}
          />
          <Front
            x={25 + (i % 3) * 7}
            y={1.1}
            z={38 - Math.floor(i / 3) * 9}
            w={3.8}
            h={0.5}
            fill="#879381"
          />
        </g>
      ))}
      <Shelves x={66} y={3} stock={depot} />
      {depot && (
        <g>
          <Shelves x={118} y={6} stock />
          <Shelves x={162} y={6} stock />
        </g>
      )}
    </>
  );
});
