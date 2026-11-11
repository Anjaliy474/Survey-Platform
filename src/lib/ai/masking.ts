/**
 * Personal-data masking, in code, before any text reaches the AI (combined.system.txt: "Personal
 * data has already been masked by code"). Masks are plain tokens the UI shows as pills.
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Indian mobile and landline shapes: +91 98480 12345, 098480-12345, 040 2345 6789, 9848012345.
const PHONE = /(?:\+?91[\s-]?)?(?:0?\d[\s-]?){9,11}\d/g;
const AADHAAR = /\b\d{4}\s\d{4}\s\d{4}\b/g;

export const MASKS = ["[phone removed]", "[email removed]", "[ID removed]"] as const;

export function maskPersonalData(text: string): string {
  return text.replace(EMAIL, "[email removed]").replace(AADHAAR, "[ID removed]").replace(PHONE, (m) => (m.replace(/\D/g, "").length >= 10 ? "[phone removed]" : m));
}

/** Split text into plain parts and mask tokens, for showing masks as pills. */
export function splitMasks(text: string): { text: string; mask: boolean }[] {
  return text
    .split(/(\[(?:phone|email|ID) removed\])/)
    .filter(Boolean)
    .map((part) => ({ text: part, mask: /^\[(?:phone|email|ID) removed\]$/.test(part) }));
}
