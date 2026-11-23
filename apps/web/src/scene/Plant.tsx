import { project, repeat, type Position } from "./geometry";

export function Plant({ x, y, size = 1 }: Position & { size?: number }) {
  const [cx, cy] = project([x, y, 0]);
  return (
    <g transform={`translate(${cx} ${cy}) scale(${size})`}>
      <ellipse cx="2" cy="1" rx="10" ry="4" fill="#76806b" opacity=".3" />
      <path d="M-6 -12 Q0 -15 7 -11 L5 0 Q0 3 -4 0Z" fill="#b79b78" />
      <ellipse cy="-11" rx="6.5" ry="3" fill="#493f31" />
      {repeat(15, (i) => {
        const dx = Math.sin(i * 2.4) * (7 + (i % 4) * 2),
          dy = -13 - (i % 6) * 3;
        return (
          <g>
            <path
              d={`M0 -10 Q${dx * 0.4} ${dy - 6} ${dx} ${dy}`}
              fill="none"
              stroke="#526348"
              strokeWidth=".9"
            />
            <path
              d={`M${dx * 0.47} ${dy + 2} Q${dx * 0.58} ${dy - 7} ${dx * 1.3} ${dy - 1} Q${dx * 1.35} ${dy + 5} ${dx * 0.47} ${dy + 2}`}
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
      {repeat(29, (i) => {
        const dx = Math.sin(i * 2.4) * Math.sqrt(i) * 2.5,
          dy = Math.cos(i * 2.4) * Math.sqrt(i);
        return (
          <g>
            <ellipse
              cx={dx}
              cy={dy - 3}
              rx={2.4 + (i % 3)}
              ry={2 + (i % 2)}
              fill={["#83917c", "#a1ac93", "#75866f"][i % 3]}
            />
            <ellipse cx={dx - 0.5} cy={dy - 4.2} rx={1.7 + (i % 2)} ry=".9" fill="#e3e8d8" />
          </g>
        );
      })}
    </g>
  );
}
