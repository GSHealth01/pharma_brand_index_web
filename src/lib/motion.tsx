import { mdiArrowUp } from "@mdi/js";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { Icon } from "../components/ui";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fires once when the element scrolls into view. */
export function useInView<T extends Element>(opts: IntersectionObserverInit = { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, opts);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);
  return { ref, inView };
}

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  /** fade-up (default), fade, zoom, left, right */
  effect?: "up" | "fade" | "zoom" | "left" | "right";
  className?: string;
  style?: CSSProperties;
  id?: string;
};

/** Scroll-triggered entrance animation. */
export function Reveal({ children, as: Tag = "div", delay = 0, effect = "up", className = "", style, id }: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref}
      id={id}
      className={`reveal reveal-${effect} ${inView ? "in" : ""} ${className}`}
      style={{ ...style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Animated number that counts up (ease-out) once visible. */
export function CountUp({ to, duration = 1400, className }: { to: number; duration?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setVal(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setVal(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return (
    <span ref={ref} className={className}>
      {val.toLocaleString()}
    </span>
  );
}

/**
 * 3D tilt + cursor spotlight. Writes --rx/--ry (rotation) and --mx/--my (pointer %)
 * as CSS variables so all the visuals live in CSS.
 */
export function useTilt<T extends HTMLElement>(max = 8) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !window.matchMedia("(hover: hover)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${(0.5 - y) * max}deg`);
        el.style.setProperty("--ry", `${(x - 0.5) * max}deg`);
        el.style.setProperty("--mx", `${x * 100}%`);
        el.style.setProperty("--my", `${y * 100}%`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [max]);
  return ref;
}

/** Parallax: element drifts toward the cursor across the whole window. */
export function useParallax<T extends HTMLElement>(strength = 18) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !window.matchMedia("(hover: hover)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--px", `${x * strength}px`);
        el.style.setProperty("--py", `${y * strength}px`);
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [strength]);
  return ref;
}

/** Material-style ripple on any element marked with [data-ripple] (delegated, one listener). */
export function useGlobalRipple() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const onDown = (e: PointerEvent) => {
      const host = (e.target as HTMLElement).closest<HTMLElement>("[data-ripple]");
      if (!host) return;
      const r = host.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const span = document.createElement("span");
      span.className = "ripple";
      span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      host.appendChild(span);
      span.addEventListener("animationend", () => span.remove());
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
}

const BURST_COLORS = ["#FF6A00", "#FF3B30", "#EC167C", "#B217B8", "#7426D8", "#173CBF"];

/** Confetti-style particle burst from the centre of an element (used when favoriting). */
export function burst(el: HTMLElement | null, count = 12) {
  if (!el || prefersReducedMotion()) return;
  const r = el.getBoundingClientRect();
  const layer = document.createElement("div");
  layer.className = "burst-layer";
  layer.style.left = `${r.left + r.width / 2}px`;
  layer.style.top = `${r.top + r.height / 2}px`;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("i");
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 26 + Math.random() * 22;
    p.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
    p.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
    p.style.background = BURST_COLORS[i % BURST_COLORS.length];
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 700);
}

/** Cycles through phrases with a typing / deleting effect. */
export function useTypewriter(phrases: string[], { typeMs = 70, holdMs = 1600, deleteMs = 35 } = {}) {
  const [text, setText] = useState("");
  const key = phrases.join("|");
  useEffect(() => {
    if (!phrases.length) return;
    if (prefersReducedMotion()) {
      setText(phrases[0]);
      return;
    }
    let i = 0;
    let n = 0;
    let deleting = false;
    let t: ReturnType<typeof setTimeout>;
    const step = () => {
      const word = phrases[i];
      if (!deleting) {
        n++;
        setText(word.slice(0, n));
        if (n === word.length) {
          deleting = true;
          t = setTimeout(step, holdMs);
          return;
        }
        t = setTimeout(step, typeMs);
      } else {
        n--;
        setText(word.slice(0, n));
        if (n === 0) {
          deleting = false;
          i = (i + 1) % phrases.length;
        }
        t = setTimeout(step, deleteMs);
      }
    };
    t = setTimeout(step, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return text;
}

/** Gradient reading-progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (ref.current) ref.current.style.transform = `scaleX(${h > 0 ? window.scrollY / h : 0})`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return <div className="scroll-progress" ref={ref} aria-hidden="true" />;
}

/** Floating back-to-top button with a circular scroll-progress ring. */
export function BackToTop() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? window.scrollY / h : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const C = 2 * Math.PI * 22;
  return (
    <button
      className={`back-to-top ${p > 0.15 ? "show" : ""}`}
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" })}
    >
      <svg viewBox="0 0 50 50" width="50" height="50" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="btt-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF6A00" />
            <stop offset="50%" stopColor="#EC167C" />
            <stop offset="100%" stopColor="#173CBF" />
          </linearGradient>
        </defs>
        <circle cx="25" cy="25" r="22" className="btt-track" />
        <circle cx="25" cy="25" r="22" className="btt-bar" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
      </svg>
      <Icon path={mdiArrowUp} size={22} />
    </button>
  );
}
