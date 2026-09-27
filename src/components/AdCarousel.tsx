import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { useEffect, useRef, useState } from "react";
import type { Ad } from "../lib/api";
import { Icon } from "./ui";

/** Swipeable, auto-advancing banner carousel (4 s, pauses on hover / focus). */
export function AdCarousel({ ads }: { ads: Ad[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const go = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const n = (i + ads.length) % ads.length;
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    if (ads.length < 2 || paused) return;
    const id = setInterval(() => go(index + 1), 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, ads.length]);

  const onScroll = () => {
    const el = trackRef.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (ads.length === 0) return null;

  return (
    <section
      className="carousel"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="carousel-track" ref={trackRef} onScroll={onScroll}>
        {ads.map((ad, i) => {
          const img = ad.imageUrl ? <img src={ad.imageUrl} alt={ad.title || `Featured ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} draggable={false} /> : null;
          return (
            <div className="carousel-slide" key={ad.id} aria-roledescription="slide" aria-label={`${i + 1} of ${ads.length}`}>
              {ad.targetUrl ? (
                <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer">
                  {img}
                </a>
              ) : (
                img
              )}
            </div>
          );
        })}
      </div>
      {ads.length > 1 && (
        <>
          <button className="carousel-arrow left" aria-label="Previous" onClick={() => go(index - 1)}>
            <Icon path={mdiChevronLeft} size={26} />
          </button>
          <button className="carousel-arrow right" aria-label="Next" onClick={() => go(index + 1)}>
            <Icon path={mdiChevronRight} size={26} />
          </button>
          <div className="dots">
            {ads.map((_, i) => (
              <button key={i} className={`dot ${i === index ? "on" : ""} ${paused ? "paused" : ""}`} aria-label={`Go to slide ${i + 1}`} onClick={() => go(i)}>
                {i === index && !paused && <span key={index} className="dot-fill" />}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
