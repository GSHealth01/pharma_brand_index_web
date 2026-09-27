import { mdiArrowLeft, mdiFilterVariant, mdiMagnify, mdiPill } from "@mdi/js";
import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ProductCard, ProductCardSkeleton } from "../components/ProductCard";
import { Breadcrumbs, EmptyState, GradientHeading, Icon } from "../components/ui";
import { api } from "../lib/api";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { CountUp, Reveal } from "../lib/motion";
import { CATEGORY_LABELS, isCategory } from "../lib/store";

type Sort = "az" | "za" | "mfr";

export default function Brands() {
  const { generic = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = params.get("category");
  const category = isCategory(qc) ? qc : "medicine";
  const { data, loading, error, retry } = useAsync(() => api.productsByGeneric(generic, category), [generic, category]);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("az");

  const display = data?.genericName || generic;
  useDocumentTitle(display);

  const items = data?.results ?? [];
  const forms = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((p) => p.dosageForm && m.set(p.dosageForm, (m.get(p.dosageForm) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list = items.filter(
      (p) =>
        (form === "all" || p.dosageForm === form) &&
        (!f || [p.brandName, p.manufacturer, p.strength, p.localAgent].some((v) => v?.toLowerCase().includes(f))),
    );
    const key = (p: (typeof list)[number]) => (sort === "mfr" ? p.manufacturer : p.brandName)?.toLowerCase() ?? "";
    list.sort((a, b) => key(a).localeCompare(key(b)));
    if (sort === "za") list.reverse();
    return list;
  }, [items, filter, form, sort]);

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Home", to: "/home" }, { label: CATEGORY_LABELS[category], to: "/search" }, { label: display }]} />

      <div className="page-title-row">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon path={mdiArrowLeft} size={24} />
        </button>
        <GradientHeading as="h1">Brand List</GradientHeading>
      </div>

      <div className="summary-card slide-in">
        <span className="summary-icon-soft"><Icon path={mdiPill} size={26} /></span>
        <div className="summary-text">
          <div className="summary-name">{display}</div>
          <div className="summary-count">{loading ? "Loading..." : <><CountUp to={items.length} duration={800} /> Brands found</>}</div>
        </div>
        <span className="summary-icon-grad spin-in"><Icon path={mdiPill} size={26} /></span>
      </div>

      {!loading && !error && items.length > 1 && (
        <div className="toolbar">
          <label className="filter-field">
            <Icon path={mdiMagnify} size={20} />
            <input
              type="search"
              placeholder="Filter by brand, manufacturer or strength"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </label>
          <label className="select-field">
            <Icon path={mdiFilterVariant} size={20} />
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="az">Brand A → Z</option>
              <option value="za">Brand Z → A</option>
              <option value="mfr">Manufacturer</option>
            </select>
          </label>
          {forms.length > 1 && (
            <div className="chips scroll-x">
              <button className={`chip sm ${form === "all" ? "on" : ""}`} onClick={() => setForm("all")}>
                All <span className="chip-count">{items.length}</span>
              </button>
              {forms.map(([f, n]) => (
                <button key={f} className={`chip sm ${form === f ? "on" : ""}`} onClick={() => setForm(f)}>
                  {f} <span className="chip-count">{n}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="card-grid">
          {Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <EmptyState art="error" title="Couldn't load brands">
          <p>{error}</p>
          <button className="btn-gradient" onClick={retry}>Retry</button>
        </EmptyState>
      ) : items.length === 0 ? (
        <EmptyState art="pill" title="No registered brands found.">
          <button className="btn-outline" onClick={() => navigate(-1)}>Go Back</button>
        </EmptyState>
      ) : shown.length === 0 ? (
        <p className="empty-text">No brands match your filter.</p>
      ) : (
        <>
          {shown.length !== items.length && <p className="result-note">Showing {shown.length} of {items.length}</p>}
          <div className="card-grid">
            {shown.map((p, i) => (
              <Reveal key={p.id} delay={(i % 6) * 60}>
                <ProductCard p={p} />
              </Reveal>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
