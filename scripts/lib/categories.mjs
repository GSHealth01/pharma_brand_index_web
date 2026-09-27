// Port of backend/categories.py: Borderline Products & Cosmetics PDF parsing.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { cleanPdf, uuid5Hex } from "./normalize.mjs";
import { extractTables } from "./pdf-tables.mjs";

const CDN = "https://cdn.prod.website-files.com/666d0695ca3ba7fa496a5068/";

// NMRA pages that link the registry files (discovery searches all of them).
export const BORDERLINE_PAGE = "https://www.nmra.gov.lk/pages/borderline-products";
export const COSMETICS_PAGE = "https://www.nmra.gov.lk/pages/cosmetics";

// Last known files — used only if discovery finds nothing.
export const SEED_BORDERLINE = {
  "Schedule 1": CDN + "6aa3abc3deeba6276dbd99d9_Registered%20Borderline%20Products%20List%20-%20I%20(09.11).pdf",
  "Schedule IIA": CDN + "6aa3abc433c867dd055e0469_Registered%20Borderline%20Products%20List%20-%20IIA%20(09.11).pdf",
  "Schedule IIB": CDN + "6aa7924d99359da766dcf783_Registered%20Borderline%20Products%20List%20-%20IIB%20(09.11).pdf",
};
export const SEED_COSMETICS = CDN + "6a9a5cb14e8a2b5b9b04378c_September%20-%202026_merged.pdf";

// Matched against the squashed (A-Z0-9 only) filename. NMRA has used both
// "Schedule II A - 10.08.26.pdf" and "Registered Borderline Products List - IIA (09.11).pdf";
// "LISTI" must not match "LISTIIA", hence the lookaheads.
export const KW_BORDERLINE = {
  "Schedule 1": /BORDERLINEPRODUCTSLISTI(?!I)|SCHEDULE(?:1|I)(?![0-9I])/,
  "Schedule IIA": /BORDERLINEPRODUCTSLISTIIA|SCHEDULEIIA/,
  "Schedule IIB": /BORDERLINEPRODUCTSLISTIIB|SCHEDULEIIB/,
};
// The cosmetics page also links forms ("cosmetic_schedule_01_14.pdf", fee lists), so stay specific.
export const KW_COSMETICS = [/MERGED/, /REGISTEREDCOSMETIC/];

/**
 * Rank candidate files: newest date in the filename (day-first, 2- or 4-digit year, as in
 * categories.py), then the CDN upload time encoded in the asset-id prefix, then the name.
 */
export function scorePdfDate(fname) {
  let best = null;
  for (const m of fname.matchAll(/(\d{1,2})[.\-_/](\d{1,2})[.\-_/](\d{2,4})/g)) {
    let [d, mo, y] = [+m[1], +m[2], +m[3]];
    if (y < 100) y += 2000;
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
      const c = [y, mo, d];
      if (!best || c[0] > best[0] || (c[0] === best[0] && (c[1] > best[1] || (c[1] === best[1] && c[2] > best[2])))) best = c;
    }
  }
  const uploaded = /^([0-9a-f]{8})[0-9a-f]{16}_/.exec(fname);
  return [...(best ?? [0, 0, 0]), uploaded ? parseInt(uploaded[1], 16) : 0, fname.toLowerCase()];
}

async function eachTable(buf, fn) {
  const task = getDocument({ data: new Uint8Array(buf), verbosity: 0, isEvalSupported: false });
  const doc = await task.promise;
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      for (const table of await extractTables(page)) fn(table);
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
}

export async function parseBorderlinePdf(buf, schedule) {
  const products = [];
  // The header row ("No | Product Name | Brand Name | ...") only appears on page 1.
  // The original backend skipped every table without it, silently dropping all
  // continuation pages (33 of 158 products). Once the header has been seen, later
  // 13-column tables are treated as continuations of the same list.
  let headerSeen = false;
  await eachTable(buf, (table) => {
    let headerIdx = -1;
    for (let i = 0; i < Math.min(6, table.length); i++) {
      const joined = table[i].filter(Boolean).map(cleanPdf).join(" ").toLowerCase();
      if (joined.includes("product name") && joined.includes("brand name")) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0 && !headerSeen) return;
    headerSeen = true;
    for (const row of table.slice(headerIdx + 1)) {
      const c = row.map(cleanPdf);
      if (c.length < 13) continue;
      const [productName, brandName] = [c[1], c[2]];
      if (!productName && !brandName) continue;
      if (["product name", "no"].includes(productName.toLowerCase())) continue;
      if (/^column\b/i.test(productName)) continue; // "COLUMN I | COLUMN II ..." banner row
      const regNo = c[11] || c[12];
      products.push({
        id: "bp_" + uuid5Hex(`${schedule}|${productName}|${brandName}|${regNo}`).slice(0, 20),
        genericName: productName,
        genericRaw: productName,
        brandName,
        manufacturer: c[5],
        localAgent: c[4],
        dosageForm: c[3],
        strength: "",
        packSize: "",
        country: c[6],
        schedule,
        registrationNumber: regNo,
        issueDate: c[7],
        regType: c[8],
        validityStart: c[9],
        validYear: c[10],
        fileNo: c[12],
        category: "borderline",
      });
    }
  });
  return products;
}

export async function parseCosmeticsPdf(buf) {
  const products = [];
  await eachTable(buf, (table) => {
    if (!table.length) return;
    const start = table[0].map(cleanPdf).join(" ").toLowerCase().includes("product name") ? 1 : 0;
    for (const row of table.slice(start)) {
      const c = row.map(cleanPdf);
      if (c.length < 6) continue;
      const [productName, brand, manu, country, importer, expiry] = c;
      if (!productName && !brand) continue;
      if (productName.toLowerCase() === "product name") continue;
      products.push({
        id: "cos_" + uuid5Hex(`${productName}|${brand}|${manu}|${expiry}`).slice(0, 20),
        genericName: productName,
        genericRaw: productName,
        brandName: brand,
        manufacturer: manu,
        localAgent: importer,
        dosageForm: "",
        strength: "",
        packSize: "",
        country,
        schedule: "",
        registrationNumber: "",
        expiryDate: expiry,
        category: "cosmetics",
      });
    }
  });
  return products;
}
