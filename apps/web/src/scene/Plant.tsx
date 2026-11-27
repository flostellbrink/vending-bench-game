import { project, repeat, type Position } from "./geometry.tsx";

/** Turning each leaf by about the golden angle spreads them evenly around the stem. */
const goldenAngle = 2.4;
/**
 * The leaves of a potted plant. A leaf's reach and height cycle through a few steps. Stem
 * and blade points are fractions of the reach and offsets from the leaf height.
 */
const pottedLeaf = {
  bladeStart: 0.47,
  bladeTip: 1.3,
  count: 15,
  height: -13,
  heightStep: 3,
  heightSteps: 6,
  lowerCurve: 1.35,
  reach: 7,
  reachStep: 2,
  reachSteps: 4,
  stemBend: 0.4,
  stemLift: 6,
  upperCurve: 0.58,
  upperLift: 7,
};
/** The tufts of a border planting, on a flattened spiral, each with a lit top. */
const borderTuft = {
  count: 29,
  highlightLift: 4.2,
  highlightShift: 0.5,
  highlightWidth: 1.7,
  spiralWidth: 2.5,
  width: 2.4,
};

export function Plant({ x, y, size = 1 }: Position & { size?: number }) {
  const [cx, cy] = project([x, y, 0]);
  return (
    <g transform={`translate(${cx} ${cy}) scale(${size})`}>
      <ellipse cx="2" cy="1" rx="10" ry="4" fill="#76806b" opacity=".3" />
      <path d="M-6 -12 Q0 -15 7 -11 L5 0 Q0 3 -4 0Z" fill="#b79b78" />
      <ellipse cy="-11" rx="6.5" ry="3" fill="#493f31" />
      {repeat(pottedLeaf.count, (i) => {
        const dx =
          Math.sin(i * goldenAngle) *
          (pottedLeaf.reach + (i % pottedLeaf.reachSteps) * pottedLeaf.reachStep);
        const dy = pottedLeaf.height - (i % pottedLeaf.heightSteps) * pottedLeaf.heightStep;
        return (
          <g>
            <path
              d={`M0 -10 Q${dx * pottedLeaf.stemBend} ${dy - pottedLeaf.stemLift} ${dx} ${dy}`}
              fill="none"
              stroke="#526348"
              strokeWidth=".9"
            />
            <path
              d={`M${dx * pottedLeaf.bladeStart} ${dy + 2} Q${dx * pottedLeaf.upperCurve} ${dy - pottedLeaf.upperLift} ${dx * pottedLeaf.bladeTip} ${dy - 1} Q${dx * pottedLeaf.lowerCurve} ${dy + 5} ${dx * pottedLeaf.bladeStart} ${dy + 2}`}
              fill={["#647f53", "#3f6550", "#83966a"][i % 3]}
            />
          </g>
        );
      })}
    </g>
  );
}
export function BorderPlanting({ x, y }: Position) {
  const [cx, cy] = project([x, y, 0]);
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse rx="16" ry="6" fill="#e6eadc" />
      {repeat(borderTuft.count, (i) => {
        const dx = Math.sin(i * goldenAngle) * Math.sqrt(i) * borderTuft.spiralWidth;
        const dy = Math.cos(i * goldenAngle) * Math.sqrt(i);
        return (
          <g>
            <ellipse
              cx={dx}
              cy={dy - 3}
              rx={borderTuft.width + (i % 3)}
              ry={2 + (i % 2)}
              fill={["#83917c", "#a1ac93", "#75866f"][i % 3]}
            />
            <ellipse
              cx={dx - borderTuft.highlightShift}
              cy={dy - borderTuft.highlightLift}
              rx={borderTuft.highlightWidth + (i % 2)}
              ry=".9"
              fill="#e3e8d8"
            />
          </g>
        );
      })}
    </g>
  );
}
