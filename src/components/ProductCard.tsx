import { mdiChevronRight, mdiFactory, mdiStar, mdiStarOutline } from "@mdi/js";
import { Link } from "react-router-dom";
import type { Product } from "../lib/api";
import { burst, useTilt } from "../lib/motion";
import { CATEGORY_SHORT, useStore } from "../lib/store";
import { Icon } from "./ui";

export function ProductCard({ p, showCategory, showGeneric }: { p: Product; showCategory?: boolean; showGeneric?: boolean }) {
  const { isFavorite, toggleFavorite } = useStore();
  const fav = isFavorite(p.id);
  const ref = useTilt<HTMLDivElement>(6);

  return (
    <div className="product-card tilt spotlight" ref={ref}>
      <Link to={`/product/${p.id}`} className="product-card-link" aria-label={`${p.brandName || p.genericName} details`} />
      <div className="pc-top">
        <h3 className="pc-brand">{p.brandName || p.genericName}</h3>
        <button
          className={`fav-btn ${fav ? "on" : ""}`}
          aria-pressed={fav}
          aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          title={fav ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => {
            if (!fav) burst(e.currentTarget);
            toggleFavorite(p);
          }}
        >
          <Icon path={fav ? mdiStar : mdiStarOutline} size={24} />
        </button>
      </div>
      {showCategory && p.category && <span className="badge">{CATEGORY_SHORT[p.category]}</span>}
      {showGeneric && p.brandName && p.genericName && <div className="pc-generic">{p.genericName}</div>}
      {(p.strength || p.dosageForm) && (
        <div className="pc-meta">
          {p.strength && <span>{p.strength}</span>}
          {p.strength && p.dosageForm && <i className="meta-dot" />}
          {p.dosageForm && <span>{p.dosageForm}</span>}
        </div>
      )}
      <div className="pc-bottom">
        <span className="pc-mfr">
          <Icon path={mdiFactory} size={16} />
          <span>{p.manufacturer || "—"}</span>
        </span>
        <Icon path={mdiChevronRight} size={22} className="pc-chev" />
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="product-card">
      <span className="skeleton" style={{ height: 22, width: "55%" }} />
      <span className="skeleton" style={{ height: 14, width: "40%", marginTop: 12 }} />
      <span className="skeleton" style={{ height: 14, width: "70%", marginTop: 14 }} />
    </div>
  );
}
