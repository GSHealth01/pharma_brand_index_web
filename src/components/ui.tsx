import MdiIcon from "@mdi/react";
import { mdiChevronRight, mdiLeaf, mdiLotionOutline, mdiPill } from "@mdi/js";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Category } from "../lib/api";
import { EmptyArt, type ArtKind } from "./AnimatedIcons";

export function Icon({ path, size = 22, className, style }: { path: string; size?: number; className?: string; style?: CSSProperties }) {
  return <MdiIcon path={path} size={`${size}px`} className={className} style={style} aria-hidden="true" />;
}

export const CATEGORY_META: Record<Category, { icon: string; gradient: string; soft: string; tint: string }> = {
  medicine: {
    icon: mdiPill,
    gradient: "linear-gradient(135deg, #FF6A00, #FF3B30, #EC167C)",
    soft: "#E4EBFB",
    tint: "#173CBF",
  },
  borderline: {
    icon: mdiLeaf,
    gradient: "linear-gradient(135deg, #EC167C, #B217B8)",
    soft: "#E1F2E9",
    tint: "#2FA36B",
  },
  cosmetics: {
    icon: mdiLotionOutline,
    gradient: "linear-gradient(135deg, #7426D8, #173CBF)",
    soft: "#FFE1EE",
    tint: "#EC167C",
  },
};

/** "Pharma Brand Index" wordmark with the app's three brand colours. */
export function Wordmark({ size = 20, sub = true, spaced = false }: { size?: number; sub?: boolean; spaced?: boolean }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      <span className="wordmark-main">
        <span style={{ color: "#F45A53" }}>Pharma </span>
        <span style={{ color: "#E02C76" }}>Brand </span>
        <span style={{ color: "#0081CC" }}>Index</span>
      </span>
      {sub && (
        <span className={spaced ? "wordmark-sub spaced" : "wordmark-sub"} style={{ fontSize: Math.max(9, Math.round(size * 0.5)) }}>
          Sri Lanka
        </span>
      )}
    </span>
  );
}

export function GradientHeading({ as: Tag = "h2", children, className = "" }: { as?: "h1" | "h2" | "h3"; children: ReactNode; className?: string }) {
  return <Tag className={`gradient-heading ${className}`}>{children}</Tag>;
}

export function Skeleton({ h = 16, w = "100%", r = 8, style }: { h?: number; w?: number | string; r?: number; style?: CSSProperties }) {
  return <span className="skeleton" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}

/** Bold the part of `text` that matches `query` (case-insensitive). */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${esc})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? <mark key={i}>{part}</mark> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

export type Crumb = { label: string; to?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <span key={i} className="crumb">
          {i > 0 && <Icon path={mdiChevronRight} size={16} className="crumb-sep" />}
          {c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function EmptyState({ art, title, children }: { art: ArtKind; title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <EmptyArt kind={art} />
      <h3>{title}</h3>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}
