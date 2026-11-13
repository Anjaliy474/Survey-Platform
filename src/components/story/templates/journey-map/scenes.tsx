/* Journey Map scenes: a trail through one place, drawn in a 400×700 portrait box.
 * The focus sits in the top half; the question card covers the lower half on phones. */

const Hills = ({ y, fill, amp = 30, cls = "layer" }: { y: number; fill: string; amp?: number; cls?: string }) => (
  <path className={cls} d={`M0 ${y} Q 70 ${y - amp} 140 ${y - 6} T 280 ${y - 10} T 400 ${y - amp / 2} V 700 H 0 Z`} fill={fill} />
);

const Trail = ({ y = 330 }: { y?: number }) => (
  <path
    d={`M-20 ${y + 200} C 80 ${y + 120}, 120 ${y + 60}, 200 ${y + 40} S 330 ${y - 10}, 420 ${y - 20}`}
    fill="none"
    stroke="var(--st-glow)"
    strokeOpacity="0.55"
    strokeWidth="14"
    strokeLinecap="round"
    strokeDasharray="2 20"
  />
);

const Gloss = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
  <ellipse className="gloss" cx={x + w * 0.32} cy={y + h * 0.25} rx={w * 0.3} ry={h * 0.18} fill="url(#gloss)" />
);

function Lantern({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="sway" style={{ animationDelay: `${delay}s` }}>
        <line x1="0" y1="-18" x2="0" y2="-4" stroke="var(--st-near)" strokeWidth="1.5" />
        <rect x="-9" y="-4" width="18" height="24" rx="8" fill="var(--st-accent)" />
        <rect x="-9" y="-4" width="18" height="24" rx="8" fill="var(--st-glow)" opacity="0.35" />
      </g>
    </g>
  );
}

function Gate() {
  return (
    <g>
      <Hills y={300} fill="var(--st-far)" />
      <g className="layer">
        <rect x="90" y="150" width="26" height="230" rx="8" fill="var(--st-near)" />
        <rect x="284" y="150" width="26" height="230" rx="8" fill="var(--st-near)" />
        <path d="M80 160 Q 200 70 320 160 L 320 182 Q 200 100 80 182 Z" fill="var(--st-detail)" />
        <rect x="140" y="128" width="120" height="34" rx="10" fill="var(--st-accent)" />
        <Gloss x={140} y={128} w={120} h={34} />
      </g>
      {[110, 150, 200, 250, 290].map((x, i) => (
        <Lantern key={x} x={x} y={200 + (i % 2) * 10} s={0.9} delay={i * 0.4} />
      ))}
      <Hills y={430} fill="var(--st-ground)" amp={16} />
      <Trail y={360} />
    </g>
  );
}

function MarketStreet() {
  const stall = (x: number, y: number, flip: boolean, i: number) => (
    <g key={x} className="layer" transform={`translate(${x} ${y})`}>
      <rect x="0" y="40" width="96" height="80" rx="6" fill="var(--st-near)" />
      <path d={flip ? "M-6 44 L 102 44 L 92 6 L 4 6 Z" : "M-6 44 L 102 44 L 92 6 L 4 6 Z"} fill={i % 2 ? "var(--st-detail)" : "var(--st-accent)"} />
      {Array.from({ length: 5 }, (_, k) => (
        <rect key={k} x={6 + k * 18} y="6" width="9" height="38" fill="var(--st-glow)" opacity="0.35" />
      ))}
      <rect x="10" y="64" width="76" height="10" rx="4" fill="var(--st-glow)" opacity="0.5" />
      <Gloss x={-6} y={6} w={108} h={38} />
    </g>
  );
  return (
    <g>
      <Hills y={250} fill="var(--st-far)" />
      {stall(-20, 170, false, 0)}
      {stall(150, 150, false, 1)}
      {stall(310, 175, true, 2)}
      <path d="M0 120 Q 200 170 400 120" fill="none" stroke="var(--st-near)" strokeWidth="1.2" />
      {[40, 100, 160, 220, 280, 340].map((x, i) => (
        <Lantern key={x} x={x} y={140 + Math.sin(i) * 8} s={0.8} delay={i * 0.3} />
      ))}
      <Hills y={400} fill="var(--st-ground)" amp={10} />
      <Trail y={340} />
    </g>
  );
}

function Riverside() {
  return (
    <g>
      <Hills y={230} fill="var(--st-far)" />
      <Hills y={290} fill="var(--st-mid)" amp={20} />
      <path className="layer" d="M0 300 C 120 280, 260 330, 400 300 V 420 C 260 450, 120 400, 0 430 Z" fill="var(--st-accent)" opacity="0.55" />
      {[0, 1, 2, 3].map((k) => (
        <path key={k} className="drift" style={{ animationDelay: `${-k * 3}s` }} d={`M${30 + k * 90} ${340 + (k % 2) * 30} q 14 -6 28 0`} fill="none" stroke="var(--st-glow)" strokeWidth="2" strokeLinecap="round" />
      ))}
      <g className="layer">
        <path d="M120 330 Q 200 260 280 330" fill="none" stroke="var(--st-near)" strokeWidth="12" strokeLinecap="round" />
        {[140, 170, 200, 230, 260].map((x) => (
          <line key={x} x1={x} y1={300 + Math.abs(200 - x) * 0.35} x2={x} y2="338" stroke="var(--st-near)" strokeWidth="4" />
        ))}
      </g>
      <Hills y={460} fill="var(--st-ground)" amp={12} />
      <Trail y={380} />
    </g>
  );
}

function HillPath() {
  return (
    <g>
      <Hills y={200} fill="var(--st-far)" amp={60} />
      <Hills y={300} fill="var(--st-mid)" amp={40} />
      {[60, 120, 310, 350].map((x, i) => (
        <g key={x} className="layer" transform={`translate(${x} ${250 + (i % 2) * 30})`}>
          <rect x="-4" y="20" width="8" height="30" fill="var(--st-near)" />
          <circle cx="0" cy="12" r="22" fill="var(--st-near)" />
          <Gloss x={-22} y={-10} w={44} h={44} />
        </g>
      ))}
      <path d="M200 420 C 150 370, 260 330, 210 280 S 180 200, 220 160" fill="none" stroke="var(--st-glow)" strokeOpacity="0.6" strokeWidth="10" strokeLinecap="round" strokeDasharray="2 18" />
      <Hills y={450} fill="var(--st-ground)" amp={14} />
    </g>
  );
}

function StageSquare() {
  return (
    <g>
      <path d="M150 0 L 110 330 L 190 330 Z" fill="var(--st-glow)" opacity="0.18" />
      <path d="M250 0 L 210 330 L 290 330 Z" fill="var(--st-glow)" opacity="0.18" />
      <g className="layer">
        <rect x="60" y="200" width="280" height="130" rx="10" fill="var(--st-near)" />
        <path d="M60 200 Q 110 260 60 330 Z" fill="var(--st-detail)" />
        <path d="M340 200 Q 290 260 340 330 Z" fill="var(--st-detail)" />
        <rect x="50" y="180" width="300" height="24" rx="8" fill="var(--st-accent)" />
        <Gloss x={50} y={180} w={300} h={24} />
        <rect x="40" y="330" width="320" height="22" rx="6" fill="var(--st-mid)" />
      </g>
      {[100, 140, 180, 220, 260, 300].map((x, i) => (
        <circle key={x} className="twinkle" style={{ animationDelay: `${i * 0.3}s` }} cx={x} cy="192" r="4" fill="var(--st-glow)" />
      ))}
      <Hills y={440} fill="var(--st-ground)" amp={10} />
      <Trail y={380} />
    </g>
  );
}

function NightSky() {
  return (
    <g>
      <circle className="layer" cx="290" cy="120" r="46" fill="var(--st-glow)" />
      <circle cx="306" cy="108" r="46" fill="var(--st-sky-top)" opacity="0.25" />
      {Array.from({ length: 28 }, (_, i) => (
        <circle key={i} className="twinkle" style={{ animationDelay: `${(i % 7) * 0.4}s` }} cx={(i * 83) % 400} cy={(i * 37) % 260} r={i % 5 ? 1.4 : 2.4} fill="var(--st-glow)" />
      ))}
      <Hills y={330} fill="var(--st-mid)" amp={50} />
      <Hills y={400} fill="var(--st-ground)" amp={20} />
    </g>
  );
}

export function LanternRelease({ reduced }: { reduced: boolean }) {
  return (
    <g>
      <Hills y={420} fill="var(--st-mid)" amp={40} />
      <Hills y={500} fill="var(--st-ground)" amp={16} />
      {Array.from({ length: 14 }, (_, i) => (
        <g key={i} className={reduced ? "" : "rise"} style={{ animationDelay: `${i * 0.5}s` }}>
          <Lantern x={20 + ((i * 61) % 360)} y={420 + (i % 4) * 30} s={0.7 + (i % 3) * 0.15} />
        </g>
      ))}
    </g>
  );
}

export const JOURNEY_SCENES: Record<string, () => React.ReactElement> = {
  gate: Gate,
  market_street: MarketStreet,
  riverside: Riverside,
  hill_path: HillPath,
  stage_square: StageSquare,
  night_sky: NightSky,
};
