// By default the site calls its own /api (api/handler.ts, data synced from NMRA).
// VITE_EXTERNAL_API_URL points it at another backend with the same endpoints instead.
// The old VITE_API_BASE_URL is deliberately ignored: a leftover value in hosting settings
// kept deployments pointing at the retired Emergent backend.
const BASE = ((import.meta.env.VITE_EXTERNAL_API_URL as string | undefined) ?? "").trim().replace(/\/$/, "");

export type Category = "medicine" | "borderline" | "cosmetics";

export type Product = {
  id: string;
  genericName: string;
  genericRaw: string;
  brandName: string;
  manufacturer: string;
  localAgent: string;
  dosageForm: string;
  strength: string;
  packSize: string;
  country: string;
  schedule: string;
  registrationNumber: string;
  category?: Category;
  issueDate?: string;
  regType?: string;
  validityStart?: string;
  validYear?: string;
  fileNo?: string;
  expiryDate?: string;
};

export type Ad = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  targetUrl?: string;
};

export type SearchHit =
  | { type: "generic"; genericName: string; brandCount: number }
  | {
      type: "brand";
      brandName: string;
      genericName: string;
      productId: string;
      strength: string;
      dosageForm: string;
      manufacturer: string;
    };

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data?.detail || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

const enc = encodeURIComponent;

export const api = {
  search: (q: string, category: Category, signal?: AbortSignal) =>
    get<{ results: SearchHit[] }>(`/api/search?q=${enc(q)}&category=${enc(category)}`, signal),
  popular: (category: Category) =>
    get<{ results: { genericName: string; count: number }[] }>(`/api/generics/popular?category=${enc(category)}`),
  productsByGeneric: (generic: string, category: Category) =>
    get<{ genericName: string; brandCount: number; results: Product[] }>(
      `/api/products?generic=${enc(generic)}&category=${enc(category)}`,
    ),
  product: (id: string) => get<Product>(`/api/products/${enc(id)}`),
  ads: () => get<{ results: Ad[] }>("/api/ads"),
  health: () =>
    get<{
      recordCount: number;
      lastSuccessfulRefresh?: string;
      borderline?: { recordCount: number };
      cosmetics?: { recordCount: number };
    }>("/api/health"),
};
