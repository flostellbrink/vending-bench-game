import { hoursPerDay, type Optional } from "games-common/language";
import { useId, useMemo, memo } from "react";

import { address } from "@/game/commands.ts";

import { RoomShell, Sunlight, BackWall, WallClock } from "./Architecture.tsx";
import {
  AtriumForecourt,
  AtriumShell,
  AtriumFurniture,
  AtriumOutside,
  AtriumRail,
  concourse,
} from "./Atrium.tsx";
import { cabinetLayout } from "./cabinet-layout.ts";
import { Machine, type CabinetStock } from "./Cabinet.tsx";
import { Depot } from "./Depot.tsx";
import { Furniture } from "./Furniture.tsx";
import { Polygon } from "./geometry.tsx";
import { HouseShell, HouseWorkstations } from "./House.tsx";
import { Plant } from "./Plant.tsx";
import { ServiceVisit, Person, type ServiceMotion } from "./ServiceVisit.tsx";
import { StreetTree, Outside } from "./Street.tsx";

interface OfficeProps {
  slots: Optional<readonly string[]>;
  depotCases: Optional<number>;
  site: string;
  phase: number;
  light: number;
  service: Optional<ServiceMotion>;
  focus: Optional<string>;
  visit: Optional<{ drink: boolean; progress: number }>;
  stock: Optional<Record<string, CabinetStock>>;
  weather?: string;
  machines?: string[];
  onMachineSelect?: (id: string) => void;
}

const room = { depth: 145, width: 222 };
const roomCabinetX = 126;
const cabinetSpacing = 36;
/** The clickable outline of a cabinet: its body from the back face to the front face. */
const cabinetOutline = { back: 11, front: 32, height: 66, width: 32 };
/** A passer-by on the pavement during the day. */
const passerby = {
  appears: 0.32,
  atriumStart: 88,
  depotStart: 126,
  leaves: 0.8,
  offset: -15,
  pacePerHour: 5,
  roomStart: 27,
  strides: 170,
};
const sunDrift = 33;

function passerbyStart(communal: boolean, depot: boolean) {
  if (communal) {
    return passerby.atriumStart;
  }
  return depot ? passerby.depotStart : passerby.roomStart;
}

export default function Office({
  site,
  slots,
  depotCases,
  light,
  phase,
  service,
  focus,
  visit,
  stock,
  weather,
  machines,
  onMachineSelect,
}: OfficeProps) {
  const drawingId = useId().replaceAll(":", "");
  const layouts = useMemo(
    () => ({
      drinks: cabinetLayout(slots ?? [], `${site}.drinks`),
      snack: cabinetLayout(slots ?? [], `${site}.snack`),
    }),
    [slots, site],
  );
  const depot = site === "depot";
  const house = site === "house";
  const communal = site === "main-lounge";
  const width = communal ? concourse.width : room.width;
  const depth = communal ? concourse.depth : room.depth;
  const cabinetsX = communal ? concourse.machineX : roomCabinetX;
  return (
    <svg
      className="office-drawing"
      viewBox={communal ? concourse.viewBox : "14 -11 517 320"}
      role={onMachineSelect && !depot ? "group" : "img"}
      aria-label={site}
    >
      <defs>
        <clipPath id={`${drawingId}floor`}>
          <Polygon
            v={[
              [0, 0, 0],
              [width, 0, 0],
              [width, depth, 0],
              [0, depth, 0],
            ]}
          />
        </clipPath>
      </defs>
      {communal ? (
        <AtriumOutside light={light} phase={phase} weather={weather} />
      ) : (
        <Outside depot={depot} light={light} phase={phase} weather={weather} />
      )}
      {phase > passerby.appears && phase < passerby.leaves && (
        <Person
          x={
            passerby.offset +
            ((phase * hoursPerDay * passerby.pacePerHour + passerbyStart(communal, depot)) %
              (width - 2))
          }
          y={-24}
          walk={phase * passerby.strides}
          coat={depot ? "#877861" : "#6f7c86"}
        />
      )}
      {depot ? (
        <>
          <Depot cases={depotCases} />
          <WallClock phase={phase} />
        </>
      ) : (
        <>
          {communal && <AtriumShell />}
          {house && <HouseShell />}
          {!communal && !house && <RoomShell id={drawingId} />}
          <Sunlight
            id={drawingId}
            x={phase * sunDrift}
            light={light}
            phase={phase}
            atrium={communal}
          />
          {communal ? <AtriumFurniture /> : !house && <BackWall />}
        </>
      )}
      {!depot &&
        [false, true].map((drink, i) => (
          <Machine
            key={i}
            x={cabinetsX + i * cabinetSpacing}
            drink={drink}
            layout={layouts[drink ? "drinks" : "snack"]}
            stock={stock?.[drink ? "drinks" : "snack"]}
            open={service?.drink === drink ? service.open : 0}
            selected={focus === (drink ? "DRINKS" : "SNACK")}
            progress={visit?.drink === drink ? visit.progress : null}
          />
        ))}
      {!communal && !depot && <CornerPlant />}
      <ServiceVisit service={service} atrium={communal} />
      {communal ? (
        <>
          <AtriumRail />
          <AtriumForecourt phase={phase} light={light} />
        </>
      ) : (
        <>
          {house ? <HouseWorkstations /> : !depot && <Furniture site={site} />}
          <StreetTree x={-17} y={151} phase={phase} light={light} />
        </>
      )}
      {!depot &&
        onMachineSelect &&
        machines?.map((id) => {
          const [, kind] = address(id).split(".");
          if (kind !== "snack" && kind !== "drinks") {
            return null;
          }
          const x = cabinetsX + (kind === "drinks" ? cabinetSpacing : 0);
          const selected = focus?.toLowerCase() === kind;
          const { back, front, height } = cabinetOutline;
          const right = x + cabinetOutline.width;
          return (
            <g
              key={id}
              className="cabinet-target"
              role="button"
              tabIndex={0}
              aria-label={address(id)}
              aria-pressed={selected}
              onClick={() => onMachineSelect(id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (!event.repeat) {
                    onMachineSelect(id);
                  }
                }
              }}
            >
              <title>{address(id)}</title>
              <Polygon
                className="cabinet-contour"
                v={[
                  [x, back, height],
                  [right, back, height],
                  [right, back, 0],
                  [right, front, 0],
                  [x, front, 0],
                  [x, front, height],
                ]}
                fill="transparent"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
    </svg>
  );
}

const CornerPlant = memo(function CornerPlant() {
  return <Plant x={209} y={18} size={1.05} />;
});
