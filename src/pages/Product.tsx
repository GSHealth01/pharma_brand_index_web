import {
  mdiAccountOutline,
  mdiArrowLeft,
  mdiBottleTonicOutline,
  mdiBottleTonicPlusOutline,
  mdiBriefcaseOutline,
  mdiCalendarCheckOutline,
  mdiCalendarRange,
  mdiCalendarRemove,
  mdiCalendarStart,
  mdiCheck,
  mdiEarth,
  mdiFactory,
  mdiFileCertificateOutline,
  mdiFileDocumentOutline,
  mdiFlaskOutline,
  mdiFolderOutline,
  mdiFormatListBulleted,
  mdiHeart,
  mdiHeartOutline,
  mdiIdentifier,
  mdiLinkVariant,
  mdiMedicalBag,
  mdiPackageVariant,
  mdiPill,
} from "@mdi/js";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Breadcrumbs, EmptyState, GradientHeading, Icon, Skeleton } from "../components/ui";
import { api, type Product as P } from "../lib/api";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { burst, useTilt } from "../lib/motion";
import { CATEGORY_LABELS, useStore } from "../lib/store";

type Row = { icon: string; label: string; value: string };

// Same field visibility rules as the mobile app's Product Details screen.
const HIDDEN: Record<string, Set<string>> = {
  medicine: new Set(["Registration No."]),
  borderline: new Set(["Registration No.", "Issue Date", "Reg. Type", "Validity Start", "Valid Years", "File No."]),
  cosmetics: new Set(["Expiry Date"]),
};

function rowsFor(p: P): Row[] {
  const cat = p.category ?? "medicine";
  return (
    [
      { icon: mdiBottleTonicOutline, label: cat === "medicine" ? "Generic Name" : "Product Name", value: p.genericName },
      { icon: mdiFlaskOutline, label: "Strength", value: p.strength },
      { icon: mdiBriefcaseOutline, label: "Pack Size", value: p.packSize },
      { icon: mdiPill, label: "Dosage Form", value: p.dosageForm },
      { icon: mdiFactory, label: "Manufacturer", value: p.manufacturer },
      { icon: mdiAccountOutline, label: "Local Agent", value: p.localAgent },
      { icon: mdiEarth, label: "Country", value: p.country },
      { icon: mdiFileCertificateOutline, label: "Schedule", value: p.schedule },
      { icon: mdiIdentifier, label: "Registration No.", value: p.registrationNumber || "" },
      { icon: mdiCalendarCheckOutline, label: "Issue Date", value: p.issueDate || "" },
      { icon: mdiFileDocumentOutline, label: "Reg. Type", value: p.regType || "" },
      { icon: mdiCalendarStart, label: "Validity Start", value: p.validityStart || "" },
      { icon: mdiCalendarRange, label: "Valid Years", value: p.validYear || "" },
      { icon: mdiFolderOutline, label: "File No.", value: p.fileNo || "" },
      { icon: mdiCalendarRemove, label: "Expiry Date", value: p.expiryDate || "" },
    ] as Row[]
  ).filter((r) => !!r.value && !HIDDEN[cat]?.has(r.label));
}

export default function Product() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: p, loading, error, retry } = useAsync(() => api.product(id), [id]);
  const { isFavorite, toggleFavorite } = useStore();
  const [copied, setCopied] = useState(false);
  const heroRef = useTilt<HTMLDivElement>(5);
  useDocumentTitle(p?.brandName || p?.genericName || "Product Details");

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p?.brandName, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* user cancelled */
    }
  };

  if (loading) return <ProductSkeleton />;

  if (error || !p) {
    return (
      <div className="container page">
        <EmptyState art="error" title="Data unavailable">
          {error && <p>{error}</p>}
          <button className="btn-gradient" onClick={retry}>Retry</button>
        </EmptyState>
      </div>
    );
  }

  const cat = p.category ?? "medicine";
  const fav = isFavorite(p.id);
  const heroIcon = cat === "cosmetics" ? mdiBottleTonicPlusOutline : cat === "borderline" ? mdiMedicalBag : mdiPackageVariant;
  const brandsUrl = `/brands/${encodeURIComponent(p.genericName)}?category=${cat}`;

  return (
    <div className="container page">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/home" },
          { label: p.genericName || CATEGORY_LABELS[cat], to: p.genericName ? brandsUrl : undefined },
          { label: p.brandName || "Product" },
        ]}
      />

      <div className="page-title-row">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon path={mdiArrowLeft} size={24} />
        </button>
        <GradientHeading as="h1">Product Details</GradientHeading>
        <div className="title-actions">
          <button className="icon-btn" onClick={share} aria-label="Share" title={copied ? "Link copied" : "Share"}>
            <Icon path={copied ? mdiCheck : mdiLinkVariant} size={22} />
          </button>
          <button
            className={`icon-btn ${fav ? "on" : ""}`}
            onClick={(e) => {
              if (!fav) burst(e.currentTarget, 16);
              toggleFavorite(p);
            }}
            aria-pressed={fav}
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            title={fav ? "Remove from favorites" : "Add to favorites"}
          >
            <Icon path={fav ? mdiHeart : mdiHeartOutline} size={24} />
          </button>
        </div>
      </div>
      {copied && <div className="toast" role="status">Link copied to clipboard</div>}

      <div className="product-layout">
        <div className="product-hero tilt spotlight" ref={heroRef}>
          <div className="hero-text">
            <span className="badge">{CATEGORY_LABELS[cat]}</span>
            <h2 className="hero-brand">{p.brandName || "—"}</h2>
            {(p.genericName || p.dosageForm || p.strength) && (
              <p className="hero-desc">{[p.genericName, p.dosageForm, p.strength].filter(Boolean).join(" ")}</p>
            )}
            {p.dosageForm || p.strength ? (
              <div className="hero-chips">
                {p.dosageForm && (
                  <>
                    <span className="hero-chip-icon"><Icon path={mdiPill} size={16} /></span>
                    <span className="hero-chip">{p.dosageForm}</span>
                  </>
                )}
                {p.dosageForm && p.strength && <i className="meta-dot" />}
                {p.strength && <span className="hero-chip">{p.strength}</span>}
              </div>
            ) : p.country ? (
              <div className="hero-chips">
                <span className="hero-chip-icon"><Icon path={mdiEarth} size={16} /></span>
                <span className="hero-chip">{p.country}</span>
              </div>
            ) : null}
            {p.genericName && (
              <Link to={brandsUrl} className="btn-outline sm hero-link">
                <Icon path={mdiFormatListBulleted} size={18} /> All brands of {p.genericName}
              </Link>
            )}
          </div>
          <div className="hero-box float">
            <Icon path={heroIcon} size={72} />
          </div>
        </div>

        <section className="info-card">
          <GradientHeading as="h2" className="h-sm">Product Information</GradientHeading>
          <dl className="info-list">
            {rowsFor(p).map((r, i) => (
              <div key={r.label} className="info-row row-in" style={{ animationDelay: `${120 + i * 55}ms` }}>
                <dt>
                  <span className="info-icon"><Icon path={r.icon} size={18} /></span>
                  {r.label}
                </dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="container page">
      <Skeleton h={14} w={220} />
      <Skeleton h={30} w={260} style={{ margin: "24px auto 20px", display: "block" }} />
      <div className="product-layout">
        <Skeleton h={220} r={16} />
        <div className="info-card">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skel-row">
              <Skeleton h={34} w={34} r={8} />
              <Skeleton h={14} w={`${50 + ((i * 13) % 40)}%`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
