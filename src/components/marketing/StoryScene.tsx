/**
 * Story Mode scene art, drawn in PlaySurvey's palette with flat, rounded shapes: a student and her
 * dog through a campus day. Decorative only (always aria-hidden by the caller).
 */

export type SceneId = "morning" | "lunch" | "night" | "end";

/* ---------------- the scenes: flat, rounded shapes in the site palette ---------------- */

function Student({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx="0" cy="196" rx="22" ry="5" fill="rgba(34,25,46,0.12)" />
      {/* legs */}
      <rect x="-9" y="166" width="7" height="28" rx="3.5" fill="#3d3456" />
      <rect x="2" y="166" width="7" height="28" rx="3.5" fill="#3d3456" />
      {/* body */}
      <rect x="-16" y="128" width="32" height="44" rx="14" fill="var(--ps-persimmon-600)" />
      <path d="M-12 136 L8 162" stroke="var(--ps-marigold-400)" strokeWidth="4" strokeLinecap="round" />
      {/* head */}
      <circle cx="0" cy="110" r="19" fill="#c98b62" />
      <path d="M-20 112 C-23 84 23 84 20 112 C17 100 8 96 -2 99 C-9 101 -15 105 -20 112Z" fill="#2b2238" />
      <path d="M17 100 C29 106 28 126 20 136" stroke="#2b2238" strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="-6" cy="112" r="2.2" fill="#2b2238" />
      <circle cx="6" cy="112" r="2.2" fill="#2b2238" />
      <path d="M-5 120 Q0 124 5 120" stroke="#2b2238" strokeWidth="2" strokeLinecap="round" fill="none" />
    </g>
  );
}

function Dog({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx="0" cy="196" rx="20" ry="4" fill="rgba(34,25,46,0.12)" />
      <path d="M14 168 C24 160 26 150 22 146" stroke="var(--ps-marigold-400)" strokeWidth="5" strokeLinecap="round" fill="none" />
      <rect x="-16" y="164" width="32" height="22" rx="11" fill="var(--ps-marigold-400)" />
      <rect x="-13" y="180" width="6" height="14" rx="3" fill="var(--ps-marigold-400)" />
      <rect x="7" y="180" width="6" height="14" rx="3" fill="var(--ps-marigold-400)" />
      <circle cx="-15" cy="158" r="12" fill="var(--ps-marigold-400)" />
      <path d="M-24 152 L-22 138 L-14 148Z" fill="#c98a00" />
      <path d="M-12 148 L-6 136 L-4 150Z" fill="#c98a00" />
      <circle cx="-19" cy="157" r="1.8" fill="#2b2238" />
      <circle cx="-26" cy="161" r="2.2" fill="#2b2238" />
      <path d="M-14 168 L-4 168" stroke="var(--ps-persimmon-600)" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/** frame="phone": a narrower crop for the tall phone preview, so nobody is cut off. */
export function SceneArt({ scene, frame = "card" }: { scene: SceneId; frame?: "card" | "phone" }) {
  return (
    <svg
      className="sdemo__art"
      viewBox={scene === "end" ? "0 80 380 118" : frame === "phone" ? "28 0 330 212" : "0 0 380 210"}
      preserveAspectRatio={scene === "end" ? "xMidYMid slice" : "xMidYMax slice"}
    >
      {scene === "morning" && (
        <>
          <circle cx="250" cy="74" r="22" fill="#ffd27a" opacity="0.9" />
          {/* window */}
          <rect x="54" y="40" width="96" height="78" rx="12" fill="#ffffff" opacity="0.65" />
          <path d="M102 40 V118 M54 79 H150" stroke="#f3dcc0" strokeWidth="4" />
          {/* bed */}
          <rect x="196" y="150" width="150" height="26" rx="10" fill="#ffffff" />
          <rect x="196" y="140" width="40" height="18" rx="9" fill="var(--ps-viz-3)" opacity="0.35" />
          <rect x="196" y="174" width="150" height="16" rx="6" fill="#d9a77a" />
          <rect x="0" y="190" width="380" height="20" fill="#efd9bb" />
          <Student x={128} />
          <Dog x={72} />
        </>
      )}
      {scene === "lunch" && (
        <>
          <circle cx="150" cy="62" r="18" fill="#fff4cf" />
          <ellipse cx="280" cy="46" rx="34" ry="12" fill="#ffffff" opacity="0.9" />
          <ellipse cx="96" cy="78" rx="24" ry="9" fill="#ffffff" opacity="0.8" />
          {/* canteen counter with striped awning */}
          <rect x="190" y="96" width="160" height="94" rx="10" fill="#fff8ee" />
          <path d="M184 92 H356 L346 118 H194Z" fill="var(--ps-persimmon-600)" />
          <path d="M210 92 L206 118 M236 92 L234 118 M262 92 L262 118 M288 92 L290 118 M314 92 L318 118" stroke="#ffffff" strokeWidth="9" opacity="0.85" />
          <rect x="206" y="132" width="128" height="22" rx="6" fill="var(--ps-viz-2)" opacity="0.25" />
          <circle cx="226" cy="143" r="6" fill="var(--ps-marigold-400)" />
          <circle cx="250" cy="143" r="6" fill="var(--ps-persimmon-600)" />
          <circle cx="274" cy="143" r="6" fill="var(--ps-viz-2)" />
          <rect x="0" y="190" width="380" height="20" fill="#e7d3b2" />
          <Student x={128} />
          <Dog x={62} />
        </>
      )}
      {(scene === "night" || scene === "end") && (
        <>
          {[
            [40, 30],
            [92, 54],
            [150, 22],
            [214, 48],
            [262, 20],
            [330, 64],
            [356, 28],
            [120, 82],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill="#ffffff" opacity="0.8" />
          ))}
          <circle cx="236" cy="70" r="16" fill="#fff4cf" />
          <circle cx="244" cy="64" r="14" fill="var(--sdemo-night, #2b2f63)" />
          {/* city blocks and terrace railing */}
          <path d="M0 150 H40 V120 H78 V136 H116 V112 H150 V150 H230 V126 H270 V142 H312 V116 H350 V150 H380 V190 H0Z" fill="#3a3f78" />
          {[56, 64, 128, 136, 248, 324, 332].map((x) => (
            <rect key={x} x={x} y="128" width="5" height="5" rx="1" fill="#ffd27a" opacity="0.85" />
          ))}
          <rect x="0" y="160" width="380" height="5" rx="2" fill="#8e95cf" />
          {Array.from({ length: 20 }, (_, i) => (
            <rect key={i} x={8 + i * 19} y="160" width="3" height="30" fill="#8e95cf" />
          ))}
          <rect x="0" y="190" width="380" height="20" fill="#4a4f8a" />
          {scene === "end" ? (
            <>
              <Student x={170} />
              <Dog x={222} />
            </>
          ) : (
            <>
              <Student x={150} />
              <Dog x={96} />
            </>
          )}
        </>
      )}
    </svg>
  );
}
