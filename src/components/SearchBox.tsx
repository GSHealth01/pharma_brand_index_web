import { mdiClose, mdiMagnify, mdiPackageVariantClosed, mdiPill, mdiChevronRight, mdiAlertCircleOutline } from "@mdi/js";
import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Category, SearchHit } from "../lib/api";
import { useLiveSearch } from "../lib/hooks";
import { useTypewriter } from "../lib/motion";
import { useStore } from "../lib/store";
import { Highlight, Icon } from "./ui";

export function placeholderFor(c: Category) {
  return c === "medicine" ? "Search by generic or brand name..." : "Search by product or brand name...";
}

export function noResultsFor(c: Category) {
  return c === "borderline"
    ? "No borderline products found for this name."
    : c === "cosmetics"
      ? "No cosmetics products found for this name."
      : "No medicines found for this generic name.";
}

export function useOpenHit() {
  const navigate = useNavigate();
  const { addRecent } = useStore();
  return {
    openGeneric: (name: string, c: Category) => {
      addRecent(name, c);
      navigate(`/brands/${encodeURIComponent(name)}?category=${c}`);
    },
    openHit: (hit: SearchHit, c: Category) => {
      if (hit.type === "brand") {
        if (hit.genericName) addRecent(hit.genericName, c);
        navigate(`/product/${hit.productId}`);
      } else {
        addRecent(hit.genericName, c);
        navigate(`/brands/${encodeURIComponent(hit.genericName)}?category=${c}`);
      }
    },
  };
}

type Props = {
  /** "dropdown" floats results under the input (Home); "inline" renders them below in flow (Search page). */
  variant: "dropdown" | "inline";
  initialQuery?: string;
  autoFocus?: boolean;
  onQueryChange?: (q: string) => void;
  size?: "lg" | "md";
  /** Example terms typed into the placeholder while the box is empty. */
  examples?: string[];
};

export function SearchBox({ variant, initialQuery = "", autoFocus, onQueryChange, size = "lg", examples = [] }: Props) {
  const { category } = useStore();
  const { openHit } = useOpenHit();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(variant === "inline");
  const [active, setActive] = useState(-1);
  const { results, loading, error, active: searching } = useLiveSearch(query, category);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const typed = useTypewriter(examples);
  const placeholder = examples.length && !focused && typed ? `Try “${typed}”` : placeholderFor(category);

  useEffect(() => {
    setActive(-1);
  }, [results]);
  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  // "/" focuses the search from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(t.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (variant !== "dropdown") return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [variant]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      const hit = results[active >= 0 ? active : 0];
      if (hit) openHit(hit, category);
    } else if (e.key === "Escape") {
      if (query) setQuery("");
      else inputRef.current?.blur();
      if (variant === "dropdown") setOpen(false);
    }
  };

  const showPanel = searching && (variant === "inline" || open);

  return (
    <div className={`searchbox searchbox-${variant} searchbox-${size}`} ref={wrapRef}>
      <div className="search-field">
        <Icon path={mdiMagnify} size={size === "lg" ? 26 : 22} className="search-icon" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label={placeholderFor(category)}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
        />
        {loading && <span className="spinner" aria-label="Loading" />}
        {query && (
          <button
            type="button"
            className="clear-btn"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <Icon path={mdiClose} size={16} />
          </button>
        )}
        {!query && <kbd className="kbd-hint">/</kbd>}
      </div>

      {showPanel && (
        <div className="search-panel" id={listId} role="listbox">
          {error ? (
            <div className="search-msg error">
              <Icon path={mdiAlertCircleOutline} size={20} /> {error}
            </div>
          ) : loading && results.length === 0 ? (
            <div className="search-skel">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skel-row">
                  <span className="skeleton" style={{ width: 34, height: 34, borderRadius: 17 }} />
                  <span className="skeleton" style={{ height: 14, width: `${60 - i * 8}%` }} />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="search-msg">{noResultsFor(category)}</div>
          ) : (
            <>
              <div className="search-panel-head">
                {results.length} suggestion{results.length === 1 ? "" : "s"}
                <span className="hide-mobile">
                  <kbd>↑</kbd> <kbd>↓</kbd> to navigate · <kbd>Enter</kbd> to open
                </span>
              </div>
              <ul>
                {results.map((hit, i) => (
                  <SuggestionRow
                    key={`${hit.type}-${hit.type === "brand" ? hit.productId : hit.genericName}-${i}`}
                    id={`${listId}-${i}`}
                    index={i}
                    hit={hit}
                    query={query}
                    active={i === active}
                    onHover={() => setActive(i)}
                    onSelect={() => openHit(hit, category)}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionRow({
  hit,
  query,
  active,
  id,
  index,
  onHover,
  onSelect,
}: {
  hit: SearchHit;
  query: string;
  active: boolean;
  id: string;
  index: number;
  onHover: () => void;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const isBrand = hit.type === "brand";
  const label = isBrand ? hit.brandName : hit.genericName;
  const meta = isBrand
    ? [hit.genericName, [hit.strength, hit.dosageForm].filter(Boolean).join(" · ")].filter(Boolean).join(" — ")
    : `${hit.brandCount} brand${hit.brandCount === 1 ? "" : "s"}`;

  return (
    <li
      ref={ref}
      id={id}
      role="option"
      aria-selected={active}
      className={`suggestion ${active ? "active" : ""}`}
      style={{ "--i": Math.min(index, 12) } as React.CSSProperties}
      onMouseEnter={onHover}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
    >
      <span className={`sugg-icon ${isBrand ? "brand" : ""}`}>
        <Icon path={isBrand ? mdiPackageVariantClosed : mdiPill} size={18} />
      </span>
      <span className="sugg-text">
        <span className="sugg-label">
          <Highlight text={label} query={query} />
        </span>
        <span className="sugg-meta">{meta}</span>
      </span>
      <span className={`sugg-tag ${isBrand ? "brand" : ""}`}>{isBrand ? "Brand" : "Generic"}</span>
      <Icon path={mdiChevronRight} size={20} className="sugg-chev" />
    </li>
  );
}
