import { memo } from "react";

import { AtriumShell, AtriumRail, AtriumFurniture, concourse } from "./Atrium";
import { Carton, Sofa, Table } from "./Furniture";
import { Box, Front, Line, Polygon, repeat, wood, pine } from "./geometry";

export const RoomPreview = memo(function RoomPreview({ site }: { site: string }) {
  const depot = site === "depot";
  const atrium = site === "main-lounge";
  return (
    <svg
      className="office-drawing"
      viewBox={atrium ? concourse.previewBox : "75 4 408 285"}
      aria-hidden="true"
    >
      {atrium ? (
        <AtriumShell />
      ) : (
        <>
          <Box x={0} y={0} z={-5} w={222} d={145} h={5} c={["#d2d0b9", "#a6ad9d", "#929f93"]} />
          <Box x={-3} y={0} w={3} d={145} h={76} c={["#e3dac5", "#bdbba9", "#dfd8c2"]} />
          <Box x={0} y={-3} w={222} d={3} h={76} c={["#f0e9d6", "#e8dfca", "#b4b9a8"]} />
          <Polygon
            v={[
              [1, 35, 19],
              [1, 92, 19],
              [1, 92, 62],
              [1, 35, 62],
            ]}
            fill="#a1b6b2"
            stroke="#657e77"
          />
          <Line a={[1, 64, 19]} b={[1, 64, 62]} color="#637b72" width="2" />
        </>
      )}
      {depot ? (
        <>
          {repeat(3, (i) => (
            <Box x={64 + 42 * i} y={5} w={34} d={16} h={52} c={wood} />
          ))}
          <Carton x={35} y={68} w={36} d={22} h={20} />
          <Carton x={97} y={96} w={40} d={25} h={27} />
        </>
      ) : (
        <>
          {repeat(2, (i) => (
            <>
              <Box
                x={(atrium ? concourse.machineX : 126) + 36 * i}
                y={6}
                w={31}
                d={23}
                h={58}
                c={pine}
              />
              <Front
                x={(atrium ? concourse.machineX : 126) + 3 + 36 * i}
                y={29.2}
                z={23}
                w={20}
                h={29}
                fill="#98aaa1"
              />
              <Front
                x={(atrium ? concourse.machineX : 126) + 6 + 36 * i}
                y={29.2}
                z={8}
                w={17}
                h={4}
                fill="#263f37"
              />
            </>
          ))}
          {atrium ? (
            <>
              <AtriumFurniture />
              <AtriumRail />
            </>
          ) : (
            <>
              <Sofa x={28} y={43} w={70} orange={site === "lounge"} />
              <Table x={47} y={83} w={43} d={16} h={12} />
              {site === "house" && <Table x={135} y={77} w={52} d={28} h={23} />}
            </>
          )}
        </>
      )}
    </svg>
  );
});
