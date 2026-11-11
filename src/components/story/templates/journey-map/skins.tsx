import type { SkinProps } from "../../template-api";

/* Every option of a question is the same object; only `selected` changes (spec §3 rule 4). */

const Glow = () => <circle className="skin-glow" cx="26" cy="26" r="26" fill="var(--st-glow)" opacity="0.8" />;

function Signpost({ selected }: SkinProps) {
  return (
    <svg viewBox="0 0 52 56" className="skin">
      <Glow />
      <rect x="23" y="18" width="6" height="36" rx="2" fill="var(--st-near)" />
      <path d="M8 10 H 40 L 48 18 L 40 26 H 8 Z" fill={selected ? "var(--st-accent)" : "var(--st-mid)"} />
    </svg>
  );
}

function Poster({ selected }: SkinProps) {
  return (
    <svg viewBox="0 0 52 56" className="skin">
      <Glow />
      <rect x="10" y="6" width="32" height="44" rx="4" fill={selected ? "var(--st-accent)" : "var(--st-mid)"} />
      <rect x="15" y="14" width="22" height="4" rx="2" fill="var(--st-glow)" opacity="0.7" />
      <rect x="15" y="22" width="16" height="4" rx="2" fill="var(--st-glow)" opacity="0.5" />
      <circle cx="26" cy="6" r="3" fill="var(--st-detail)" />
    </svg>
  );
}

function Bunting({ selected }: SkinProps) {
  return (
    <svg viewBox="0 0 52 56" className="skin">
      <Glow />
      <line x1="4" y1="10" x2="48" y2="10" stroke="var(--st-near)" strokeWidth="2" />
      <path d="M10 10 L 42 10 L 26 46 Z" fill={selected ? "var(--st-accent)" : "var(--st-mid)"} />
    </svg>
  );
}

function Lantern({ selected }: SkinProps) {
  return (
    <svg viewBox="0 0 52 56" className="skin">
      <Glow />
      <line x1="26" y1="2" x2="26" y2="12" stroke="var(--st-near)" strokeWidth="2" />
      <rect x="14" y="12" width="24" height="34" rx="11" fill={selected ? "var(--st-accent)" : "var(--st-mid)"} />
      <rect x="18" y="44" width="16" height="5" rx="2" fill="var(--st-near)" />
    </svg>
  );
}

function GateArch({ selected }: SkinProps) {
  return (
    <svg viewBox="0 0 52 56" className="skin">
      <Glow />
      <path d="M8 52 V 24 Q 26 2 44 24 V 52 H 36 V 28 Q 26 14 16 28 V 52 Z" fill={selected ? "var(--st-accent)" : "var(--st-mid)"} />
    </svg>
  );
}

function Lamp({ selected }: SkinProps) {
  return (
    <svg viewBox="0 0 52 56" className="skin">
      <Glow />
      <rect x="24" y="18" width="4" height="34" fill="var(--st-near)" />
      <path d="M14 18 L 38 18 L 32 6 L 20 6 Z" fill={selected ? "var(--st-accent)" : "var(--st-mid)"} />
    </svg>
  );
}

function Star({ selected }: SkinProps) {
  return (
    <svg viewBox="0 0 52 56" className="skin">
      <Glow />
      <path d="M26 6 L 32 20 L 47 21 L 35 31 L 39 46 L 26 38 L 13 46 L 17 31 L 5 21 L 20 20 Z" fill={selected ? "var(--st-accent)" : "var(--st-mid)"} />
    </svg>
  );
}

export function JourneySkin(props: SkinProps) {
  switch (props.family) {
    case "signposts":
      return <Signpost {...props} />;
    case "posters":
      return <Poster {...props} />;
    case "bunting":
      return <Bunting {...props} />;
    case "lanterns_pair":
    case "lantern_row":
      return <Lantern {...props} />;
    case "gates_pair":
      return <GateArch {...props} />;
    case "lamp_row":
      return <Lamp {...props} />;
    case "star_row":
      return <Star {...props} />;
    default:
      return <Poster {...props} />;
  }
}
