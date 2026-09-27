#!/usr/bin/env node
// Pulls the registries straight from the NMRA sources and writes data/*.json for the API.
//
//   npm run sync-data
//
// Same behaviour as the original FastAPI backend: finds the newest medicine Excel on
// nmra.gov.lk (falls back to the last known URL), and the Borderline / Cosmetics PDFs
// (falls back to the known seed URLs, since the homepage doesn't link them).
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KW_BORDERLINE, KW_COSMETICS, SEED_BORDERLINE, SEED_COSMETICS, parseBorderlinePdf, parseCosmeticsPdf, scorePdfDate } from "./lib/categories.mjs";
import { discoverLink, parseMedicineWorkbook } from "./lib/medicine.mjs";
import { fileNameOf } from "./lib/normalize.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data");
const SOURCE_PAGE = process.env.NMRA_SOURCE_PAGE_URL || "https://www.nmra.gov.lk/";
const MEDICINE_KEYWORD = "MEDICINE VALID REGISTRATIONS";
const MEDICINE_SEED =
  process.env.MEDICINE_EXCEL_URL ||
  "https://cdn.prod.website-files.com/666d0695ca3ba7fa496a5068/6ab50d00ae4335f04765cb67_MEDICINE%20VALID%20REGISTRATIONS%2024.09.2026.xls";
const UA = "Mozilla/5.0 (compatible; PharmaBrandIndexBot/1.0)";

async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function main() {
  const started = Date.now();
  await fs.mkdir(OUT, { recursive: true });

  let html = "";
  try {
    const res = await fetch(SOURCE_PAGE, { headers: { "User-Agent": UA, Accept: "text/html" } });
    if (!res.ok) throw new Error(`${res.status}`);
    html = await res.text();
    log(`Fetched source page ${SOURCE_PAGE}`);
  } catch (e) {
    log(`! Source page unavailable (${e.message}); using known file URLs`);
  }

  const sources = {};
  const source = (url, discovered, records) => ({ url, filename: fileNameOf(url), discovered: Boolean(discovered), records });

  // Medicines (Excel)
  const medDiscovered = html && discoverLink(html, SOURCE_PAGE, "xlsx?", MEDICINE_KEYWORD);
  const medUrl = medDiscovered || MEDICINE_SEED;
  log(`Medicines  <- ${fileNameOf(medUrl)}${medDiscovered ? "" : " (fallback)"}`);
  const medicine = parseMedicineWorkbook(await download(medUrl));
  sources.medicine = [source(medUrl, medDiscovered, medicine.length)];
  log(`           ${medicine.length} products`);

  // Borderline (3 schedule PDFs)
  const borderline = [];
  sources.borderline = [];
  for (const [label, seed] of Object.entries(SEED_BORDERLINE)) {
    const found = html && discoverLink(html, SOURCE_PAGE, "pdf", KW_BORDERLINE[label], scorePdfDate);
    const url = found || seed;
    const items = await parseBorderlinePdf(await download(url), label);
    borderline.push(...items);
    sources.borderline.push({ schedule: label, ...source(url, found, items.length) });
    log(`Borderline ${label.padEnd(12)} <- ${fileNameOf(url)}${found ? "" : " (fallback)"}: ${items.length}`);
  }

  // Cosmetics (1 merged PDF)
  let cosFound = null;
  for (const kw of KW_COSMETICS) {
    cosFound = html && discoverLink(html, SOURCE_PAGE, "pdf", kw, scorePdfDate);
    if (cosFound) break;
  }
  const cosUrl = cosFound || SEED_COSMETICS;
  log(`Cosmetics  <- ${fileNameOf(cosUrl)}${cosFound ? "" : " (fallback)"}`);
  const cosmetics = await parseCosmeticsPdf(await download(cosUrl));
  sources.cosmetics = [source(cosUrl, cosFound, cosmetics.length)];
  log(`           ${cosmetics.length} products`);

  if (!medicine.length) throw new Error("Medicine parse returned 0 rows — refusing to overwrite data");

  const write = (name, value) => fs.writeFile(path.join(OUT, name), JSON.stringify(value));
  await write("medicine.json", medicine);
  await write("borderline.json", borderline);
  await write("cosmetics.json", cosmetics);
  await fs.writeFile(
    path.join(OUT, "meta.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), sourcePage: SOURCE_PAGE, sources }, null, 2),
  );
  log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s -> data/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
