import type { Optional } from "games-common/language";

import { useId, memo } from "react";

import { RoomShell, Sunlight, BackWall, WallClock } from "./Architecture";
import {
  AtriumForecourt,
  AtriumShell,
  AtriumFurniture,
  AtriumOutside,
  AtriumRail,
  concourse,
} from "./Atrium";
import { Machine, type CabinetStock } from "./Cabinet";
import { Depot } from "./Depot";
import { Furniture } from "./Furniture";
import { Polygon } from "./geometry";
import { HouseShell, HouseWorkstations } from "./House";
import { Plant } from "./Plant";
import { ServiceVisit, Person, type ServiceMotion } from "./ServiceVisit";
import { StreetTree, Outside } from "./Street";

interface OfficeProps {
  depotCases: number | null;
  site: string;
  phase: number;
  light: number;
  service: Optional<ServiceMotion>;
  focus: Optional<string>;
  visit: Optional<{ drink: boolean; progress: number }>;
  stock: Optional<Record<string, CabinetStock>>;
  weather?: string;
}

export default function Office({
  site,
  depotCases,
  light,
  phase,
  service,
  focus,
  visit,
  stock,
  weather,
}: OfficeProps) {
  const id = useId().replaceAll(":", "");
  const depot = site === "depot",
    house = site === "house",
    communal = site === "main-lounge";
  const x = phase * 33;
  const width = communal ? concourse.width : 222;
  const depth = communal ? concourse.depth : 145;
  return (
    <svg
      className="office-drawing"
      viewBox={communal ? concourse.viewBox : "14 -11 517 320"}
      role="img"
      aria-label={site}
    >
      <defs>
        <clipPath id={id + "floor"}>
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
        <AtriumOutside {...{ phase, light, weather }} />
      ) : (
        <Outside {...{ phase, light, depot, weather }} />
      )}
      {phase > 0.32 && phase < 0.8 && (
        <Person
          x={-15 + ((phase * 24 * 5 + (communal ? 88 : depot ? 126 : 27)) % (width - 2))}
          y={-24}
          walk={phase * 170}
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
          {communal ? <AtriumShell /> : house ? <HouseShell /> : <RoomShell id={id} />}
          <Sunlight {...{ id, x, light, phase }} atrium={communal} />
          {communal ? <AtriumFurniture /> : !house && <BackWall />}
        </>
      )}
      {!depot &&
        [false, true].map((drink, i) => (
          <Machine
            key={i}
            x={(communal ? concourse.machineX : 126) + i * 36}
            drink={drink}
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
    </svg>
  );
}

const CornerPlant = memo(() => <Plant x={209} y={18} size={1.05} />);
