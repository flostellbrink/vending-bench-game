import { Fragment, type ReactNode, type SVGProps } from "react";

export interface Position {
  x: number;
  y: number;
}
export type Vertex = readonly [number, number, number];
export type Point = readonly [number, number];
export type Material = readonly [string, string, string];
type PolygonProps = SVGProps<SVGPolygonElement> & { v: readonly Vertex[] };
type LineProps = SVGProps<SVGLineElement> & {
  a: Vertex;
  b: Vertex;
  color: string;
  width?: number | string;
};

// The drawing uses one 2:1 axonometric projection. All lengths are in drawing units.
export const project = ([x, y, z]: Vertex): Point => [238 + x - y, 98 + (x + y) / 2 - z];
const points = (vertices: readonly Vertex[]) => vertices.map((v) => project(v).join(",")).join(" ");
export const Polygon = ({ v, fill, stroke = "none", ...props }: PolygonProps) => (
  <polygon points={points(v)} fill={fill} stroke={stroke} {...props} />
);
export function Line({ a, b, color, width = 0.7, ...props }: LineProps) {
  const [x1, y1] = project(a),
    [x2, y2] = project(b);
  return <line {...{ x1, y1, x2, y2 }} stroke={color} strokeWidth={width} {...props} />;
}
export const repeat = (n: number, draw: (index: number) => ReactNode) =>
  Array.from({ length: n }, (_, i) => <Fragment key={i}>{draw(i)}</Fragment>);
export const wood: Material = ["#c5a47f", "#a87f60", "#856449"];
export const pine: Material = ["#70867b", "#405b52", "#314b43"];
export const steel: Material = ["#b1b5a2", "#707e74", "#58685f"];
export function Box({
  x,
  y,
  z = 0,
  w,
  d,
  h,
  c,
  edge = false,
}: Position & { z?: number; w: number; d: number; h: number; c: Material; edge?: boolean }) {
  const X = x + w,
    Y = y + d,
    Z = z + h;
  return (
    <g strokeLinejoin="round" strokeWidth=".55">
      <Polygon
        v={[
          [x, Y, z],
          [X, Y, z],
          [X, Y, Z],
          [x, Y, Z],
        ]}
        fill={c[1]}
        stroke={edge ? c[2] : "none"}
      />
      <Polygon
        v={[
          [X, y, z],
          [X, Y, z],
          [X, Y, Z],
          [X, y, Z],
        ]}
        fill={c[2]}
      />
      <Polygon
        v={[
          [x, y, Z],
          [X, y, Z],
          [X, Y, Z],
          [x, Y, Z],
        ]}
        fill={c[0]}
      />
    </g>
  );
}
export function Front({
  x,
  y,
  z,
  w,
  h,
  fill,
}: Position & { z: number; w: number; h: number; fill: string }) {
  return (
    <Polygon
      v={[
        [x, y, z],
        [x + w, y, z],
        [x + w, y, z + h],
        [x, y, z + h],
      ]}
      fill={fill}
    />
  );
}
export function Floor({
  x,
  y,
  w,
  d,
  z = 0.1,
  fill,
}: Position & { z?: number; w: number; d: number; fill: string }) {
  return (
    <Polygon
      v={[
        [x, y, z],
        [x + w, y, z],
        [x + w, y + d, z],
        [x, y + d, z],
      ]}
      fill={fill}
    />
  );
}
