// Port of backend/server.py: discover_latest_excel_url + _parse_workbook.
import * as XLSX from "xlsx";
import { cleanCell, extractGenericBase, extractStrength, fileNameOf, normKey, titleCase, uuid5Hex } from "./normalize.mjs";

const DATE_PATTERNS = [/(\d{1,2})[.\-_/](\d{1,2})[.\-_/](\d{4})/g, /(\d{4})[.\-_/](\d{1,2})[.\-_/](\d{1,2})/g];

/** Sortable key for the newest date in a filename (server.py _score_filename_date). */
export function scoreFilenameDate(fname) {
  let best = null;
  for (const pat of DATE_PATTERNS) {
    for (const m of fname.matchAll(pat)) {
      const [g1, g2, g3] = m.slice(1);
      const [y, mo, d] = g1.length === 4 ? [+g1, +g2, +g3] : [+g3, +g2, +g1];
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
        const cand = [y, mo, d];
        if (!best || compareTuple(cand, best) > 0) best = cand;
      }
    }
  }
  return [...(best ?? [0, 0, 0]), fname.toLowerCase()];
}

export function compareTuple(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

/** Newest link on the NMRA page whose squashed filename contains `keyword`. */
export function discoverLink(html, pageUrl, extPattern, keyword, score = scoreFilenameDate) {
  const re = new RegExp(`href=['"]([^'"]+\\.(?:${extPattern})(?:\\?[^'"]*)?)['"]`, "gi");
  const want = keyword.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  const hits = [];
  for (const m of html.matchAll(re)) {
    let abs;
    try {
      abs = new URL(m[1], pageUrl).href;
    } catch {
      continue;
    }
    const fname = fileNameOf(abs);
    if (want && fname.toUpperCase().replace(/[^A-Z0-9]+/g, "").includes(want)) hits.push([abs, fname]);
  }
  if (!hits.length) return null;
  hits.sort((a, b) => compareTuple(score(b[1]), score(a[1])));
  return hits[0][0];
}

export function parseMedicineWorkbook(buf) {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false, cellText: false });
  const rowsOf = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: true });

  let target = wb.SheetNames.find((n) => n.toUpperCase().includes("REGISTRATION"));
  if (!target) target = wb.SheetNames.find((n) => rowsOf(n).length > 1);
  if (!target) throw new Error("No data sheets found in workbook");

  const rows = rowsOf(target);
  const headers = (rows[0] ?? []).map((h) => cleanCell(h).toUpperCase());
  const col = (name) => headers.indexOf(name);
  const idx = {
    generic: col("GENERIC NAME"),
    brand: col("BRAND"),
    dosage: col("DOSAGE"),
    packSize: col("PACK SIZE"),
    packType: col("PACK TYPE"),
    manufacturer: col("MANUFACTURER"),
    country: col("COUNTRY"),
    agent: col("AGENT"),
    regNo: col("REG.NO."),
    schedule: col("SCHEDULE"),
  };

  const products = [];
  const seen = new Set();
  for (let r = 1; r < rows.length; r++) {
    const row = (rows[r] ?? []).map(cleanCell);
    if (!row.some(Boolean)) continue;
    const get = (i) => (i >= 0 ? row[i] ?? "" : "");
    const rawGeneric = get(idx.generic);
    const brandRaw = get(idx.brand);
    if (!rawGeneric && !brandRaw) continue;

    const genericName = extractGenericBase(rawGeneric);
    const strength = extractStrength(rawGeneric);
    const dosageForm = get(idx.dosage) ? titleCase(get(idx.dosage).toLowerCase()) : "";
    const brand = brandRaw ? titleCase(brandRaw.toLowerCase()) : "";
    const pack = cleanCell(get(idx.packSize) + (get(idx.packType) ? " " + get(idx.packType) : ""));
    const manufacturer = get(idx.manufacturer);
    const country = get(idx.country);
    const regNo = get(idx.regNo);

    const dedup = [genericName, brand, strength, dosageForm, manufacturer, pack].map(normKey).join("|");
    if (seen.has(dedup)) continue;
    seen.add(dedup);

    products.push({
      id: uuid5Hex(dedup + "|" + regNo),
      genericName,
      genericRaw: rawGeneric,
      brandName: brand,
      manufacturer,
      localAgent: get(idx.agent),
      dosageForm,
      strength,
      packSize: pack,
      country: country ? titleCase(country.toLowerCase()) : "",
      schedule: get(idx.schedule),
      registrationNumber: regNo,
      category: "medicine",
    });
  }
  return products;
}
