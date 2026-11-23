import { Fragment, memo, useId } from "react";

// The drawing uses one 2:1 axonometric projection. All lengths are in drawing units.
const project = ([x, y, z]) => [238 + x - y, 98 + (x + y) / 2 - z];
const points = (vertices) => vertices.map((v) => project(v).join(",")).join(" ");
const P = ({ v, fill, stroke = "none", ...props }) => (
  <polygon points={points(v)} fill={fill} stroke={stroke} {...props} />
);
function L({ a, b, color, width = 0.7, ...props }) {
  const [x1, y1] = project(a),
    [x2, y2] = project(b);
  return <line {...{ x1, y1, x2, y2 }} stroke={color} strokeWidth={width} {...props} />;
}
const run = (n, draw) => Array.from({ length: n }, (_, i) => <Fragment key={i}>{draw(i)}</Fragment>);
const wood = ["#c5a47f", "#a87f60", "#856449"];
const pine = ["#70867b", "#405b52", "#314b43"];
const steel = ["#b1b5a2", "#707e74", "#58685f"];
function Box({ x, y, z = 0, w, d, h, c, edge = false }) {
  const X = x + w,
    Y = y + d,
    Z = z + h;
  return (
    <g strokeLinejoin="round" strokeWidth=".55">
      <P
        v={[
          [x, Y, z],
          [X, Y, z],
          [X, Y, Z],
          [x, Y, Z],
        ]}
        fill={c[1]}
        stroke={edge ? c[2] : "none"}
      />
      <P
        v={[
          [X, y, z],
          [X, Y, z],
          [X, Y, Z],
          [X, y, Z],
        ]}
        fill={c[2]}
      />
      <P
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
function Front({ x, y, z, w, h, fill }) {
  return (
    <P
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
function Floor({ x, y, w, d, z = 0.1, fill }) {
  return (
    <P
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
function Plant({ x, y, size = 1 }) {
  const [cx, cy] = project([x, y, 0]);
  return (
    <g transform={`translate(${cx} ${cy}) scale(${size})`}>
      <ellipse cx="2" cy="1" rx="10" ry="4" fill="#76806b" opacity=".3" />
      <path d="M-6 -12 Q0 -15 7 -11 L5 0 Q0 3 -4 0Z" fill="#b79b78" />
      <ellipse cy="-11" rx="6.5" ry="3" fill="#493f31" />
      {run(15, (i) => {
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
function Cabinet({ x, drink, open, selected, stock }) {
  const y = 11,
    w = 32,
    d = 21,
    h = 66,
    Y = y + d;
  const ang = open * Math.PI * 0.46;
  const doorPoint = ([u, v]) => [x + 1 + u * Math.cos(ang), Y + 0.5 + u * Math.sin(ang), v];
  const panel = (u, v, width, height, color) => (
    <P
      v={[
        [u, v],
        [u + width, v],
        [u + width, v + height],
        [u, v + height],
      ].map(doorPoint)}
      fill={color}
    />
  );
  const packages = drink
    ? ["#6b9391", "#c7a568", "#a66c51", "#8d9fa7"]
    : ["#d29852", "#b3624e", "#8a9d78", "#cbb76e"];
  return (
    <g>
      <Floor x={x - 1} y={y + 1} w={w + 4} d={d + 4} fill="#8f9684" />
      <Box x={x + 1} y={y + 1} w={w - 2} d={d - 2} h={3} c={pine} />
      <Box {...{ x, y, w, d, h: h - 3 }} z={3} c={pine} edge />
      <Front x={x + 1} y={Y} z={4} w={w - 2} h={h - 6} fill="#263c37" />
      {run(4, (r) => (
        <g>
          {run(3, (c) => {
            const item = stock?.[String.fromCharCode(68 - r) + (c + 1)];
            const z = 20 + r * 8.6,
              left = x + 5 + c * 6.1;
            if (!item?.qty)
              return <Front x={left} y={Y + 0.1} z={z} w={4.9} h={1.2} fill="#53685c" />;
            return (
              <g>
                <Front x={left} y={Y + 0.1} z={z} w={4.8} h={5.5} fill={packages[(r + c) % 4]} />
                <Front x={left + 0.5} y={Y + 0.2} z={z + 1.8} w={3.7} h={1.6} fill="#ece0bf" />
                {drink && (
                  <Front x={left + 1} y={Y + 0.1} z={z + 5.4} w={2.5} h={1.5} fill="#b2bcaf" />
                )}
              </g>
            );
          })}
          <Front x={x + 3} y={Y + 0.3} z={19 + r * 8.6} w={21} h={1} fill="#829288" />
        </g>
      ))}
      {panel(0, 4, 30, 13, "#304d42")}
      {panel(0, 16, 2.8, 41, "#304d42")}
      {panel(23, 16, 7, 41, "#304d42")}
      {panel(0, 55, 30, 10, "#304d42")}
      {panel(1, 57, 28, 6, "#a5b69a")}
      {panel(3, 59, 13, 1.5, "#496551")}
      {(() => {
        const p = project(doorPoint([2, 58])),
          q = project(doorPoint([3, 58]));
        return (
          <text
            transform={`matrix(${q[0] - p[0]} ${q[1] - p[1]} 0 1 ${p[0]} ${p[1]})`}
            fontFamily="monospace"
            fontSize="4"
            fontWeight="bold"
            fill="#203e34"
          >
            {drink ? "KOEL / 02" : "VERS / 01"}
          </text>
        );
      })()}
      <P
        v={[
          [2.8, 17],
          [23, 17],
          [23, 55],
          [2.8, 55],
        ].map(doorPoint)}
        fill="#96bab5"
        opacity=".14"
      />
      <P
        v={[
          [3, 44],
          [10, 55],
          [15, 55],
          [3, 35],
        ].map(doorPoint)}
        fill="#e2f3db"
        opacity=".12"
      />
      {panel(24, 40, 4.4, 7, "#182c29")}
      {panel(24.6, 44, 3, 2, "#a3d5ab")}
      {panel(24, 35, 3.7, 1.3, "#b6c0b5")}
      {panel(5, 8, 17, 5, "#142a25")}
      {run(9, (i) => panel(24 + (i % 3) * 1.4, 37 - Math.floor(i / 3) * 1.4, 0.9, 0.8, "#9cae9e"))}
      {run(3, (i) => panel(3, 4.8 + i * 0.8, 20, 0.28, "#80968a"))}
      {open > 0 && panel(25, 58, 2, 2, "#ffcb74")}
      {selected && (
        <P
          v={[
            [x - 1, Y + 4, 0],
            [x + 7, Y + 4, 0],
            [x + 3, Y + 9, 0],
          ]}
          fill="#437d68"
        />
      )}
    </g>
  );
}
function Window({ id }) {
  const a = project([0, 93, 67]),
    b = project([0, 34, 67]);
  const matrix = `matrix(${(b[0] - a[0]) / 110} ${(b[1] - a[1]) / 110} 0 1 ${a[0]} ${a[1]})`;
  return (
    <g transform={matrix}>
      <defs>
        <clipPath id={id}>
          <rect width="110" height="54" />
        </clipPath>
      </defs>
      <g clipPath={"url(#" + id + ")"}>
        <rect width="110" height="54" fill="#a6c6bd" opacity=".19" />
        <path
          d="M4 40 L37 0 H42 L8 42Z M61 54 L94 12 L99 12 L66 54Z"
          fill="#fff9e9"
          opacity=".25"
        />
      </g>
      <rect width="110" height="54" fill="none" stroke="#566d64" strokeWidth="3" />
      {run(4, (i) => (
        <rect x={21 + i * 23} width="2" height="54" fill="#72867b" />
      ))}
      <rect y="14" width="110" height="2" fill="#74897e" />
      <rect y="53" width="111" height="3" fill="#a0aea0" />
    </g>
  );
}
function StreetTree({ x, y, phase, light }) {
  const [cx, cy] = project([x, y, 0]);
  const branches =
    "M0 0 Q2 -16 -1 -32 T1 -47 M0 -18 L-10 -28 L-16 -43 M-10 -28 L-22 -33 M-15 -38 L-23 -46 M0 -25 L8 -37 L12 -51 M8 -37 L20 -44 M12 -43 L23 -49 M0 -33 L-6 -47 L-5 -57 M-6 -47 L-13 -54 M1 -44 L5 -53";
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <g
        transform={`matrix(.7 .32 ${-0.2 - Math.cos(phase * Math.PI) * 0.8} -.24 1 0)`}
        opacity={light * 0.4}
      >
        <path d={branches} fill="none" stroke="#67726c" strokeWidth="2.5" />
      </g>
      <path d="M-2 0 Q1 -16 -2 -26 L-1 -38 L2 -28 L1 0Z" fill="#716f5f" />
      <path d={branches} fill="none" stroke="#706d5f" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M-14 -40 L-16 -43 M13 -40 L20 -44 M-7 -47 L-13 -54" stroke="#dadfd1" fill="none" />
    </g>
  );
}
function Bicycle({ x, y }) {
  const [cx, cy] = project([x, y, 0]);
  return (
    <g transform={`matrix(.85 .42 0 1 ${cx} ${cy})`}>
      {[0, 18].map((k) => (
        <g key={k}>
          <circle cx={k} cy="-5" r="5.5" fill="none" stroke="#43554e" strokeWidth="1.6" />
          <path d={`M${k - 5} -5 h10 M${k} -10 v10`} stroke="#93a095" strokeWidth=".6" />
        </g>
      ))}
      <path
        d="M0 -5 L5 -13 L10 -5 Z M5 -13 L14 -14 L10 -5 M14 -16 L18 -5 M12 -17 h5 M7 -12 l-2 -4 M2 -16 h6"
        fill="none"
        stroke="#526b63"
        strokeWidth="1.5"
      />
    </g>
  );
}
const Pavement = memo(function Pavement({ weather }) {
  return (
    <g>
      <Box x={-43} y={-45} z={-5} w={285} d={223} h={3} c={["#d8dbd0", "#a4ac9e", "#929f93"]} />
      <Floor x={-43} y={-45} w={265} d={13} z={-1.8} fill="#86958d" />
      {weather==='rainy'&&<g>
        <P v={[[98,150,-1.6],[105,149,-1.6],[122,151,-1.6],[125,154,-1.6],[111,156,-1.6],[97,154,-1.6]]} fill="#a9bdbb"/>
        <L a={[102,152,-1.5]} b={[116,152,-1.5]} color="#e1e7dd" width=".7"/>
        <P v={[[225,24,-1.6],[233,31,-1.6],[231,47,-1.6],[226,49,-1.6],[223,41,-1.6]]} fill="#afc2bf"/>
      </g>}
      {run(15,i=><L a={[-39+i*20,145,-1.7]} b={[-39+i*20,177,-1.7]} color="#b6beb0" width=".55"/>)}
      {run(2,i=><L a={[-42,152+i*17,-1.7]} b={[241,152+i*17,-1.7]} color="#b6beb0" width=".65"/>)}
      {run(12,i=><L a={[222,i*16-14,-1.7]} b={[242,i*16-14,-1.7]} color="#bcc3b5" width=".65"/>)}
      <P v={[[11,153,-1.6],[36,151,-1.6],[43,157,-1.6],[67,157,-1.6],[71,164,-1.6],[42,166,-1.6],[18,163,-1.6]]} fill="#eef0e4"/>
      {run(18, (i) => (
        <L a={[-43 + i * 15, -32, -1.7]} b={[-43 + i * 15, 0, -1.7]} color="#b2bbae" width=".65" />
      ))}
      {run(12, (i) => (
        <L a={[-43, i * 13 - 8, -1.7]} b={[0, i * 13 - 8, -1.7]} color="#aeb9ad" width=".65" />
      ))}
      <L a={[-43, -31, -1.5]} b={[222, -31, -1.5]} color="#eef0df" width="2" />
      {run(8, (i) => (
        <L a={[-40 + i * 34, -41, -1.7]} b={[-25 + i * 34, -41, -1.7]} color="#cfd5c8" width="1" />
      ))}
      <P
        v={[
          [-41, 0, -1.5],
          [-30, 2, -1.5],
          [-25, 25, -1.5],
          [-28, 39, -1.5],
          [-36, 65, -1.5],
          [-41, 70, -1.5],
        ]}
        fill="#e6eada"
      />
    </g>
  );
});

function Outside({ phase, light, depot, weather }) {
  return (
    <g>
      <Pavement weather={weather} />
      {[
        [-23, 26],
        [91, -18],
        [201, -17],
      ].map(([x, y]) => (
        <g key={x}>
          <Floor x={x - 7} y={y - 7} w={14} d={14} fill="#a4b09e" />
          {run(6, (i) => (
            <L a={[x - 6 + i * 2, y - 5, 0.3]} b={[x - 6 + i * 2, y + 5, 0.3]} color="#889488" />
          ))}
          <StreetTree {...{ x, y, phase, light }} />
        </g>
      ))}
      <Box x={19} y={-21} w={2} d={2} h={46} c={steel} />
      <Box x={17} y={-21} z={45} w={9} d={4} h={2} c={steel} />
      <Front x={18} y={-17} z={44.7} w={7} h={1.3} fill={light < 0.25 ? "#fff3ba" : "#c5caba"} />
      {depot ? <Box x={143} y={-24} w={20} d={14} h={10} c={wood} /> : <Bicycle x={145} y={-16} />}
    </g>
  );
}
function Sofa({ x, y, w, orange = false }) {
  const fabric = orange ? ["#c78b69", "#a86950", "#884f40"] : ["#e3dcca", "#d1c8b5", "#aaa996"];
  return (
    <g>
      <Box x={x + 2} y={y + 2} w={w - 4} d={20} h={4} c={wood} />
      <Box x={x} y={y} z={4} w={w} d={24} h={7} c={fabric} />
      <Box x={x + 1} y={y} z={10} w={w - 2} d={5} h={14} c={fabric} />
      {run(3, (i) => (
        <Box
          x={x + 3 + (i * (w - 6)) / 3}
          y={y + 6}
          z={11}
          w={(w - 6) / 3 - 0.7}
          d={16}
          h={3}
          c={fabric}
        />
      ))}
      {run(3, (i) => (
        <P
          v={[
            [x + 3 + (i * (w - 6)) / 3, y + 6, 14],
            [x + 2 + ((i + 1) * (w - 6)) / 3, y + 6, 14],
            [x + 1 + ((i + 1) * (w - 6)) / 3, y + 4, 23],
            [x + 4 + (i * (w - 6)) / 3, y + 4, 23],
          ]}
          fill={fabric[0]}
          stroke={fabric[1]}
          strokeWidth=".65"
        />
      ))}
      {run(2, (i) => (
        <Box x={x + i * (w - 4)} y={y + 1} z={10} w={4} d={23} h={8} c={fabric} />
      ))}
      <P
        v={[
          [x + 8, y + 9, 14],
          [x + 20, y + 9, 14],
          [x + 19, y + 4, 23],
          [x + 9, y + 4, 24],
        ]}
        fill="#647f71"
      />
    </g>
  );
}
function Person({ x, y, walk = 0, coat = "#697f83", facing = 1 }) {
  const [cx, cy] = project([x, y, 0]);
  const step = Math.sin(walk) * 2.1;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${facing * 1.72} 1.72)`}>
      <ellipse cx="1.5" cy=".5" rx="6.6" ry="2.2" fill="#5f7064" opacity=".3" />
      <path
        d={`M-2 -13 L${-2 - step} -5 L${-2 - step * 1.35} -1 M2 -13 L${2 + step * 0.5} -7 L${2 + step * 1.35} -1`}
        fill="none"
        stroke="#43545a"
        strokeWidth="2.7"
      />
      <path
        d={`M${-3 - step * 1.35} -.6 h3 M${1 + step * 1.35} -.6 h3`}
        stroke="#364744"
        strokeWidth="1.6"
      />
      <path d="M-3.8 -24 Q-.5 -26 3 -23 L4.5 -12 Q1 -10 -4 -12Z" fill={coat} />
      <path d="M-3 -22 L-4 -17 L-1 -14" fill="none" stroke="#526567" strokeWidth="2.2" />
      <path d="M1 -24 L3 -22 L1 -17" stroke="#c3ad88" strokeWidth="1.5" fill="none" />
      <path d="M-2 -29 Q1 -31 3 -28 L3 -26 L4 -25.5 L2 -24 L-.5 -24 L-2 -26Z" fill="#bd957c" />
      <path d="M-2.6 -27 Q-3 -30 0 -30.5 Q3 -31 3.4 -28 L.5 -28 L-.8 -26Z" fill="#58554b" />
    </g>
  );
}
function CafeSet({x,y}) {
  const [cx,cy]=project([x,y,0]);
  return <g transform={`translate(${cx} ${cy})`}>
    {[-20,20].map(side=><g key={side} transform={`translate(${side} ${side<0?-4:5})`}>
      <path d="M-5 -10 L-7 0 M4 -10 L7 1 M-2 -9 L-1 3" fill="none" stroke="#6b7567" strokeWidth="1.1"/>
      <ellipse rx="7" ry="3.4" cy="-10" fill="#b89d74"/>
      <path d={side<0?"M-6 -11 Q-11 -17 -7 -22 Q-4 -23 -2 -21 L-2 -12Z":"M3 -9 L6 -18 Q10 -24 12 -19 Q12 -11 8 -8Z"} fill="#a97655" stroke="#866448" strokeWidth=".65"/>
    </g>)}
    <ellipse rx="9" ry="4" fill="#7b8879" opacity=".27"/>
    <ellipse rx="5.5" ry="2.3" fill="#6c786c"/>
    <path d="M-1 0 V-18 H1 V0Z" fill="#788579"/>
    <ellipse rx="15" ry="7.5" cy="-17" fill="#9e896a"/>
    <ellipse rx="15" ry="7.5" cy="-18.5" fill="#d6bc91" stroke="#b39b76" strokeWidth=".6"/>
    <ellipse rx="3.1" ry="1.4" cx="4" cy="-18.8" fill="#ece5ce"/>
    <path d="M2 -21 h4 l-.5 2.4 q-1.5 1 -3 0Z" fill="#eae0c6"/>
    <ellipse rx="1.7" ry=".65" cx="4" cy="-21" fill="#76654e"/>
  </g>;
}
function BorderPlanting({x,y}){
  const [cx,cy]=project([x,y,0]);
  return <g transform={`translate(${cx} ${cy})`}>
    <ellipse rx="16" ry="6" fill="#e6eadc"/>
    {run(29,i=>{
      const dx=Math.sin(i*2.4)*Math.sqrt(i)*2.5,dy=Math.cos(i*2.4)*Math.sqrt(i);
      return <g><ellipse cx={dx} cy={dy-3} rx={2.4+i%3} ry={2+i%2} fill={['#83917c','#a1ac93','#75866f'][i%3]}/>
        <ellipse cx={dx-.5} cy={dy-4.2} rx={1.7+i%2} ry=".9" fill="#e3e8d8"/></g>;
    })}
  </g>;
}
function ServiceVisit({ service }) {
  if (!service) return null;
  const x = service.drink ? 177 : 141;
  const offset = Math.max(0, 1 - Math.min(service.progress, 1 - service.progress) * 5);
  const y = 49 + offset * 37;
  return (
    <g>
      <Box x={x + 8} y={y + 4} w={13} d={8} z={2} h={2} c={steel} />
      <Box x={x + 9} y={y + 5} w={10} d={7} z={4} h={7} c={wood} />
      <L a={[x + 20, y + 5, 3]} b={[x + 20, y + 5, 31]} color="#586c63" width="1.5" />
      <L a={[x + 20, y + 5, 31]} b={[x + 20, y + 11, 31]} color="#67796e" width="1.5" />
      <Person x={x + 5} y={y + 9} walk={offset * 12} coat="#697e69" />
    </g>
  );
}
function Table({ x, y, w, d, h = 16 }) {
  return (
    <g>
      {[2, w - 4].map((i) =>
        [2, d - 4].map((j) => (
          <Box key={i + "," + j} x={x + i} y={y + j} w={2} d={2} h={h} c={pine} />
        )),
      )}
      <Box {...{ x, y, w, d }} z={h} h={2.5} c={wood} />
      {run(4, (i) => (
        <L
          a={[x + 4, y + 2 + (i * d) / 5, h + 2.6]}
          b={[x + w - 3 - i, y + 2 + (i * d) / 5, h + 2.6]}
          color="#b99673"
          width=".4"
        />
      ))}
      <Box
        x={x + w * 0.4}
        y={y + d * 0.4}
        z={h + 2.6}
        w={9}
        d={6}
        h={1.2}
        c={["#ede4c9", "#d0c0a5", "#9aab9c"]}
      />
      <Box x={x + w * 0.6} y={y + d * 0.25} z={h + 2.6} w={3} d={3} h={3.7} c={steel} />
    </g>
  );
}
function DeskTerminal({ x, y, z }) {
  const shell = ["#d9d7bf", "#bcbda8", "#949e8d"];
  return (
    <g>
      <Box x={x + 2} y={y + 1} z={z} w={14} d={10} h={2} c={shell} />
      <Box {...{ x, y }} z={z + 2} w={18} d={12} h={14} c={shell} />
      <Front x={x + 1.5} y={y + 12.1} z={z + 5} w={14.8} h={9.5} fill="#67776c" />
      <Front x={x + 2.4} y={y + 12.2} z={z + 6} w={13.1} h={7.8} fill="#314a43" />
      {run(3, (i) => (
        <Front
          x={x + 3.4}
          y={y + 12.3}
          z={z + 11.8 - i * 1.65}
          w={4 + (i % 2) * 4}
          h={0.5}
          fill="#a0ba9b"
        />
      ))}
      <Box x={x - 1} y={y + 16} z={z} w={17} d={5} h={1} c={shell} />
      {run(3, (i) => (
        <L
          a={[x, y + 16.7 + i * 1.2, z + 1.1]}
          b={[x + 14, y + 16.7 + i * 1.2, z + 1.1]}
          color="#838e7e"
          width=".55"
        />
      ))}
    </g>
  );
}
function Carton({ x, y, z = 0, w = 22, d = 16, h = 14 }) {
  return (
    <g>
      <Box {...{ x, y, z, w, d, h }} c={["#c69e70", "#b68a5b", "#9d744f"]} edge />
      <Floor x={x + w * 0.43} y={y} z={z + h + 0.15} w={w * 0.14} d={d} fill="#dbc296" />
      <Front x={x + w * 0.43} y={y + d + 0.1} z={z + h - 4} w={w * 0.14} h={4} fill="#ceb080" />
      <Front x={x + 2} y={y + d + 0.1} z={z + 3} w={w * 0.3} h={4} fill="#ece4c9" />
      {run(4, (i) => (
        <Front x={x + 2.7 + i} y={y + d + 0.2} z={z + 3.6} w={0.4} h={2.5} fill="#655e4c" />
      ))}
    </g>
  );
}
function Pallet({ x, y }) {
  return (
    <g>
      {run(3, (i) => (
        <Box x={x} y={y + i * 10} w={44} d={4} h={3} c={wood} />
      ))}
      {run(6, (i) => (
        <Box x={x + i * 7.2} y={y} z={3} w={6.1} d={25} h={1.5} c={wood} />
      ))}
      {run(4, (i) => (
        <Carton
          x={x + 1 + (i % 2) * 20}
          y={y + 1 + Math.floor(i / 2) * 12}
          z={4.5}
          w={19}
          d={11}
          h={13}
        />
      ))}
      <Carton x={x + 1} y={y + 1} z={17.5} w={19} d={11} h={12} />
    </g>
  );
}
function ContactShadow({ x, y, w, d, amount }) {
  return (
    <P
      v={[
        [x, y, 0.12],
        [x + w, y, 0.12],
        [x + w + amount, y + d + 4, 0.12],
        [x + amount, y + d + 4, 0.12],
      ]}
      fill="#536154"
      opacity=".19"
    />
  );
}
function Shelves({ x, y, stock = false }) {
  return (
    <g>
      {run(2, (i) => (
        <Box x={x + i * 29} y={y} w={2} d={12} h={49} c={wood} />
      ))}
      {run(4, (r) => (
        <g>
          <Box x={x} y={y} z={3 + r * 14} w={32} d={12} h={2} c={wood} />
          {stock
            ? run(3, (i) => <Carton x={x + 2 + i * 9} y={y + 2} z={5 + r * 14} w={8} d={9} h={9} />)
            : run(7, (i) => (
                <g>
                  <Box
                    x={x + 2 + i * 3.8}
                    y={y + 2}
                    z={5 + r * 14}
                    w={2.8}
                    d={6}
                    h={7 + (i % 4)}
                    c={[steel, pine, wood][(i + r) % 3]}
                  />
                  <Front
                    x={x + 2.3 + i * 3.8}
                    y={y + 8.1}
                    z={7 + r * 14}
                    w={2}
                    h={0.65}
                    fill="#dfd6bc"
                  />
                </g>
              ))}
        </g>
      ))}
    </g>
  );
}
function WallClock({ phase }) {
  const [x, y] = project([35, 1, 62]);
  return (
    <g transform={`matrix(1 .5 0 1 ${x} ${y})`}>
      <circle r="8.2" fill="#5a6b62" />
      <circle r="7" fill="#efe9d5" />
      {run(12, (i) => (
        <path
          transform={"rotate(" + 30 * i + ")"}
          d="M0 -6.6 v1"
          stroke="#758078"
          strokeWidth=".65"
        />
      ))}
      <path
        transform={"rotate(" + phase * 720 + ")"}
        d="M0 1 V-3.8"
        stroke="#37483f"
        strokeWidth="1.1"
      />
      <path
        transform={"rotate(" + phase * 8640 + ")"}
        d="M0 1 V-5.5"
        stroke="#45584d"
        strokeWidth=".7"
      />
    </g>
  );
}
export default function Office({ site, light, phase, service, focus, stock, weather }) {
  const id = useId().replaceAll(":", "");
  const depot = site === "depot",
    communal = site === "main-lounge";
  const x = phase * 33;
  return (
    <svg className="office-drawing" viewBox="14 -11 517 320" role="img" aria-label={site}>
      <defs>
        <clipPath id={id + "floor"}>
          <P
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
      {!depot && [false, true].map((drink, i) => (
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
      <StreetTree x={-17} y={151} phase={phase} light={light}/>
    </svg>
  );
}

const Machine = memo(Cabinet);
const CornerPlant = memo(() => <Plant x={209} y={18} size={1.05} />);

export const RoomPreview = memo(function RoomPreview({ site }) {
  const depot = site === "depot";
  return (
    <svg className="office-drawing" viewBox="75 4 408 285" aria-hidden="true">
      <Box x={0} y={0} z={-5} w={222} d={145} h={5} c={["#d2d0b9", "#a6ad9d", "#929f93"]} />
      <Box x={-3} y={0} w={3} d={145} h={76} c={["#e3dac5", "#bdbba9", "#dfd8c2"]} />
      <Box x={0} y={-3} w={222} d={3} h={76} c={["#f0e9d6", "#e8dfca", "#b4b9a8"]} />
      <P v={[[1,35,19],[1,92,19],[1,92,62],[1,35,62]]} fill="#a1b6b2" stroke="#657e77" />
      <L a={[1,64,19]} b={[1,64,62]} color="#637b72" width="2" />
      {depot ? (
        <>
          {run(3, i => <Box x={64 + 42*i} y={5} w={34} d={16} h={52} c={wood} />)}
          <Carton x={35} y={68} w={36} d={22} h={20} />
          <Carton x={97} y={96} w={40} d={25} h={27} />
        </>
      ) : (
        <>
          {run(2, i => (
            <>
              <Box x={126 + 36*i} y={6} w={31} d={23} h={58} c={pine} />
              <Front x={129 + 36*i} y={29.2} z={23} w={20} h={29} fill="#98aaa1" />
              <Front x={132 + 36*i} y={29.2} z={8} w={17} h={4} fill="#263f37" />
            </>
          ))}
          {site === "main-lounge" ? (
            <>
              <Table x={49} y={53} w={87} d={32} h={24} />
              {run(3, i => <Box x={49 + 32*i} y={100} w={22} d={18} h={17} c={wood} />)}
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

const RoomShell = memo(function RoomShell({ id }) {
  return <>
      <Box x={0} y={0} z={-4} w={222} d={145} h={4} c={["#d2d0b9", "#9a9e8d", "#7f8c81"]} />
      {run(11, (i) => (
        <L a={[i * 21, 0, 0]} b={[i * 21, 145, 0]} color="#afb3a0" width=".55" />
      ))}
      {run(7, (i) => (
        <L a={[0, i * 21, 0]} b={[222, i * 21, 0]} color="#b5b9a5" width=".55" />
      ))}
      <Box x={-3} y={0} w={3} d={145} h={13} c={["#d1c7ae", "#adac98", "#e5dcc6"]} />
      <Box x={-3} y={0} w={3} d={34} h={84} c={["#e3dac5", "#bdbba9", "#dfd8c2"]} />
      <Box x={-3} y={93} w={3} d={52} h={84} c={["#e3dac5", "#bdbba9", "#dfd8c2"]} />
      <Box x={-3} y={34} z={67} w={3} d={59} h={17} c={["#e3dac5", "#bdbba9", "#dfd8c2"]} />
      <Box x={0} y={-3} w={222} d={3} h={84} c={["#f0e9d6", "#e8dfca", "#b4b9a8"]} />
      {run(11,i=><L a={[8+i*20,.1,6]} b={[8+i*20,.1,82]} color="#d8cdb7" width=".55"/>)}
      <L a={[0,.2,81]} b={[222,.2,81]} color="#fff5df" width="1.3"/>
      <Window id={id + "window"} />
      <L a={[0, 0, 4]} b={[222, 0, 4]} color="#95a38e" width="2" />
      <L a={[0, 0, 4]} b={[0, 145, 4]} color="#98a490" width="2" />
  </>;
});

function Sunlight({ id, x, light, phase }) {
  return <>
      <g clipPath={"url(#" + id + "floor)"} opacity={light * 0.64}>
        {run(5, (i) => (
          <P
            v={[
              [0, 8 + i * 22, 0],
              [0, 28 + i * 22, 0],
              [61 + x, 43 + i * 22 - x * 0.6, 0],
              [61 + x, 23 + i * 22 - x * 0.6, 0],
            ]}
            fill="#fff2c8"
          />
        ))}
      </g>
      <ContactShadow x={125} y={13} w={68} d={21} amount={4 + 15 * Math.cos(phase * Math.PI)} />
      <ContactShadow x={67} y={6} w={31} d={12} amount={2 + 9 * Math.cos(phase * Math.PI)} />
      <WallClock phase={phase} />
  </>;
}

const BackWall = memo(function BackWall({ depot }) {
  return <>
      <Front x={22} y={0.5} z={22} w={26} h={23} fill="#a89577" />
      {run(5, (i) => (
        <g>
          <Front
            x={24 + (i % 3) * 7}
            y={1}
            z={33 - Math.floor(i / 3) * 9}
            w={6}
            h={8}
            fill={["#e5dfcd", "#c0ceba", "#e2cf9b"][i % 3]}
          />
          <Front
            x={25 + (i % 3) * 7}
            y={1.1}
            z={38 - Math.floor(i / 3) * 9}
            w={3.8}
            h={0.5}
            fill="#879381"
          />
        </g>
      ))}
      <Shelves x={66} y={3} stock={depot} />
      {depot && (
        <g>
          <Shelves x={118} y={6} stock />
          <Shelves x={162} y={6} stock />
        </g>
      )}
  </>;
});

const Furniture = memo(function Furniture({ site }) {
  const depot = site === "depot", communal = site === "main-lounge";
  return <>
      {depot ? (
        <g>
          <Pallet x={33} y={68} />
          <Pallet x={95} y={92} />
        </g>
      ) : communal ? (
        <g>
          <Table x={50} y={55} w={85} d={33} h={24} />
          {run(3, (i) => (
            <Sofa x={48 + i * 32} y={99} w={26} />
          ))}
        </g>
      ) : (
        <g>
          <Floor x={24} y={47} w={97} d={60} fill="#a4ad98" />
          {run(16, (i) => (
            <L
              a={[25, 48 + i * 3.6, 0.2]}
              b={[120, 48 + i * 3.6, 0.2]}
              color="#b8bba6"
              width=".6"
            />
          ))}
          <ContactShadow x={27} y={44} w={72} d={23} amount={5} />
          <Sofa x={28} y={43} w={70} orange={site === "lounge"} />
          <ContactShadow x={45} y={81} w={44} d={17} amount={2} />
          <Table x={47} y={83} w={43} d={16} h={12} />
        </g>
      )}
      {site === "house" && (
        <g>
          <Table x={135} y={77} w={52} d={28} h={23} />
          <DeskTerminal x={146} y={78} z={25.5} />
        </g>
      )}
      {site==="lounge"&&<CafeSet x={132} y={94}/>}
      <Plant x={13} y={125} size={1.15} />
      <Box x={168} y={109} w={36} d={6} h={9} c={wood} />
      {run(3, (i) => (
        <Plant x={172 + i * 12} y={112} size={0.48} />
      ))}
      <Box x={0} y={143} w={150} d={2} h={8} c={["#e6ddc5","#c5c4b0","#a4ae9d"]}/>
      <Box x={189} y={143} w={33} d={2} h={8} c={["#e6ddc5","#c5c4b0","#a4ae9d"]}/>
      <Box x={220} y={0} w={2} d={145} h={9} c={["#e6ddc5","#c5c4b0","#a4ae9d"]}/>
      <BorderPlanting x={77} y={160}/>
      <BorderPlanting x={215} y={157}/>
  </>;
});
