// Usage: npm run icons. Edit WANT below, then run it to rebuild src/components/icons.tsx.
// Builds src/components/icons.tsx from Phosphor's own icon definitions (MIT), keeping only the weights we use.
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
const root = process.argv[2] ?? ".";
const WANT = {
  // Player and badges (bold / duotone)
  Check: ["bold", "duotone", "regular"], X: ["bold", "duotone", "regular"], ArrowLeft: ["bold"], LockSimple: ["bold", "regular"], CloudSlash: ["bold"],
  Sparkle: ["bold", "regular"], Calculator: ["bold", "regular"], CheckCircle: ["bold", "regular"], Ruler: ["bold"], ShieldCheck: ["bold"], Warning: ["bold", "regular"],
  // Studio (regular, DESIGN.md §4)
  House: ["regular", "fill"], Plus: ["bold"], PlusCircle: ["regular", "fill"], Gear: ["regular", "fill"], SidebarSimple: ["regular"],
  MagnifyingGlass: ["regular"], DotsThree: ["bold"], Copy: ["regular"], Trash: ["regular"], StopCircle: ["regular"],
  ArrowUpRight: ["regular"], ListChecks: ["regular"], Lightning: ["regular"], Lightbulb: ["regular"], Info: ["regular"], ArrowRight: ["bold"], LinkSimple: ["regular"], ArrowClockwise: ["regular"], Star: ["fill"],
  // Publish, results and account (build steps 7–13)
  WhatsappLogo: ["fill"], QrCode: ["regular"], Code: ["regular"], DownloadSimple: ["regular"], ChartBar: ["regular", "fill"], Table: ["regular"],
  ChatCircleText: ["regular", "fill"], FileText: ["regular", "fill"], Funnel: ["regular"], Flag: ["regular", "fill"], Quotes: ["regular", "fill"],
  SquaresFour: ["regular", "fill"], PaperPlaneRight: ["fill"], Eye: ["regular"], EyeSlash: ["regular"], User: ["regular"], SignOut: ["regular"],
  Envelope: ["regular"], Printer: ["regular"], ShareNetwork: ["regular"], UploadSimple: ["regular"], ArrowUp: ["bold"], Paperclip: ["regular"],
};
const out = [];
for (const [name, weights] of Object.entries(WANT)) {
  const mod = await import(pathToFileURL(`${root}/node_modules/@phosphor-icons/react/dist/defs/${name}.es.js`).href);
  const map = mod.default;
  const entries = weights.map((w) => {
    const frag = map.get(w);
    const kids = [].concat(frag.props.children).filter(Boolean);
    const svg = kids.map((k) => {
      if (k.type !== "path") throw new Error(`${name}/${w}: unsupported element ${k.type}`);
      return `<path d="${k.props.d}"${k.props.opacity ? ` opacity="${k.props.opacity}"` : ""} />`;
    }).join("");
    return `    ${w}: <>${svg}</>,`;
  });
  out.push(`export const ${name} = /*#__PURE__*/ icon({\n${entries.join("\n")}\n});`);
}
const file = `/**
 * Phosphor icons (https://phosphoricons.com, MIT licence), copied as single weights.
 * Each @phosphor-icons/react component ships all six weights, so the icons the Player,
 * badges and Studio need live here instead (the Player has a 150 KB budget). Generated from
 * @phosphor-icons/react/dist/defs by "npm run icons" (scripts/generate-icons.mjs); add icons there, not by hand.
 */
import type { ReactNode, SVGProps } from "react";

type Weight = "bold" | "duotone" | "regular" | "fill";
export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & { size?: number | string; weight?: Weight };

function icon(paths: Partial<Record<Weight, ReactNode>>) {
  function Icon({ size = "1em", weight = "bold", ...rest }: IconProps) {
    const body = paths[weight] ?? paths.bold ?? Object.values(paths)[0];
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" {...rest}>
        {body}
      </svg>
    );
  }
  return Icon;
}

${out.join("\n\n")}
`;
writeFileSync(`${root}/src/components/icons.tsx`, file);
console.log("wrote", Object.keys(WANT).length, "icons,", file.length, "chars");
