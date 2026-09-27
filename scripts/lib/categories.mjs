// Port of backend/categories.py: Borderline Products & Cosmetics PDF parsing.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { cleanPdf, uuid5Hex } from "./normalize.mjs";
import { extractTables } from "./pdf-tables.mjs";

// Fallback URLs used by the backend when the NMRA page doesn't link the PDFs.
export const SEED_BORDERLINE = {
  "Schedule 1": "https://cdn.prod.website-files.com/666d0695ca3ba7fa496a5068/6a795ccc640a614f85bb73f6_Schedule%201%20-%2010.08.26.pdf",
  "Schedule IIA": "https://cdn.prod.website-files.com/666d0695ca3ba7fa496a5068/6a795ccc3189e2190a8d8ccf_Schedule%20II%20A%20-%2010.08.26.pdf",
  "Schedule IIB": "https://cdn.prod.website-files.com/666d0695ca3ba7fa496a5068/6a795cccae66580152702490_Schedule%20II%20B%20-%2010.08.26.pdf",
};
export const SEED_COSMETICS = "https://cdn.prod.website-files.com/666d0695ca3ba7fa496a5068/6a9a5cb14e8a2b5b9b04378c_September%20-%202026_merged.pdf";
export const KW_BORDERLINE = { "Schedule 1": "SCHEDULE1", "Schedule IIA": "SCHEDULEIIA", "Schedule IIB": "SCHEDULEIIB" };
export const KW_COSMETICS = ["COSMETICS", "MERGED"];

/** categories.py _score_date (day-first, 2- or 4-digit year). */
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
  return [...(best ?? [0, 0, 0]), fname.toLowerCase()];
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
  await eachTable(buf, (table) => {
    let headerIdx = -1;
    for (let i = 0; i < Math.min(6, table.length); i++) {
      const joined = table[i].filter(Boolean).map(cleanPdf).join(" ").toLowerCase();
      if (joined.includes("product name") && joined.includes("brand name")) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) return;
    for (const row of table.slice(headerIdx + 1)) {
      const c = row.map(cleanPdf);
      if (c.length < 13) continue;
      const [productName, brandName] = [c[1], c[2]];
      if (!productName && !brandName) continue;
      if (["product name", "no"].includes(productName.toLowerCase())) continue;
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
