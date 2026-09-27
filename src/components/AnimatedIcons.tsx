import { mdiHandWave } from "@mdi/js";
import { useId } from "react";

/** The app's 6-stop brand gradient as an SVG <linearGradient>. */
function BrandGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF6A00" />
        <stop offset="20%" stopColor="#FF3B30" />
        <stop offset="40%" stopColor="#EC167C" />
        <stop offset="60%" stopColor="#B217B8" />
        <stop offset="80%" stopColor="#7426D8" />
        <stop offset="100%" stopColor="#173CBF" />
      </linearGradient>
    </defs>
  );
}

const useGradId = () => `g${useId().replace(/:/g, "")}`;

/** Gradient waving hand (replaces the 👋 emoji in the greeting). */
export function WaveHand({ size = 30 }: { size?: number }) {
  const id = useGradId();
  return (
    <svg className="anim-wave-hand" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <BrandGradient id={id} />
      <path d={mdiHandWave} fill={`url(#${id})`} />
    </svg>
  );
}

export type ArtKind = "search" | "heart" | "pill" | "error" | "compass";

/** Small animated illustrations for empty / error states. */
export function EmptyArt({ kind }: { kind: ArtKind }) {
  const id = useGradId();
  const stroke = `url(#${id})`;

  return (
    <svg className={`empty-art art-${kind}`} width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
      <BrandGradient id={id} />
      <circle cx="60" cy="60" r="54" className="art-halo" />
      <circle cx="60" cy="60" r="54" fill="none" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 7" className="art-orbit" />

      {kind === "search" && (
        <g>
          <circle cx="54" cy="54" r="22" fill="#fff" stroke={stroke} strokeWidth="7" pathLength={1} className="art-draw" />
          <line x1="70" y1="70" x2="88" y2="88" stroke={stroke} strokeWidth="10" strokeLinecap="round" pathLength={1} className="art-draw d2" />
          <clipPath id={`${id}-lens`}>
            <circle cx="54" cy="54" r="18.5" />
          </clipPath>
          <rect x="20" y="20" width="10" height="70" fill="#EC167C" opacity="0.18" transform="rotate(25 54 54)" clipPath={`url(#${id}-lens)`} className="art-glint" />
        </g>
      )}

      {kind === "heart" && (
        <g className="art-beat">
          <path
            d="M60 92C28 70 22 52 30 40c7-10 21-10 30 3 9-13 23-13 30-3 8 12 2 30-30 52z"
            fill="#FFEBF4"
            stroke={stroke}
            strokeWidth="6"
            strokeLinejoin="round"
            pathLength={1}
            className="art-draw"
          />
          <circle cx="92" cy="30" r="3" fill="#EC167C" className="art-spark" />
          <circle cx="26" cy="28" r="2.5" fill="#7426D8" className="art-spark s2" />
          <circle cx="96" cy="72" r="2" fill="#FF6A00" className="art-spark s3" />
        </g>
      )}

      {kind === "pill" && (
        <g transform="rotate(-35 60 60)">
          <path d="M60 46H42a14 14 0 0 0 0 28h18z" fill={stroke} className="art-half left" />
          <path d="M60 46h18a14 14 0 0 1 0 28H60z" fill="#fff" stroke={stroke} strokeWidth="4" className="art-half right" />
          <circle cx="60" cy="40" r="2.5" fill="#EC167C" className="art-crumb" />
          <circle cx="60" cy="80" r="2" fill="#7426D8" className="art-crumb c2" />
          <circle cx="56" cy="60" r="1.8" fill="#FF6A00" className="art-crumb c3" />
        </g>
      )}

      {kind === "error" && (
        <g className="art-shake">
          <path d="M60 26L96 88H24z" fill="#FFF4EC" stroke={stroke} strokeWidth="6" strokeLinejoin="round" pathLength={1} className="art-draw" />
          <line x1="60" y1="50" x2="60" y2="68" stroke={stroke} strokeWidth="7" strokeLinecap="round" />
          <circle cx="60" cy="78" r="4" fill="#EC167C" className="art-blink" />
        </g>
      )}

      {kind === "compass" && (
        <g>
          <circle cx="60" cy="60" r="30" fill="#fff" stroke={stroke} strokeWidth="6" pathLength={1} className="art-draw" />
          <g className="art-needle">
            <path d="M60 36l7 24H53z" fill="#EC167C" />
            <path d="M60 84l-7-24h14z" fill="#CBD5E1" />
            <circle cx="60" cy="60" r="4" fill="#071A48" />
          </g>
        </g>
      )}
    </svg>
  );
}
