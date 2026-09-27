// Ports of the text helpers in backend/server.py and backend/categories.py.
// Kept behaviourally identical so the generated data (and product IDs) match the
// original FastAPI backend record-for-record.
import { createHash } from "node:crypto";

/** server.py _clean: None -> "", integral floats -> int, trim, collapse whitespace. */
export function cleanCell(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim().replace(/\s+/g, " ");
}

/** categories.py _clean: also turns newlines into spaces first. */
export function cleanPdf(v) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\n/g, " ").trim().replace(/\s+/g, " ");
}

export const normKey = (s) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();

/** Python str.capitalize(): first char upper, rest lower. */
const capitalize = (w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w);

export function titleCase(s) {
  if (!s) return s;
  return s
    .split(" ")
    .map((w) => (/^[IVX]+$/.test(w) || /^\d+([A-Z]+)?$/.test(w) ? w : capitalize(w)))
    .join(" ");
}

const DOSAGE_MARKERS = new Set([
  "TABLETS", "TABLET", "CAPSULES", "CAPSULE", "INJECTION", "INJ",
  "SYRUP", "SUSPENSION", "CREAM", "GEL", "OINTMENT", "LOTION",
  "DROPS", "DROP", "SPRAY", "SOLUTION", "LIQUID", "POWDER",
  "GRANULES", "SACHET", "SACHETS", "INFUSION", "FILM", "PATCH",
  "PESSARY", "SUPPOSITORY", "SUPPOSITORIES", "INHALER", "AEROSOL",
  "PASTE", "SHAMPOO", "MOUTHWASH", "FOAM", "LOZENGE", "LOZENGES",
  "EAR", "EYE", "NASAL", "ORAL", "USP", "BP", "IP", "EP", "PH.EUR",
]);
const STRENGTH_SRC = String.raw`(\d+(?:[.,]\d+)?\s*(?:MG/ML|MCG/ML|MG/G|IU/ML|MG|MCG|IU|G(?![A-Z])|ML(?![A-Z])|%|W/W|W/V))`;

/** "ROSUVASTATIN TABLETS USP 5MG" -> "Rosuvastatin" */
export function extractGenericBase(raw) {
  if (!raw) return "";
  let text = raw.toUpperCase();
  const m = new RegExp(STRENGTH_SRC, "i").exec(text);
  if (m) text = text.slice(0, m.index).trim();
  const tokens = text.split(" ");
  let cut = tokens.length;
  for (let i = 0; i < tokens.length; i++) {
    if (DOSAGE_MARKERS.has(stripChars(tokens[i], ",.;:"))) {
      cut = i;
      break;
    }
  }
  let base = stripChars(tokens.slice(0, cut).join(" "), " ,");
  base = base.replace(/\s+/g, " ");
  return base ? titleCase(base.toLowerCase()) : titleCase(raw.toLowerCase());
}

export function extractStrength(raw) {
  if (!raw) return "";
  const matches = raw.toUpperCase().match(new RegExp(STRENGTH_SRC, "gi"));
  if (!matches) return "";
  const seen = [];
  for (const s of matches) {
    let n = s.replace(/\s+/g, " ").replace(/,/g, ".").toLowerCase();
    n = n.replace(/\s*(mg|mcg|iu|g|ml|%)/g, (_, u) => " " + u);
    n = n.replace(/\s+/g, " ").trim();
    if (!seen.includes(n)) seen.push(n);
  }
  return seen.join(" + ");
}

/** Python str.strip(chars) */
function stripChars(s, chars) {
  let a = 0;
  let b = s.length;
  while (a < b && chars.includes(s[a])) a++;
  while (b > a && chars.includes(s[b - 1])) b--;
  return s.slice(a, b);
}

/** Python uuid.uuid5(uuid.NAMESPACE_DNS, name).hex */
const NAMESPACE_DNS = Buffer.from("6ba7b8109dad11d180b400c04fd430c8", "hex");
export function uuid5Hex(name) {
  const hash = createHash("sha1").update(NAMESPACE_DNS).update(Buffer.from(name, "utf8")).digest();
  const b = hash.subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  return b.toString("hex");
}

/** urllib unquote of the last path segment. */
export function fileNameOf(url) {
  const path = new URL(url).pathname;
  try {
    return decodeURIComponent(path.slice(path.lastIndexOf("/") + 1));
  } catch {
    return path.slice(path.lastIndexOf("/") + 1);
  }
}
