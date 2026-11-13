/* Stations Room: one place (a café, a common room) seen from six stations.
 * The active station is lit; the next one glows faintly so the order stays guided. */

const Gloss = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
  <ellipse className="gloss" cx={x + w * 0.3} cy={y + h * 0.22} rx={w * 0.28} ry={h * 0.16} fill="url(#gloss)" />
);

/** Shared room shell: back wall, floor, a warm pendant light. */
function Room({ children, light = 200 }: { children: React.ReactNode; light?: number }) {
  return (
    <g>
      <rect width="400" height="700" fill="var(--st-sky-bottom)" />
      <rect y="0" width="400" height="330" fill="var(--st-far)" opacity="0.55" />
      <rect className="layer" y="330" width="400" height="370" fill="var(--st-ground)" />
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1={i * 60 - 40} y1="330" x2={i * 80 - 120} y2="700" stroke="var(--st-near)" strokeOpacity="0.35" strokeWidth="2" />
      ))}
      <line x1={light} y1="0" x2={light} y2="60" stroke="var(--st-near)" strokeWidth="2" />
      <path className="layer" d={`M${light - 26} 84 Q ${light} 52 ${light + 26} 84 Z`} fill="var(--st-accent)" />
      <ellipse cx={light} cy="150" rx="150" ry="120" fill="var(--st-glow)" opacity="0.35" />
      {children}
    </g>
  );
}

const Cup = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="-12" y="-14" width="24" height="18" rx="5" fill="var(--st-glow)" />
    <path d="M12 -10 q 8 2 0 10" fill="none" stroke="var(--st-glow)" strokeWidth="3" />
  </g>
);

function Counter() {
  return (
    <Room light={210}>
      <g className="layer">
        <rect x="40" y="250" width="320" height="110" rx="12" fill="var(--st-near)" />
        <rect x="30" y="236" width="340" height="22" rx="8" fill="var(--st-mid)" />
        <Gloss x={30} y={236} w={340} h={22} />
        <rect x="250" y="190" width="70" height="46" rx="10" fill="var(--st-detail)" />
        <circle cx="285" cy="213" r="10" fill="var(--st-glow)" />
      </g>
      <Cup x={110} y={232} />
      <Cup x={150} y={232} />
      {[0, 1, 2].map((k) => (
        <path key={k} className="drift" style={{ animationDelay: `${-k * 4}s` }} d={`M${108 + k * 20} 210 q -6 -12 0 -24 q 6 -12 0 -24`} fill="none" stroke="var(--st-glow)" strokeWidth="2" opacity="0.7" />
      ))}
    </Room>
  );
}

function MenuWall() {
  return (
    <Room light={120}>
      <g className="layer">
        <rect x="70" y="90" width="260" height="190" rx="14" fill="var(--st-near)" />
        <rect x="84" y="104" width="232" height="162" rx="8" fill="var(--st-ground)" />
        {[130, 160, 190, 220].map((y, i) => (
          <rect key={y} x="104" y={y} width={150 - i * 20} height="8" rx="4" fill="var(--st-glow)" opacity="0.7" />
        ))}
        <rect x="104" y="112" width="110" height="10" rx="5" fill="var(--st-accent)" />
      </g>
      <rect className="layer" x="0" y="330" width="400" height="40" fill="var(--st-mid)" />
    </Room>
  );
}

function WindowSeat() {
  return (
    <Room light={300}>
      <g className="layer">
        <rect x="60" y="70" width="200" height="220" rx="16" fill="var(--st-sky-top)" />
        <path d="M60 230 Q 120 190 160 220 T 260 210 V 290 H 60 Z" fill="var(--st-mid)" opacity="0.7" />
        <rect x="155" y="70" width="10" height="220" fill="var(--st-near)" />
        <rect x="60" y="175" width="200" height="10" fill="var(--st-near)" />
        <rect x="50" y="60" width="220" height="240" rx="18" fill="none" stroke="var(--st-near)" strokeWidth="12" />
      </g>
      <path d="M60 70 L 130 70 L 0 330 L 0 260 Z" fill="var(--st-glow)" opacity="0.25" />
      <g className="layer">
        <rect x="40" y="300" width="240" height="40" rx="12" fill="var(--st-detail)" />
        <Gloss x={40} y={300} w={240} h={40} />
        <circle cx="320" cy="300" r="34" fill="var(--st-mid)" />
      </g>
      <Cup x={318} y={286} />
    </Room>
  );
}

function ShelfCorner() {
  return (
    <Room light={260}>
      <g className="layer">
        {[120, 200, 280].map((y) => (
          <rect key={y} x="50" y={y} width="300" height="12" rx="4" fill="var(--st-near)" />
        ))}
        {[0, 1, 2].flatMap((row) =>
          Array.from({ length: 5 }, (_, i) => (
            <g key={`${row}-${i}`} transform={`translate(${80 + i * 56} ${120 + row * 80})`}>
              <rect x="-14" y="-40" width="28" height="40" rx="8" fill={i % 2 ? "var(--st-mid)" : "var(--st-accent)"} opacity="0.85" />
              <rect x="-16" y="-46" width="32" height="8" rx="3" fill="var(--st-near)" />
            </g>
          )),
        )}
      </g>
    </Room>
  );
}

function NoticeBoard() {
  return (
    <Room light={150}>
      <g className="layer">
        <rect x="70" y="80" width="260" height="210" rx="14" fill="var(--st-mid)" />
        {[
          [96, 104, 70, 60],
          [186, 100, 120, 44],
          [110, 184, 90, 80],
          [222, 162, 84, 100],
        ].map(([x, y, w, h], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx="4" fill="var(--st-glow)" transform={`rotate(${(i % 2 ? 3 : -3)} ${x + w / 2} ${y + h / 2})`} />
            <circle cx={x + w / 2} cy={y + 4} r="5" fill="var(--st-detail)" />
          </g>
        ))}
      </g>
    </Room>
  );
}

function BackGarden() {
  return (
    <g>
      <rect width="400" height="700" fill="url(#sky)" />
      <path className="layer" d="M0 300 Q 100 270 200 300 T 400 290 V 700 H 0 Z" fill="var(--st-mid)" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} className="layer" x={i * 46 + 4} y="250" width="30" height="90" rx="6" fill="var(--st-near)" />
      ))}
      {[70, 180, 300].map((x, i) => (
        <g key={x} className="sway" style={{ animationDelay: `${i * 0.6}s` }}>
          <circle cx={x} cy="300" r="32" fill="var(--st-detail)" opacity="0.8" />
          <circle cx={x + 20} cy="286" r="22" fill="var(--st-accent)" opacity="0.7" />
        </g>
      ))}
      <path className="layer" d="M0 420 Q 200 390 400 420 V 700 H 0 Z" fill="var(--st-ground)" />
    </g>
  );
}

export function ClosingTime({ reduced }: { reduced: boolean }) {
  return (
    <Room light={200}>
      <g className="layer">
        {[90, 200, 310].map((x) => (
          <g key={x} transform={`translate(${x} 300)`}>
            <rect x="-40" y="0" width="80" height="12" rx="4" fill="var(--st-near)" />
            <rect x="-34" y="12" width="6" height="60" fill="var(--st-near)" />
            <rect x="28" y="12" width="6" height="60" fill="var(--st-near)" />
            <rect x="-24" y="-46" width="48" height="10" rx="3" fill="var(--st-mid)" transform="rotate(180 0 -41)" />
          </g>
        ))}
      </g>
      <circle className={reduced ? "" : "twinkle"} cx="200" cy="90" r="10" fill="var(--st-glow)" />
    </Room>
  );
}

export const STATION_SCENES: Record<string, () => React.ReactElement> = {
  counter: Counter,
  menu_wall: MenuWall,
  window_seat: WindowSeat,
  shelf_corner: ShelfCorner,
  notice_board: NoticeBoard,
  back_garden: BackGarden,
};
