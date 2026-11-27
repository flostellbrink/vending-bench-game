import { memo, type ComponentProps } from "react";

import { AtriumShell, AtriumRail, AtriumFurniture, concourse } from "./Atrium.tsx";
import { Depot } from "./Depot.tsx";
import { Sofa, Table } from "./Furniture.tsx";
import { Box, Front, Line, Polygon, repeat, pine } from "./geometry.tsx";
import { HouseShell, HouseWorkstations } from "./House.tsx";

const roomBox = "75 4 408 285";
/** The left wall window of a plain office: its edges on the wall and its centre bar. */
const sideWindow = { bar: 64, head: 62, left: 35, right: 92, sill: 19, wall: 1 };
/** The vending cabinets stand in a row along the back wall. */
const plainOffice = { cabinetPitch: 36, firstCabinet: 126 };
/** The product window and the delivery tray, measured from the cabinet's left side. */
const cabinetFront = { trayInset: 6, windowInset: 3 };

function OfficeShell({ site }: { site: string }) {
  if (site === "main-lounge") {
    return <AtriumShell />;
  }
  if (site === "house") {
    return <HouseShell />;
  }
  return (
    <>
      <Box x={0} y={0} z={-5} w={222} d={145} h={5} c={["#d2d0b9", "#a6ad9d", "#929f93"]} />
      <Box x={-3} y={0} w={3} d={145} h={76} c={["#e3dac5", "#bdbba9", "#dfd8c2"]} />
      <Box x={0} y={-3} w={222} d={3} h={76} c={["#f0e9d6", "#e8dfca", "#b4b9a8"]} />
      <Polygon
        v={[
          [sideWindow.wall, sideWindow.left, sideWindow.sill],
          [sideWindow.wall, sideWindow.right, sideWindow.sill],
          [sideWindow.wall, sideWindow.right, sideWindow.head],
          [sideWindow.wall, sideWindow.left, sideWindow.head],
        ]}
        fill="#a1b6b2"
        stroke="#657e77"
      />
      <Line
        a={[sideWindow.wall, sideWindow.bar, sideWindow.sill]}
        b={[sideWindow.wall, sideWindow.bar, sideWindow.head]}
        color="#637b72"
        width="2"
      />
    </>
  );
}

function OfficeSeating({ site }: { site: string }) {
  if (site === "main-lounge") {
    return <AtriumRail />;
  }
  if (site === "house") {
    return <HouseWorkstations />;
  }
  return (
    <>
      <Sofa x={28} y={43} w={70} orange={site === "lounge"} />
      <Table x={47} y={83} w={43} d={16} h={12} />
    </>
  );
}

export const RoomPreview = memo(function RoomPreview({
  site,
  depotCases,
}: {
  site: string;
  depotCases: ComponentProps<typeof Depot>["cases"];
}) {
  if (site === "depot") {
    return (
      <svg className="office-drawing" viewBox={roomBox} aria-hidden="true">
        <Depot cases={depotCases} />
      </svg>
    );
  }
  const atrium = site === "main-lounge";
  const firstCabinet = atrium ? concourse.machineX : plainOffice.firstCabinet;
  return (
    <svg
      className="office-drawing"
      viewBox={atrium ? concourse.previewBox : roomBox}
      aria-hidden="true"
    >
      <OfficeShell site={site} />
      <>
        {atrium && <AtriumFurniture />}
        {repeat(2, (i) => {
          const cabinetX = firstCabinet + plainOffice.cabinetPitch * i;
          return (
            <>
              <Box x={cabinetX} y={6} w={31} d={23} h={58} c={pine} />
              <Front
                x={cabinetX + cabinetFront.windowInset}
                y={29.2}
                z={23}
                w={20}
                h={29}
                fill="#98aaa1"
              />
              <Front
                x={cabinetX + cabinetFront.trayInset}
                y={29.2}
                z={8}
                w={17}
                h={4}
                fill="#263f37"
              />
            </>
          );
        })}
        <OfficeSeating site={site} />
      </>
    </svg>
  );
});
