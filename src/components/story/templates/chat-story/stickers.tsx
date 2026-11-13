/* Eight neutral stickers used as chapter dividers. They never depict an answer. */

const Gloss = () => <ellipse className="gloss" cx="40" cy="34" rx="22" ry="12" fill="url(#gloss)" />;

const STICKERS: Record<string, React.ReactElement> = {
  sticker_1: (
    <g>
      <circle className="layer" cx="60" cy="60" r="34" fill="var(--st-accent)" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="57" y="8" width="6" height="14" rx="3" fill="var(--st-detail)" transform={`rotate(${i * 45} 60 60)`} />
      ))}
      <Gloss />
    </g>
  ),
  sticker_2: (
    <g className="layer">
      <path d="M30 50 H 86 L 80 96 Q 58 104 36 96 Z" fill="var(--st-detail)" />
      <path d="M86 58 q 18 6 0 26" fill="none" stroke="var(--st-detail)" strokeWidth="7" />
      {[44, 58, 72].map((x) => (
        <path key={x} className="drift" d={`M${x} 40 q -6 -10 0 -20`} fill="none" stroke="var(--st-near)" strokeWidth="3" />
      ))}
      <Gloss />
    </g>
  ),
  sticker_3: (
    <g className="layer">
      <path d="M14 70 L 104 30 L 70 100 L 58 76 Z" fill="var(--st-accent)" />
      <path d="M58 76 L 104 30" stroke="var(--st-near)" strokeWidth="3" />
    </g>
  ),
  sticker_4: (
    <g className="layer">
      <circle cx="46" cy="66" r="24" fill="var(--st-glow)" />
      <circle cx="72" cy="58" r="30" fill="var(--st-glow)" />
      <rect x="22" y="66" width="80" height="24" rx="12" fill="var(--st-glow)" />
      <circle cx="88" cy="30" r="14" fill="var(--st-accent)" />
    </g>
  ),
  sticker_5: (
    <g className="layer">
      <path d="M78 22 A 40 40 0 1 0 98 82 A 32 32 0 1 1 78 22 Z" fill="var(--st-accent)" />
      <circle cx="30" cy="30" r="3" fill="var(--st-detail)" />
      <circle cx="96" cy="44" r="2" fill="var(--st-detail)" />
    </g>
  ),
  sticker_6: (
    <g className="layer">
      <rect x="42" y="80" width="36" height="28" rx="6" fill="var(--st-detail)" />
      <path d="M60 80 C 30 70 30 36 52 30 C 52 50 60 60 60 80 Z" fill="var(--st-mid)" />
      <path d="M60 80 C 90 70 92 40 70 26 C 70 50 62 60 60 80 Z" fill="var(--st-near)" />
    </g>
  ),
  sticker_7: (
    <g className="layer">
      <path d="M60 14 L 96 52 L 60 90 L 24 52 Z" fill="var(--st-detail)" />
      <path d="M60 14 V 90 M 24 52 H 96" stroke="var(--st-glow)" strokeWidth="3" />
      <path d="M60 90 q 10 14 -4 26" fill="none" stroke="var(--st-near)" strokeWidth="2" />
    </g>
  ),
  sticker_8: (
    <g className="layer">
      <rect x="56" y="70" width="8" height="34" fill="var(--st-near)" />
      <path d="M36 70 H 84 L 74 34 H 46 Z" fill="var(--st-accent)" />
      <ellipse cx="60" cy="60" rx="34" ry="24" fill="var(--st-glow)" opacity="0.35" />
    </g>
  ),
  chat_end: (
    <g className="layer">
      <rect x="16" y="30" width="88" height="64" rx="18" fill="var(--st-accent)" />
      <path d="M36 94 L 30 112 L 52 94 Z" fill="var(--st-accent)" />
      {[40, 60, 80].map((x) => (
        <circle key={x} cx={x} cy="62" r="6" fill="var(--st-glow)" />
      ))}
    </g>
  ),
};

export function Sticker({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 120 120" className="chat-sticker" aria-hidden="true">
      <defs>
        <radialGradient id="gloss" cx="0.3" cy="0.2" r="0.6">
          <stop offset="0" stopColor="var(--story-white)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--story-white)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {STICKERS[id] ?? STICKERS.sticker_1}
    </svg>
  );
}
