import type { Report } from "games-common/benchmark";

import { memo } from "react";

import { Carton } from "./Furniture";
import { Box, Floor, Front, Line, Polygon, project, repeat, steel, wood } from "./geometry";
import { minutesPerDay } from "./useClock";

export function depotObservations(reports: readonly Report[]) {
  return reports
    .filter(
      (report) =>
        report.tool === "get_storage_inventory" &&
        (report.rows.length > 0 || /^(Storage is empty\.|Storage at )/.test(report.output)),
    )
    .map((report) => ({
      time: (report.day - 1) * minutesPerDay + report.minute,
      cases: report.rows.reduce((cases, row) => cases + Math.ceil(Number(row[3]) / 6), 0),
    }));
}

const beam = ["#d6a570", "#b87d50", "#8e6249"] as const;

export const Depot = memo(function Depot({ cases }: { cases: number | null }) {
  const [doorX, doorY] = project([0, 124, 69]);
  return (
    <g>
      <Box x={0} y={0} z={-4} w={222} d={145} h={4} c={["#c8ccbd", "#a1a998", "#869386"]} />
      {repeat(6, (i) => (
        <Line a={[i * 42, 0, 0.1]} b={[i * 42, 145, 0.1]} color="#a6afa1" width=".8" />
      ))}
      {repeat(4, (i) => (
        <Line a={[0, i * 42, 0.1]} b={[222, i * 42, 0.1]} color="#a6afa1" width=".8" />
      ))}
      <Box x={-3} y={0} w={3} d={145} h={84} c={["#d2d6ca", "#9ca99f", "#bac2b5"]} />
      <Box x={0} y={-3} w={222} d={3} h={84} c={["#d9dfd2", "#c7cdc1", "#a1afa4"]} />
      <Front x={0} y={0.1} z={0} w={222} h={17} fill="#93a397" />
      <g transform={`matrix(1 -.5 0 1 ${doorX} ${doorY})`}>
        <rect x="-4" y="-4" width="94" height="73" fill="#687e75" />
        <rect width="86" height="66" fill="#a7b3a9" />
        {repeat(12, (i) => (
          <path d={`M0 ${4 + i * 5.4} h86`} stroke="#7a8c80" strokeWidth="1.5" />
        ))}
        {repeat(3, (i) => (
          <rect
            x={12 + i * 23}
            y="23"
            width="15"
            height="7"
            rx="2"
            fill="#5f766e"
            stroke="#c2cbbf"
          />
        ))}
        <rect x="-4" y="65" width="94" height="4" fill="#51685d" />
      </g>
      {[28, 130].map((y) => (
        <g key={y}>
          <Box x={5} y={y} w={5} d={5} h={20} c={beam} />
          <Front x={5} y={y + 5.1} z={12} w={5} h={3} fill="#526254" />
        </g>
      ))}
      <Floor x={15} y={48} w={186} d={2} fill="#ded298" />
      <Floor x={15} y={115} w={186} d={2} fill="#ded298" />
      {repeat(2, (i) => (
        <Polygon
          v={[
            [34 + i * 82, 80, 0.2],
            [45 + i * 82, 71, 0.2],
            [49 + i * 82, 71, 0.2],
            [40 + i * 82, 80, 0.2],
            [49 + i * 82, 89, 0.2],
            [45 + i * 82, 89, 0.2],
          ]}
          fill="#ded298"
        />
      ))}
      {repeat(3, (bay) => {
        const x = 46 + bay * 54;
        return (
          <g>
            {repeat(2, (i) => (
              <Box x={x + i * 48} y={3} w={2} d={2} h={65} c={steel} />
            ))}
            <Line a={[x + 1, 5, 4]} b={[x + 48, 5, 63]} color="#708379" width="1.6" />
            <Line a={[x + 48, 5, 4]} b={[x + 1, 5, 63]} color="#708379" width="1.6" />
            {repeat(3, (level) => (
              <g>
                <Box x={x} y={4} z={4 + level * 21} w={50} d={18} h={3} c={beam} />
                {repeat(
                  2,
                  (slot) =>
                    cases !== null &&
                    level * 6 + bay * 2 + slot < cases && (
                      <Carton x={x + 3 + slot * 22} y={6} z={7 + level * 21} w={20} d={14} h={15} />
                    ),
                )}
              </g>
            ))}
            {cases === null && <Front x={x + 1} y={22} z={6} w={48} h={56} fill="#84988c" />}
            {repeat(2, (i) => (
              <Box x={x + i * 48} y={21} w={2} d={2} h={65} c={steel} />
            ))}
          </g>
        );
      })}
      {repeat(3, (i) => (
        <Box x={128} y={84 + i * 10} w={52} d={4} h={3} c={wood} />
      ))}
      {repeat(7, (i) => (
        <Box x={128 + i * 7.5} y={84} z={3} w={6.2} d={25} h={2} c={wood} />
      ))}
      {repeat(2, (i) => (
        <Box x={81} y={90 + i * 10} z={2} w={33} d={3.5} h={2} c={beam} />
      ))}
      <Box x={76} y={89} z={2} w={9} d={16} h={8} c={beam} />
      <Line a={[77, 96, 6]} b={[69, 96, 28]} color="#566a60" width="3" />
      <Line a={[69, 91, 28]} b={[69, 101, 28]} color="#566a60" width="3.5" />
    </g>
  );
});
