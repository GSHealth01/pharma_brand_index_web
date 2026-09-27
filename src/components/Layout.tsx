import {
  mdiDotsHorizontal,
  mdiHeartOutline,
  mdiHomeVariant,
  mdiMagnify,
  mdiHeart,
} from "@mdi/js";
import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { BackToTop, ScrollProgress } from "../lib/motion";
import { useStore } from "../lib/store";
import { Icon, Wordmark } from "./ui";

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="app-shell">
      <ScrollProgress />
      <a href="#main" className="skip-link">Skip to content</a>
      <TopNav />
      <main id="main" className="main">
        <div key={pathname} className="page-transition">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
      <BackToTop />
      <BottomNav />
    </div>
  );
}

function TopNav() {
  const { favorites } = useStore();
  const link = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? "active" : ""}`;

  return (
    <header className="topnav">
      <div className="container topnav-inner">
        <Link to="/home" className="topnav-brand" aria-label="Pharma Brand Index home">
          <img src="/brand/magnifier.png" alt="" className="topnav-logo" />
          <Wordmark size={20} />
        </Link>

        <nav className="topnav-links" aria-label="Main">
          <NavLink to="/home" className={link}>Home</NavLink>
          <NavLink to="/search" className={link}>Search</NavLink>
          <NavLink to="/favorites" className={link}>
            Favorites{favorites.length > 0 && <span className="count-pill">{favorites.length}</span>}
          </NavLink>
          <NavLink to="/about" className={link}>About</NavLink>
        </nav>

        <div className="topnav-right">
          <img src="/brand/gsh-color.png" alt="George Steuart Health" className="topnav-gsh" />
          <Link to="/favorites" className="icon-btn show-mobile" aria-label="Favorites">
            <Icon path={favorites.length ? mdiHeart : mdiHeartOutline} size={24} />
            {favorites.length > 0 && <span className="icon-badge">{favorites.length}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  const is = (p: string) => pathname.startsWith(p);
  const moreActive = ["/more", "/about", "/privacy", "/terms"].some(is);

  return (
    <nav className="bottomnav" aria-label="Main">
      <NavLink to="/home" className={`tab ${is("/home") ? "active" : ""}`}>
        <Icon path={mdiHomeVariant} size={26} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/search" className={`tab tab-fab ${is("/search") ? "active" : ""}`}>
        <span className="fab">
          <Icon path={mdiMagnify} size={30} />
        </span>
        <span>Search</span>
      </NavLink>
      <NavLink to="/more" className={`tab ${moreActive ? "active" : ""}`}>
        <Icon path={mdiDotsHorizontal} size={30} />
        <span>More</span>
      </NavLink>
    </nav>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="powered">Powered by</span>
          <img src="/brand/gsh-white.webp" alt="George Steuart Health" className="footer-gsh" draggable={false} />
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/about">About Pharma Brand Index</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms &amp; Conditions</Link>
        </nav>
        <p className="footer-note">
          Product information is sourced from the official National Medicines Regulatory Authority (NMRA) website.
          <br />© {new Date().getFullYear()} George Steuart Health (Pvt) Ltd. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
