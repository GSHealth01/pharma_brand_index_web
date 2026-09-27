import { mdiArrowRight, mdiBottleTonicOutline, mdiLeaf, mdiPill } from "@mdi/js";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Wordmark } from "../components/ui";
import { api, type Category } from "../lib/api";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { CountUp, useParallax, useTilt, useTypewriter } from "../lib/motion";
import { useStore } from "../lib/store";

const ITEMS: { c: Category; icon: string; label: string; bg: string; tint: string }[] = [
  { c: "medicine", icon: mdiPill, label: "Medicines", bg: "#E4EBFB", tint: "#173CBF" },
  { c: "borderline", icon: mdiLeaf, label: "Borderline Products", bg: "#E1F2E9", tint: "#2FA36B" },
  { c: "cosmetics", icon: mdiBottleTonicOutline, label: "Cosmetics", bg: "#FFE1EE", tint: "#EC167C" },
];

// Decorative floating capsules / dots behind the hero (position, size, colour, speed).
const FLOATERS: { x: number; y: number; s: number; c: string; d: number; r: number; pill?: boolean }[] = [
  { x: 8, y: 14, s: 34, c: "#FF6A00", d: 9, r: -30, pill: true },
  { x: 86, y: 10, s: 26, c: "#7426D8", d: 11, r: 40, pill: true },
  { x: 78, y: 58, s: 38, c: "#EC167C", d: 10, r: 15, pill: true },
  { x: 14, y: 70, s: 22, c: "#173CBF", d: 12, r: 70, pill: true },
  { x: 46, y: 6, s: 10, c: "#EC167C", d: 7, r: 0 },
  { x: 92, y: 36, s: 12, c: "#FF3B30", d: 8, r: 0 },
  { x: 4, y: 44, s: 9, c: "#B217B8", d: 9, r: 0 },
  { x: 60, y: 84, s: 11, c: "#7426D8", d: 10, r: 0 },
];

export default function Welcome() {
  useDocumentTitle("");
  const navigate = useNavigate();
  const { setCategory } = useStore();
  const heroRef = useParallax<HTMLDivElement>(28);
  const catsRef = useTilt<HTMLDivElement>(6);
  const health = useAsync(() => api.health(), []);
  const typed = useTypewriter(["Paracetamol", "Panadol", "Amoxicillin", "Baby Cheramy", "Atorvastatin"]);

  const start = (c?: Category) => {
    if (c) setCategory(c);
    navigate("/home");
  };

  const counts = health.data
    ? [health.data.recordCount, health.data.borderline?.recordCount ?? 0, health.data.cosmetics?.recordCount ?? 0]
    : null;
  const total = counts?.reduce((a, b) => a + b, 0) ?? 0;

  return (
    <div className="welcome">
      <div className="welcome-bg" aria-hidden="true" ref={heroRef}>
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        {FLOATERS.map((f, i) => (
          <span
            key={i}
            className={f.pill ? "floater pill" : "floater dot"}
            style={
              {
                left: `${f.x}%`,
                top: `${f.y}%`,
                "--s": `${f.s}px`,
                "--c": f.c,
                "--d": `${f.d}s`,
                "--r": `${f.r}deg`,
                "--depth": (i % 3) + 1,
                animationDelay: `${-i * 1.3}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="container welcome-grid">
        <div className="welcome-hero stagger" style={{ "--i": 0 } as CSSProperties}>
          <div className="magnifier-wrap">
            <span className="pulse-ring" />
            <span className="pulse-ring r2" />
            <img src="/brand/magnifier.png" alt="Pharma Brand Index magnifying glass" className="welcome-magnifier" />
          </div>
        </div>

        <div className="welcome-copy">
          <h1 className="welcome-title stagger" style={{ "--i": 1 } as CSSProperties}>
            <Wordmark size={48} spaced />
          </h1>
          <p className="welcome-tagline stagger" style={{ "--i": 2 } as CSSProperties}>
            Find Medicines. Fast &amp; Easy.
          </p>
          <div className="typed-search stagger" style={{ "--i": 3 } as CSSProperties} aria-hidden="true">
            <span className="typed-label">Search</span>
            <span className="typed-text">{typed}</span>
            <span className="caret" />
          </div>

          <div className="welcome-cats stagger tilt" ref={catsRef} style={{ "--i": 4 } as CSSProperties}>
            {ITEMS.map((it, i) => (
              <button key={it.c} className="welcome-cat" onClick={() => start(it.c)} data-ripple>
                <span className="welcome-cat-icon" style={{ background: it.bg, color: it.tint }}>
                  <Icon path={it.icon} size={30} />
                </span>
                <span className="welcome-cat-label">{it.label}</span>
                <span className="welcome-cat-count">
                  {counts ? <CountUp to={counts[i]} /> : <span className="skeleton" style={{ width: 40, height: 12 }} />}
                </span>
              </button>
            ))}
          </div>

          <h2 className="welcome-heading stagger" style={{ "--i": 5 } as CSSProperties}>
            Welcome to <br className="show-mobile-inline" />
            Pharma Brand Index!
          </h2>
          <p className="welcome-body stagger" style={{ "--i": 6 } as CSSProperties}>
            Your quick and convenient source to explore medicines, borderline products and cosmetics with accurate and
            up-to-date information.
          </p>

          {total > 0 && (
            <p className="welcome-stat stagger" style={{ "--i": 7 } as CSSProperties}>
              <span className="live-dot" /> <CountUp to={total} className="stat-num" /> NMRA-registered products, refreshed daily
            </p>
          )}

          <button className="btn-gradient btn-xl stagger" style={{ "--i": 8 } as CSSProperties} onClick={() => start()} data-ripple>
            Get Started <Icon path={mdiArrowRight} size={24} className="arrow-nudge" />
          </button>
        </div>
      </div>

      <footer className="welcome-footer">
        <div className="welcome-footer-inner">
          <span className="powered">Powered by</span>
          <img src="/brand/gsh-white.webp" alt="George Steuart Health" className="welcome-gsh" draggable={false} />
        </div>
      </footer>
    </div>
  );
}
