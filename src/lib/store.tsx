import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Category, Product } from "./api";

// The mobile app keeps favorites/recents on the server behind login, which is
// dormant in the public build. The website keeps them in the browser instead.
const KEYS = {
  category: "pbi_selected_category",
  recents: "pbi_recent_searches",
  favorites: "pbi_favorites",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — keep in memory only */
  }
}

export const CATEGORIES: Category[] = ["medicine", "borderline", "cosmetics"];

export const CATEGORY_LABELS: Record<Category, string> = {
  medicine: "Medicines",
  borderline: "Borderline Products",
  cosmetics: "Cosmetics",
};

export const CATEGORY_SHORT: Record<Category, string> = {
  medicine: "Medicine",
  borderline: "Borderline",
  cosmetics: "Cosmetics",
};

export function isCategory(v: unknown): v is Category {
  return v === "medicine" || v === "borderline" || v === "cosmetics";
}

type Recents = Record<Category, string[]>;

type Store = {
  category: Category;
  setCategory: (c: Category) => void;
  recents: Recents;
  addRecent: (name: string, c: Category) => void;
  removeRecent: (name: string, c: Category) => void;
  clearRecents: (c: Category) => void;
  favorites: Product[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (p: Product) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [category, setCategoryState] = useState<Category>(() => {
    const v = read<string>(KEYS.category, "medicine");
    return isCategory(v) ? v : "medicine";
  });
  const [recents, setRecents] = useState<Recents>(() =>
    read<Recents>(KEYS.recents, { medicine: [], borderline: [], cosmetics: [] }),
  );
  const [favorites, setFavorites] = useState<Product[]>(() => read<Product[]>(KEYS.favorites, []));

  useEffect(() => {
    write(KEYS.category, category);
  }, [category]);
  useEffect(() => {
    write(KEYS.recents, recents);
  }, [recents]);
  useEffect(() => {
    write(KEYS.favorites, favorites);
  }, [favorites]);

  const addRecent = useCallback((name: string, c: Category) => {
    setRecents((r) => ({
      ...r,
      [c]: [name, ...(r[c] ?? []).filter((x) => x.toLowerCase() !== name.toLowerCase())].slice(0, 20),
    }));
  }, []);

  const removeRecent = useCallback((name: string, c: Category) => {
    setRecents((r) => ({ ...r, [c]: (r[c] ?? []).filter((x) => x !== name) }));
  }, []);

  const clearRecents = useCallback((c: Category) => {
    setRecents((r) => ({ ...r, [c]: [] }));
  }, []);

  const favIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  const toggleFavorite = useCallback((p: Product) => {
    setFavorites((list) =>
      list.some((x) => x.id === p.id) ? list.filter((x) => x.id !== p.id) : [{ ...p }, ...list],
    );
  }, []);

  const value: Store = {
    category,
    setCategory: setCategoryState,
    recents,
    addRecent,
    removeRecent,
    clearRecents,
    favorites,
    isFavorite: (id) => favIds.has(id),
    toggleFavorite,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
