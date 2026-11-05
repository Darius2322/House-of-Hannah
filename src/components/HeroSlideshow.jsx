import React, { useState, useEffect, useRef } from "react";

// Each slide carries a focal point per breakpoint so the subject (hands,
// garment, machine) is never cropped out; they are applied via CSS variables.
const DEFAULT_SLIDES = [
  { src: "/images/sweaters-closeup.jpg", alt: "Freshly folded knitwear", posDesktop: "center 45%", posMobile: "center 40%" },
  { src: "/images/laundromat-wide.jpg", alt: "Rows of commercial washing machines", posDesktop: "center 55%", posMobile: "center 60%" },
  { src: "/images/folding-on-bed.jpg", alt: "Laundry folded in neat stacks", posDesktop: "center 50%", posMobile: "center 50%" },
  { src: "/images/iron-closeup-teal.jpg", alt: "Iron resting on a pressing board", posDesktop: "left center", posMobile: "left center" },
];

const SLIDE_MS = 6500; // time each image stays before crossfading
const FADE_MS = 1800; // crossfade duration

export function HeroSlideshow({ slides = DEFAULT_SLIDES, children, minHeight = 560 }) {
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0); // restarts the slow-zoom animation on each change
  const reducedMotion = useRef(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (slides.length <= 1 || reducedMotion.current) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
      setCycle((c) => c + 1);
    }, SLIDE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div style={{ position: "relative", minHeight, overflow: "hidden", display: "flex", alignItems: "center", background: "#0B0B0B" }}>
      {slides.map((s, i) => (
        <img
          key={`${i}-${i === index ? cycle : "idle"}`}
          src={s.src}
          alt={i === index ? s.alt : ""}
          aria-hidden={i !== index}
          loading={i === 0 ? "eager" : "lazy"}
          decoding="async"
          className={i === index ? "hero-slide hero-slide-active" : "hero-slide"}
          style={{
            "--pos-desktop": s.posDesktop || "center",
            "--pos-mobile": s.posMobile || s.posDesktop || "center",
            opacity: i === index ? 1 : 0,
            transitionDuration: `${FADE_MS}ms`,
            animationDuration: reducedMotion.current ? "0ms" : `${SLIDE_MS + FADE_MS}ms`,
          }}
        />
      ))}
      <div className="hero-scrim" />
      <div style={{ position: "relative", zIndex: 2, width: "100%" }}>{children}</div>

      <style>{`
        .hero-slide {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: var(--pos-desktop);
          filter: saturate(0.55) contrast(1.05) brightness(0.9);
          transition-property: opacity; transition-timing-function: ease-in-out;
          transform: scale(1); will-change: transform, opacity;
        }
        .hero-slide-active { animation-name: hoh-ken-burns; animation-timing-function: ease-out; animation-fill-mode: forwards; }
        @keyframes hoh-ken-burns {
          from { transform: scale(1) translate(0, 0); }
          to   { transform: scale(1.06) translate(-1%, -1%); }
        }
        .hero-scrim {
          position: absolute; inset: 0; z-index: 1;
          background:
            radial-gradient(ellipse at 15% 85%, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0) 55%),
            linear-gradient(115deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.66) 45%, rgba(0,0,0,0.38) 80%);
        }
        @media (max-width: 640px) {
          .hero-slide { object-position: var(--pos-mobile); }
          .hero-scrim { background: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.92) 100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-slide { animation: none !important; transition-duration: 400ms !important; }
        }
      `}</style>
    </div>
  );
}
