import { mdiClose, mdiHistory, mdiLightbulbOnOutline } from "@mdi/js";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CategoryTabs } from "../components/CategoryTabs";
import { SearchBox, useOpenHit } from "../components/SearchBox";
import { GradientHeading, Icon, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { useStore } from "../lib/store";

export default function Search() {
  useDocumentTitle("Search");
  const [params, setParams] = useSearchParams();
  const { category, recents, removeRecent, clearRecents } = useStore();
  const { openGeneric } = useOpenHit();
  const popular = useAsync(() => api.popular(category), [category]);
  const recent = recents[category] ?? [];
  const med = category === "medicine";

  // Keep ?q= in the URL so searches can be bookmarked / shared.
  const onQueryChange = useCallback(
    (q: string) => setParams(q ? { q } : {}, { replace: true }),
    [setParams],
  );

  return (
    <div className="container page">
      <div className="search-layout">
        <div className="search-main">
          <GradientHeading as="h1">
            {med ? "Search by generic name and brand name" : "Search by product name and brand name"}
          </GradientHeading>
          <p className="subtitle">
            {med ? "Type generic or brand name and see suggestions" : "Type product or brand name and see suggestions"}
          </p>

          <div className="compact-tabs">
            <CategoryTabs />
          </div>

          <SearchBox variant="inline" examples={(popular.data?.results ?? []).slice(0, 5).map((p) => p.genericName)} autoFocus initialQuery={params.get("q") ?? ""} onQueryChange={onQueryChange} />

          <div className="hint-card">
            <span className="hint-icon"><Icon path={mdiLightbulbOnOutline} size={22} /></span>
            <div>
              <div className="hint-title">{med ? "Search by generic or brand name" : "Search by product or brand name"}</div>
              <div className="hint-sub">Type at least 2–3 letters to get better suggestions.</div>
            </div>
          </div>
        </div>

        <aside className="search-side">
          <section>
            <GradientHeading as="h2" className="h-sm">Popular Searches</GradientHeading>
            <div className="chips">
              {popular.loading
                ? [70, 110, 90, 60, 120, 80, 100].map((w, i) => <Skeleton key={i} h={40} w={w} r={12} />)
                : (popular.data?.results ?? []).slice(0, 12).map((p, i) => (
                    <button key={p.genericName} className="chip pop-in" style={{ animationDelay: `${i * 40}ms` }} data-ripple onClick={() => openGeneric(p.genericName, category)}>
                      {p.genericName}
                    </button>
                  ))}
            </div>
          </section>

          <section>
            <div className="card-head">
              <GradientHeading as="h2" className="h-sm">Recent Searches</GradientHeading>
              {recent.length > 0 && (
                <button className="link-pink" onClick={() => clearRecents(category)}>Clear all</button>
              )}
            </div>
            {recent.length === 0 ? (
              <p className="empty-text left">Your recent searches will show up here.</p>
            ) : (
              <ul className="card row-list">
                {recent.map((name) => (
                  <li key={name} className="row">
                    <button className="row-main" onClick={() => openGeneric(name, category)}>
                      <span className="row-icon"><Icon path={mdiHistory} size={20} /></span>
                      <span className="row-text">{name}</span>
                    </button>
                    <button className="row-x" aria-label={`Remove ${name}`} onClick={() => removeRecent(name, category)}>
                      <Icon path={mdiClose} size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
