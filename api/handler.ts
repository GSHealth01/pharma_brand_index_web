// Pharma Brand Index API — serves the same /api/* endpoints as the original FastAPI
// backend, from the JSON produced by `npm run sync-data` (straight from NMRA sources).
//
// Runs as a single Vercel Function (vercel.json rewrites /api/* here) and, in local
// development, as Vite middleware (see vite.config.ts). Kept dependency-free and in one
// file so it deploys without a build step.
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

type Category = "medicine" | "borderline" | "cosmetics";
type Product = { id: string; genericName: string; brandName: string; [k: string]: string };
type Ad = { id: string; image: string; targetUrl: string; sortOrder: number };
type Source = { url: string; filename: string; discovered: boolean; records: number; schedule?: string };
type Meta = { generatedAt: string; sourcePages: string[]; sources: Record<Category, Source[]> };

type Dataset = {
  products: Product[];
  byId: Map<string, Product>;
  byGeneric: Map<string, Product[]>;
  /** normalized generic -> display name (last seen wins, insertion order = first seen, like the Python dict) */
  display: Map<string, string>;
};

const normKey = (s: string | undefined) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();

let cache: { data: Record<Category, Dataset>; meta: Meta; ads: Ad[] } | null = null;

function dataDir() {
  const candidates = [process.env.PBI_DATA_DIR, path.join(process.cwd(), "data")].filter(Boolean) as string[];
  const found = candidates.find((d) => fs.existsSync(path.join(d, "medicine.json")));
  if (!found) throw new Error("Data not found. Run `npm run sync-data` first.");
  return found;
}

function load() {
  if (cache) return cache;
  const dir = dataDir();
  const read = <T,>(f: string): T => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as T;
  const index = (products: Product[]): Dataset => {
    const byId = new Map<string, Product>();
    const byGeneric = new Map<string, Product[]>();
    const display = new Map<string, string>();
    for (const p of products) {
      byId.set(p.id, p);
      const k = normKey(p.genericName);
      if (!k) continue;
      if (!byGeneric.has(k)) byGeneric.set(k, []);
      byGeneric.get(k)!.push(p);
      display.set(k, p.genericName);
    }
    return { products, byId, byGeneric, display };
  };
  cache = {
    data: {
      medicine: index(read<Product[]>("medicine.json")),
      borderline: index(read<Product[]>("borderline.json")),
      cosmetics: index(read<Product[]>("cosmetics.json")),
    },
    meta: read<Meta>("meta.json"),
    ads: read<Ad[]>("ads.json"),
  };
  return cache;
}

const asCategory = (c: string | null): Category => (c === "borderline" || c === "cosmetics" ? c : "medicine");
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const clampInt = (v: string | null, def: number, max: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : def;
};

export type ApiResult = { status: number; body: unknown; cache?: string };

/** Pure request -> response function shared by Vercel and the Vite dev server. */
export function handleApi(route: string, q: URLSearchParams, origin: string): ApiResult {
  const { data, meta, ads } = load();
  const r = route.replace(/^\/+|\/+$/g, "");
  const ok = (body: unknown, cacheSecs = 3600): ApiResult => ({
    status: 200,
    body,
    cache: `public, s-maxage=${cacheSecs}, stale-while-revalidate=86400`,
  });

  if (r === "health" || r === "") {
    const stats = (c: Category) => ({ recordCount: data[c].products.length, genericCount: data[c].byGeneric.size, sources: meta.sources[c] });
    const med = meta.sources.medicine[0];
    return ok(
      {
        status: "ok",
        source: "nmra-direct",
        ...stats("medicine"),
        lastSuccessfulRefresh: meta.generatedAt,
        currentSourceUrl: med?.url,
        currentSourceFilename: med?.filename,
        sourcePageUrl: meta.sourcePages[0],
        sourcePages: meta.sourcePages,
        borderline: stats("borderline"),
        cosmetics: stats("cosmetics"),
      },
      300,
    );
  }

  if (r === "search" || r === "generics") {
    const raw = (q.get("q") ?? "").trim();
    const key = raw.toLowerCase();
    const cat = r === "generics" ? "medicine" : asCategory(q.get("category"));
    const limit = clampInt(q.get("limit"), 20, 100);
    if (key.length < 2) return ok({ query: raw, results: [], category: cat });
    const ds = data[cat];

    const generics: { name: string; count: number; starts: boolean }[] = [];
    for (const [k, name] of ds.display) {
      if (k.includes(key)) generics.push({ name, count: ds.byGeneric.get(k)!.length, starts: name.toLowerCase().startsWith(key) });
    }
    generics.sort((a, b) => Number(!a.starts) - Number(!b.starts) || cmp(a.name, b.name));

    if (r === "generics") {
      return ok({ query: key, results: generics.slice(0, limit).map((g) => ({ genericName: g.name, brandCount: g.count })) });
    }

    const brands: { hit: Record<string, string>; starts: boolean }[] = [];
    const seen = new Set<string>();
    for (const p of ds.products) {
      if (!p.brandName) continue;
      const bkey = normKey(p.brandName);
      const other = cat !== "medicine" && ["manufacturer", "localAgent", "country", "registrationNumber"].some((f) => normKey(p[f]).includes(key));
      if (!bkey.includes(key) && !other) continue;
      if (seen.has(bkey)) continue;
      seen.add(bkey);
      brands.push({
        hit: {
          type: "brand",
          brandName: p.brandName,
          genericName: p.genericName ?? "",
          productId: p.id,
          strength: p.strength ?? "",
          dosageForm: p.dosageForm ?? "",
          manufacturer: p.manufacturer ?? "",
        },
        starts: bkey.startsWith(key),
      });
    }
    brands.sort((a, b) => Number(!a.starts) - Number(!b.starts) || cmp(a.hit.brandName, b.hit.brandName));

    const results = [
      ...generics.map((g) => ({ type: "generic", genericName: g.name, brandCount: g.count })),
      ...brands.map((b) => b.hit),
    ].slice(0, limit);
    return ok({ query: raw, results, category: cat });
  }

  if (r === "generics/popular") {
    // The original ranked by users' recent searches (MongoDB); without a database we use
    // its fallback ordering: generics with the most registered brands first.
    const cat = asCategory(q.get("category"));
    const ds = data[cat];
    const limit = clampInt(q.get("limit"), 12, 100);
    const ranked = [...ds.display.entries()]
      .map(([k, name], i) => ({ name, n: ds.byGeneric.get(k)!.length, i }))
      .sort((a, b) => b.n - a.n || a.i - b.i)
      .slice(0, limit)
      .map((g) => ({ genericName: g.name, count: g.n }));
    return ok({ results: ranked, category: cat });
  }

  if (r === "products") {
    const cat = asCategory(q.get("category"));
    const generic = q.get("generic") ?? "";
    const k = normKey(generic);
    const items = data[cat].byGeneric.get(k) ?? [];
    return ok({
      genericName: data[cat].display.get(k) ?? generic,
      brandCount: items.length,
      results: items.slice(0, clampInt(q.get("limit"), 200, 1000)),
      category: cat,
    });
  }

  const productMatch = /^products\/([^/]+)$/.exec(r);
  if (productMatch) {
    const id = decodeURIComponent(productMatch[1]);
    const ds = id.startsWith("bp_") ? data.borderline : id.startsWith("cos_") ? data.cosmetics : data.medicine;
    const p = ds.byId.get(id);
    return p ? ok(p) : { status: 404, body: { detail: "Product not found" } };
  }

  if (r === "ads") {
    const results = [...ads]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((a) => ({
        id: a.id,
        title: "",
        subtitle: "",
        eyebrow: "",
        imageUrl: /^https?:/.test(a.image) ? a.image : origin + a.image,
        actionText: "",
        targetUrl: a.targetUrl,
        active: true,
        sortOrder: a.sortOrder,
      }));
    return ok({ results });
  }

  return { status: 404, body: { detail: "Not Found" } };
}

/** Vercel Function entry: /api/<route> is rewritten to /api/handler?__route=<route>. */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string) || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const url = new URL(req.url || "/", origin);
  const route = url.searchParams.get("__route") ?? url.pathname.replace(/^\/api\/?/, "");
  url.searchParams.delete("__route");

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ detail: "Method Not Allowed" }));
    return;
  }

  let result: ApiResult;
  try {
    result = handleApi(route, url.searchParams, origin);
  } catch (e) {
    result = { status: 500, body: { detail: (e as Error).message } };
  }
  res.statusCode = result.status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (result.cache) res.setHeader("Cache-Control", result.cache);
  res.end(JSON.stringify(result.body));
}
