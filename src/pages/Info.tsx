import {
  mdiCalendarCheckOutline,
  mdiChevronRight,
  mdiFileDocumentOutline,
  mdiFormatQuoteOpen,
  mdiInformationOutline,
  mdiShieldLockOutline,
  mdiStar,
} from "@mdi/js";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import { EmptyState, GradientHeading, Icon, Wordmark } from "../components/ui";
import {
  ABOUT_PARAGRAPHS,
  ABOUT_QUOTE,
  ABOUT_QUOTE_AUTHOR,
  EFFECTIVE_DATE,
  PRIVACY_SECTIONS,
  TERMS_FOOTER,
  TERMS_SECTIONS,
  type LegalSection,
} from "../content/legal";
import type { Category } from "../lib/api";
import { useDocumentTitle } from "../lib/hooks";
import { Reveal } from "../lib/motion";
import { CATEGORIES, CATEGORY_SHORT, useStore } from "../lib/store";

export function Favorites() {
  useDocumentTitle("Favorites");
  const { favorites } = useStore();
  const [tab, setTab] = useState<"all" | Category>("all");
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    favorites.forEach((f) => (c[f.category ?? "medicine"] = (c[f.category ?? "medicine"] ?? 0) + 1));
    return c;
  }, [favorites]);
  const shown = tab === "all" ? favorites : favorites.filter((f) => (f.category ?? "medicine") === tab);

  return (
    <div className="container page">
      <div className="page-title-center">
        <GradientHeading as="h1">Favorites</GradientHeading>
        <p className="subtitle">Saved on this device</p>
      </div>
      {favorites.length === 0 ? (
        <EmptyState art="heart" title="No favorites yet">
          <p>Tap the star on any brand to save it here.</p>
          <Link to="/search" className="btn-gradient">Start searching</Link>
        </EmptyState>
      ) : (
        <>
          <div className="chips center">
            <button className={`chip sm ${tab === "all" ? "on" : ""}`} onClick={() => setTab("all")}>
              All <span className="chip-count">{favorites.length}</span>
            </button>
            {CATEGORIES.filter((c) => counts[c]).map((c) => (
              <button key={c} className={`chip sm ${tab === c ? "on" : ""}`} onClick={() => setTab(c)}>
                {CATEGORY_SHORT[c]} <span className="chip-count">{counts[c]}</span>
              </button>
            ))}
          </div>
          <div className="card-grid">
            {shown.map((p, i) => (
              <Reveal key={p.id} delay={(i % 6) * 60}>
                <ProductCard p={p} showCategory showGeneric />
              </Reveal>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const MORE_OPTIONS = [
  { icon: mdiInformationOutline, label: "About Pharma Brand Index", to: "/about" },
  { icon: mdiShieldLockOutline, label: "Privacy Policy", to: "/privacy" },
  { icon: mdiFileDocumentOutline, label: "Terms & Conditions", to: "/terms" },
];

export function More() {
  useDocumentTitle("More");
  const { favorites } = useStore();
  return (
    <div className="container narrow page">
      <div className="more-brand">
        <Wordmark size={26} spaced />
        <img src="/brand/gsh-color.png" alt="George Steuart Health" className="more-gsh" />
      </div>
      <ul className="card row-list">
        <li className="row slide-in">
          <Link to="/favorites" className="row-main lg" data-ripple>
            <span className="row-icon lg"><Icon path={mdiStar} size={22} /></span>
            <span className="row-text">Favorites</span>
            {favorites.length > 0 && <span className="count-pill">{favorites.length}</span>}
            <Icon path={mdiChevronRight} size={22} className="row-chev" />
          </Link>
        </li>
        {MORE_OPTIONS.map((o, i) => (
          <li key={o.to} className="row slide-in" style={{ animationDelay: `${(i + 1) * 70}ms` }}>
            <Link to={o.to} className="row-main lg" data-ripple>
              <span className="row-icon lg"><Icon path={o.icon} size={22} /></span>
              <span className="row-text">{o.label}</span>
              <Icon path={mdiChevronRight} size={22} className="row-chev" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function About() {
  useDocumentTitle("About");
  return (
    <div className="container narrow page">
      <div className="page-title-center">
        <GradientHeading as="h1">About Pharma Brand Index</GradientHeading>
      </div>
      <figure className="quote-card animated-gradient">
        <Icon path={mdiFormatQuoteOpen} size={32} />
        <blockquote>{ABOUT_QUOTE}</blockquote>
        <figcaption>{ABOUT_QUOTE_AUTHOR}</figcaption>
      </figure>
      <div className="card prose">
        {ABOUT_PARAGRAPHS.map((t, i) => (
          <Reveal as="p" key={i} delay={i * 120}>{t}</Reveal>
        ))}
      </div>
      <div className="about-cta">
        <Link to="/search" className="btn-gradient">Start searching</Link>
      </div>
    </div>
  );
}

function LegalPage({ title, sections, footer }: { title: string; sections: LegalSection[]; footer?: string }) {
  useDocumentTitle(title.replace(" of Use", ""));
  const toc = sections.filter((s) => s.heading);
  const slug = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="container page legal-layout">
      <div className="legal-main">
        <div className="page-title-center">
          <GradientHeading as="h1">{title}</GradientHeading>
          <span className="date-pill">
            <Icon path={mdiCalendarCheckOutline} size={14} /> Effective Date: {EFFECTIVE_DATE}
          </span>
        </div>
        <article className="card prose legal">
          {sections.map((s, i) => (
            <Reveal as="section" key={i} id={s.heading ? slug(s.heading) : undefined}>
              {s.heading && <h2>{s.heading}</h2>}
              {s.items.some((it) => it.kind === "bullet") ? (
                <>
                  {s.items.filter((it) => it.kind === "para").slice(0, 1).map((it, j) => <p key={j}>{it.text}</p>)}
                  <ul>
                    {s.items.filter((it) => it.kind === "bullet").map((it, j) => <li key={j}>{it.text}</li>)}
                  </ul>
                  {s.items.filter((it) => it.kind === "para").slice(1).map((it, j) => <p key={j}>{it.text}</p>)}
                </>
              ) : (
                s.items.map((it, j) =>
                  it.text.includes("@") ? (
                    <p key={j}><a href={`mailto:${it.text}`}>{it.text}</a></p>
                  ) : (
                    <p key={j} className={s.heading === "7. Contact" && j > 0 ? "tight" : undefined}>{it.text}</p>
                  ),
                )
              )}
            </Reveal>
          ))}
          {footer && <p className="legal-footer">{footer}</p>}
        </article>
      </div>
      <aside className="legal-toc">
        <div className="toc-title">On this page</div>
        {toc.map((s) => (
          <a key={s.heading} href={`#${slug(s.heading!)}`}>{s.heading}</a>
        ))}
      </aside>
    </div>
  );
}

export const Privacy = () => <LegalPage title="Privacy Policy" sections={PRIVACY_SECTIONS} />;
export const Terms = () => <LegalPage title="Terms & Conditions of Use" sections={TERMS_SECTIONS} footer={TERMS_FOOTER} />;

export function NotFound() {
  useDocumentTitle("Not found");
  return (
    <div className="container page">
      <EmptyState art="compass" title="Page not found">
        <p>The page you're looking for doesn't exist.</p>
        <Link to="/home" className="btn-gradient">Go Home</Link>
      </EmptyState>
    </div>
  );
}
