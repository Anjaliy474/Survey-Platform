import type { SkinProps } from "../../template-api";

/* Every option of a question is the same object; only `selected` changes. */

const Glow = () => <circle className="skin-glow" cx="26" cy="28" r="26" fill="var(--st-glow)" opacity="0.8" />;
const fill = (selected: boolean) => (selected ? "var(--st-accent)" : "var(--st-mid)");

function MenuCard({ selected }: SkinProps) {
  return (
    <svg viewBox="0 0 52 56" className="skin">
      <Glow />
      <rect x="10" y="6" width="32" height="44" rx="5" fill={fill(selected)} />
      <rect x="15" y="14" width="22" height="3" rx="1.5" fill="var(--st-glow)" />
      <rect x="15" y="22" width="18" height="3" rx="1.5" fill="var(--st-glow)" opacity="0.7" />
      <rect x="15" y="30" width="20" height="3" rx="1.5" fill="var(--st-glow)" opacity="0.7" />
    </svg>
  );
}

function Jar({ selected }: SkinProps) {
  return (
    <svg viewBox="0 0 52 56" className="skin">
      <Glow />
      <rect x="14" y="8" width="24" height="8" rx="3" fill="var(--st-near)" />
      <rect x="11" y="15" width="30" height="35" rx="10" fill={fill(selected)} />
      <rect x="16" y="26" width="20" height="10" rx="3" fill="var(--st-glow)" opacity="0.8" />
    </svg>
  );
}

function Cup({ selected }: SkinProps) {
  return (
    <svg viewBox="0 0 52 56" className="skin">
      <Glow />
      <path d="M12 18 H 36 L 33 46 Q 24 50 15 46 Z" fill={fill(selected)} />
      <path d="M36 22 q 10 4 0 14" fill="none" stroke={fill(selected)} strokeWidth="4" />
      <ellipse cx="24" cy="50" rx="16" ry="3" fill="var(--st-near)" />
    </svg>
  );
}

function Mug({ selected }: SkinProps) {
  return (
    <svg viewBox="0 0 52 56" className="skin">
      <Glow />
      <rect x="11" y="16" width="26" height="32" rx="7" fill={fill(selected)} />
      <path d="M37 22 q 10 6 0 16" fill="none" stroke={fill(selected)} strokeWidth="4" />
    </svg>
  );
}

function ShelfTag({ selected }: SkinProps) {
  return (
    <svg viewBox="0 0 52 56" className="skin">
      <Glow />
      <path d="M14 14 H 38 V 40 L 26 48 L 14 40 Z" fill={fill(selected)} />
      <circle cx="26" cy="20" r="3" fill="var(--st-near)" />
    </svg>
  );
}

export function StationSkin(props: SkinProps) {
  switch (props.family) {
    case "menu_cards":
      return <MenuCard {...props} />;
    case "jar_labels":
    case "jar_row":
      return <Jar {...props} />;
    case "cups_pair":
      return <Cup {...props} />;
    case "mug_row":
      return <Mug {...props} />;
    case "shelf_numbers":
      return <ShelfTag {...props} />;
    default:
      return <MenuCard {...props} />;
  }
}
