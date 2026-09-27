import { mdiChevronRight, mdiClose, mdiHistory, mdiTrendingUp } from "@mdi/js";
import { Link } from "react-router-dom";
import { AdCarousel } from "../components/AdCarousel";
import { CategoryTabs } from "../components/CategoryTabs";
import { SearchBox, useOpenHit } from "../components/SearchBox";
import { WaveHand } from "../components/AnimatedIcons";
import { Icon, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { Reveal } from "../lib/motion";
import { CATEGORY_LABELS, useStore } from "../lib/store";

export default function Home() {
  useDocumentTitle("Home");
  const { category, recents, removeRecent } = useStore();
  const { openGeneric } = useOpenHit();
  const ads = useAsync(() => api.ads(), []);
  const popular = useAsync(() => api.popular(category), [category]);
  const recent = recents[category] ?? [];

  const sub =
    category === "borderline"
      ? "Explore registered borderline products"
      : category === "cosmetics"
        ? "Explore registered cosmetics products"
        : "Find medicines quickly and easily";

  return (
    <>
      <section className="home-hero">
        <div className="container">
          <div className="greeting">
            <h1>Hello <WaveHand size={30} /></h1>
            <p>{sub}</p>
          </div>
          <CategoryTabs />
          <SearchBox variant="dropdown" examples={(popular.data?.results ?? []).slice(0, 5).map((p) => p.genericName)} />
        </div>
      </section>

      <div className="container home-grid">
        <Reveal className="home-main" effect="zoom">
          {ads.loading ? (
            <Skeleton h={0} r={20} style={{ aspectRatio: "16 / 9", height: "auto" }} />
          ) : (
            <AdCarousel ads={ads.data?.results ?? []} />
          )}
        </Reveal>

        <aside className="home-side">
          <Reveal as="section" className="card" effect="left" delay={120}>
            <div className="card-head">
              <h2 className="section-title">
                <Icon path={mdiHistory} size={22} /> Recently Searched
              </h2>
              <Link to="/search" className="link-pink">View all</Link>
            </div>
            {recent.length === 0 ? (
              <p className="empty-text">No recent searches yet. Tap search to begin.</p>
            ) : (
              <ul className="row-list">
                {recent.slice(0, 6).map((name) => (
                  <li key={name} className="row">
                    <button className="row-main" onClick={() => openGeneric(name, category)}>
                      <span className="row-icon"><Icon path={mdiHistory} size={20} /></span>
                      <span className="row-text">{name}</span>
                      <Icon path={mdiChevronRight} size={22} className="row-chev" />
                    </button>
                    <button className="row-x" aria-label={`Remove ${name}`} onClick={() => removeRecent(name, category)}>
                      <Icon path={mdiClose} size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Reveal>

          <Reveal as="section" className="card" effect="left" delay={240}>
            <div className="card-head">
              <h2 className="section-title">
                <Icon path={mdiTrendingUp} size={22} /> Popular in {CATEGORY_LABELS[category]}
              </h2>
            </div>
            <div className="chips">
              {popular.loading
                ? [70, 110, 90, 60, 120, 80].map((w, i) => <Skeleton key={i} h={40} w={w} r={12} />)
                : (popular.data?.results ?? []).slice(0, 10).map((p, i) => (
                    <button key={p.genericName} className="chip pop-in" style={{ animationDelay: `${i * 40}ms` }} data-ripple onClick={() => openGeneric(p.genericName, category)}>
                      {p.genericName}
                    </button>
                  ))}
            </div>
          </Reveal>
        </aside>
      </div>
    </>
  );
}
