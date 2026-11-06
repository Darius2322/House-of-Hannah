import React, { useEffect, useRef, useState, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight, User } from "lucide-react";
import { C, FONT_DISPLAY, fmtDate } from "../lib/constants";

export const ANONYMOUS = "Anonymous";

export function initialsOf(name) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || name.trim().toLowerCase() === ANONYMOUS.toLowerCase()) return "";
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, size = 48 }) {
  const initials = initialsOf(name);
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold})`, color: C.ink,
      border: `2px solid ${C.ink}`, boxShadow: `0 0 0 1.5px ${C.gold}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: size * 0.36, letterSpacing: 0.5,
    }}>
      {initials || <User size={size * 0.46} color={C.ink} />}
    </div>
  );
}

export function Stars({ value, onChange, size }) {
  return (
    <div style={{ display: "flex", gap: 4 }} role={onChange ? "radiogroup" : "img"} aria-label={onChange ? "Rating" : `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} aria-label={onChange ? `${n} star${n > 1 ? "s" : ""}` : undefined}
          onClick={() => onChange && onChange(n)}
          style={{ background: "none", border: "none", cursor: onChange ? "pointer" : "default", padding: 0, display: "flex" }}>
          <Star size={size || (onChange ? 28 : 16)} color={C.gold} fill={n <= value ? C.gold : "none"} />
        </button>
      ))}
    </div>
  );
}

const VIEW_MS = 3000; // each review stays on screen for 3 seconds

// One review at a time, advancing every 3 seconds. Pauses while the visitor
// hovers, touches or focuses it, and never auto-advances for people who have
// asked their device to reduce motion (they can still use the arrows and dots).
export function ReviewCarousel({ reviews }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const count = reviews.length;
  const touchX = useRef(null);

  const go = useCallback((delta) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    if (count <= 1 || paused || reduced.current) return;
    const t = setTimeout(() => go(1), VIEW_MS);
    return () => clearTimeout(t);
  }, [index, paused, count, go]);

  useEffect(() => { if (index >= count) setIndex(0); }, [count, index]);

  if (count === 0) return null;
  const r = reviews[index] || reviews[0];
  const arrow = { width: 40, height: 40, borderRadius: "50%", border: `1.5px solid ${C.ink}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };

  return (
    <div
      role="region" aria-roledescription="carousel" aria-label="Customer reviews"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onTouchStart={(e) => { setPaused(true); touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchX.current ?? 0);
        if (Math.abs(dx) > 40 && count > 1) go(dx < 0 ? 1 : -1);
        touchX.current = null;
        setTimeout(() => setPaused(false), 2500);
      }}
      style={{ maxWidth: 680, margin: "0 auto" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {count > 1 && <button type="button" onClick={() => go(-1)} aria-label="Previous review" style={arrow} className="rc-arrow"><ChevronLeft size={20} color={C.ink} /></button>}
        <div key={r.id} className="hoh-fade-in" aria-live={paused ? "polite" : "off"}
          style={{ flex: 1, minWidth: 0, background: "#fff", border: `1px solid ${C.gold}`, borderRadius: 18, padding: "26px 24px", textAlign: "center", minHeight: 210, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "0 8px 28px rgba(0,0,0,0.06)" }}>
          <Avatar name={r.customer_name} size={54} />
          <Stars value={r.rating} />
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.65, color: "#3D382F", overflowWrap: "anywhere" }}>“{r.review_text}”</p>
          <div style={{ fontSize: 13, color: C.ink, fontWeight: 700 }}>
            {r.customer_name} <span style={{ color: "#7A7466", fontWeight: 500 }}>· {fmtDate(r.created_at)}</span>
          </div>
        </div>
        {count > 1 && <button type="button" onClick={() => go(1)} aria-label="Next review" style={arrow} className="rc-arrow"><ChevronRight size={20} color={C.ink} /></button>}
      </div>

      {count > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 7, marginTop: 16, flexWrap: "wrap" }}>
          {count <= 10 ? reviews.map((x, i) => (
            <button key={x.id} type="button" onClick={() => setIndex(i)} aria-label={`Show review ${i + 1}`} aria-current={i === index}
              style={{ width: i === index ? 22 : 8, height: 8, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: i === index ? C.gold : "#DCD3BC", transition: "width .25s ease" }} />
          )) : <span style={{ fontSize: 12.5, color: "#7A7466", fontWeight: 600 }}>{index + 1} / {count}</span>}
        </div>
      )}
      <style>{`@media (max-width: 520px) { .rc-arrow { display: none !important; } }`}</style>
    </div>
  );
}
