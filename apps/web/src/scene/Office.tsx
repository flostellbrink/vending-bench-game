import type { Optional } from "games-common/language";

import { useId, memo } from "react";

import { RoomShell, Sunlight, BackWall } from "./Architecture";
import { Machine, type CabinetStock } from "./Cabinet";
import { Furniture } from "./Furniture";
import { Polygon } from "./geometry";
import { Plant } from "./Plant";
import { ServiceVisit, Person, type ServiceMotion } from "./ServiceVisit";
import { StreetTree, Outside } from "./Street";

interface OfficeProps {
  site: string;
  phase: number;
  light: number;
  service: Optional<ServiceMotion>;
  focus: Optional<string>;
  stock: Optional<Record<string, CabinetStock>>;
  weather?: string;
}

export default function Office({
  site,
  light,
  phase,
  service,
  focus,
  stock,
  weather,
}: OfficeProps) {
  const id = useId().replaceAll(":", "");
  const depot = site === "depot",
    communal = site === "main-lounge";
  const x = phase * 33;
  return (
    <svg className="office-drawing" viewBox="14 -11 517 320" role="img" aria-label={site}>
      <defs>
        <clipPath id={id + "floor"}>
          <Polygon
            v={[
              [0, 0, 0],
              [222, 0, 0],
              [222, 145, 0],
              [0, 145, 0],
            ]}
          />
        </clipPath>
      </defs>
      <Outside {...{ phase, light, depot, weather }} />
      {phase > 0.32 && phase < 0.8 && (
        <Person
          x={-15 + ((phase * 24 * 5 + (communal ? 88 : depot ? 126 : 27)) % 220)}
          y={-24}
          walk={phase * 170}
          coat={depot ? "#877861" : "#6f7c86"}
        />
      )}
      <RoomShell id={id} />
      <Sunlight {...{ id, x, light, phase }} />
      <BackWall depot={depot} />
      {!depot &&
        [false, true].map((drink, i) => (
          <Machine
            key={i}
            x={126 + i * 36}
            drink={drink}
            stock={stock?.[drink ? "drinks" : "snack"]}
            open={service?.drink === drink ? service.open : 0}
            selected={focus === (drink ? "DRINKS" : "SNACK")}
          />
        ))}
      <CornerPlant />
      <ServiceVisit service={service} />
      <Furniture site={site} />
      <StreetTree x={-17} y={151} phase={phase} light={light} />
    </svg>
  );
}

const CornerPlant = memo(() => <Plant x={209} y={18} size={1.05} />);
