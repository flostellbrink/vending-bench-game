import { memo, useId } from "react";

import { DeskTerminal } from "./Furniture";
import { Box, Floor, Front, Line, Polygon, project, repeat, steel } from "./geometry";

const brick = ["#c69c84", "#af806a", "#a27562"] as const;
const slate = ["#899f9b", "#617c78", "#506a66"] as const;
const desktop = ["#c7b390", "#a28b70", "#857763"] as const;

export const HouseShell = memo(function HouseShell() {
  const [windowX, windowY] = project([0.1, 132, 72]);
  const [wallX, wallY] = project([0, 0.1, 87]);
  const mortar = useId();
  return (
    <g>
      <Box x={0} y={0} z={-4} w={222} d={145} h={4} c={["#c5c9ba", "#a5ad9e", "#909a8e"]} />
      <Floor x={123} y={0} w={76} d={145} fill="#d9cfb3" />
      {[122, 199].map((x) => (
        <Line key={x} a={[x, 0, 0.2]} b={[x, 145, 0.2]} color="#a9af99" width="1.5" />
      ))}
      {repeat(7, (i) => (
        <Line a={[0, i * 22, 0.3]} b={[222, i * 22, 0.3]} color="#b3b7a5" width=".6" />
      ))}
      <Box x={-3} y={0} w={3} d={145} h={87} c={brick} />
      <Box x={0} y={-3} w={222} d={3} h={87} c={brick} />
      <defs>
        <pattern id={mortar} width="17" height="13.4" patternUnits="userSpaceOnUse">
          <path
            d="M0 .4 H17 M0 7.1 H17 M.4 0 V7 M8.5 7 V13.4"
            fill="none"
            stroke="#c19c83"
            strokeWidth=".8"
          />
        </pattern>
      </defs>
      <rect
        transform={`matrix(1 .5 0 1 ${wallX} ${wallY})`}
        width="222"
        height="87"
        fill={`url(#${mortar})`}
      />
      <g transform={`matrix(1 -.5 0 1 ${windowX} ${windowY})`}>
        <rect x="-3" y="-3" width="124" height="55" fill="#546d68" />
        <rect width="118" height="49" fill="#b3c9c2" />
        <path d="M0 37 L31 7 L43 7 L5 46 Z M48 42 L85 5 H96 L58 43Z" fill="#c7d5c6" />
        {repeat(6, (i) => (
          <rect x={i * 20} width="2" height="49" fill="#627a73" />
        ))}
        <rect y="18" width="118" height="2" fill="#627a73" />
      </g>
      {repeat(3, (i) => (
        <g>
          <Box x={i * 74} y={-3} w={2.5} d={4.5} h={90} c={slate} />
          <Polygon
            v={[
              [i * 74, 0, 87],
              [i * 74 + 70, 0, 87],
              [i * 74 + 70, 0, 109],
            ]}
            fill="#bccdc3"
          />
          <Line a={[i * 74, 0, 87]} b={[i * 74 + 70, 0, 109]} color="#627970" width="3" />
          <Line a={[i * 74 + 70, 0, 109]} b={[i * 74 + 70, 0, 87]} color="#627970" width="3" />
        </g>
      ))}
      <Box x={0} y={-3} z={85} w={222} d={4} h={3} c={slate} />
      <Box x={-3} y={0} z={85} w={3} d={145} h={3} c={slate} />
      <Front x={50} y={1} z={30} w={56} h={33} fill="#71847a" />
      <Front x={52} y={1.2} z={32} w={52} h={29} fill="#dce0ca" />
      {repeat(3, (i) => (
        <g>
          <Front x={55 + i * 16} y={1.4} z={51} w={9} h={4} fill="#91a397" />
          <Front x={56 + i * 16} y={1.4} z={41 + (i % 2) * 3} w={5} h={5} fill="#c6ad75" />
        </g>
      ))}
    </g>
  );
});

export const HouseWorkstations = memo(function HouseWorkstations() {
  return (
    <g>
      {repeat(2, (row) => {
        const y = 23 + row * 58;
        return (
          <g>
            {[16, 104].map((x) => (
              <Box key={x} x={x} y={y} w={4} d={28} h={23} c={steel} />
            ))}
            <Box x={12} y={y} z={23} w={102} d={29} h={3} c={desktop} />
            {repeat(3, (i) => (
              <g>
                <DeskTerminal x={17 + i * 33} y={y + 2} z={26} />
                <Box x={20 + i * 33} y={y + 35} w={9} d={7} h={3} c={steel} />
                <Box x={23 + i * 33} y={y + 37} w={3} d={3} h={12} c={steel} />
                <Box x={18 + i * 33} y={y + 32} z={12} w={14} d={11} h={3} c={slate} />
                <Box x={18 + i * 33} y={y + 42} z={14} w={14} d={2.5} h={10} c={slate} />
              </g>
            ))}
          </g>
        );
      })}
      <Box x={0} y={143} w={122} d={2} h={8} c={brick} />
      <Box x={199} y={143} w={23} d={2} h={8} c={brick} />
      <Box x={220} y={0} w={2} d={145} h={8} c={brick} />
    </g>
  );
});
