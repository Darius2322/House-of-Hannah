import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu, X, MessageCircle, Phone, MapPin, Home as HomeIcon, Sparkles,
  CalendarPlus, Search, ClipboardCheck, Image as ImageIcon, Info, Star,
  Mail, Share2, Tag,
} from "lucide-react";
import { C, BRAND, PHONE_DISPLAY, PHONE_INTL, WA_BASE, WA_GREETING, DEVELOPER_CREDIT, FONT_DISPLAY } from "../lib/constants";
import { useBusinessSettings, formatHoursLine } from "../lib/useBusinessSettings";
import { SOCIAL_ICON_COMPONENTS } from "./SocialIcons";
import { Button } from "./UI";
import { SearchOverlay } from "./SearchOverlay";

// The circular logo is a transparent PNG (gold on transparent), so it sits
// directly on the black header/footer without a visible box.
export function Logo({ height = 40, withWordmark = false, stacked = false }) {
  const mark = <img src="/logo.png" alt={withWordmark ? "" : BRAND.name} width={height} height={height} style={{ height, width: height, display: "block", flexShrink: 0 }} />;
  if (!withWordmark) return mark;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexDirection: stacked ? "column" : "row" }}>
      {mark}
      <span className="logo-words" style={{ display: "flex", flexDirection: "column", lineHeight: 1.05, textAlign: stacked ? "center" : "left" }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: Math.max(13, height * 0.36), letterSpacing: 1.5, color: C.goldLight }}>HOUSE OF HANNAH</span>
        <span className="brand-descriptor" style={{ fontSize: Math.max(8.5, height * 0.2), letterSpacing: 2.4, color: "#BDB5A0", textTransform: "uppercase", marginTop: 3, fontWeight: 500 }}>{BRAND.descriptor}</span>
      </span>
    </span>
  );
}

const NAV_LINKS = [
  ["/", "Home", HomeIcon], ["/services", "Services", Sparkles], ["/pricing", "Price List", Tag],
  ["/booking", "Book", CalendarPlus], ["/track", "Track Request", ClipboardCheck], ["/gallery", "Gallery", ImageIcon],
  ["/about", "About", Info], ["/reviews", "Reviews", Star], ["/contact", "Contact", Phone],
];

// Locks the page behind the drawer without losing scroll position, and
// restores it exactly where the customer was when the drawer closes.
function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const scrollY = window.scrollY;
    const { body } = document;
    const prev = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

const iconBtn = {
  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(212,175,55,0.35)", cursor: "pointer",
  width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};

export function NavBar() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const toggleBtnRef = useRef(null);
  const closeBtnRef = useRef(null);
  const drawerRef = useRef(null);

  useBodyScrollLock(open);
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // Move focus into the drawer on open, return it to the toggle on close; Escape closes.
  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      toggleBtnRef.current?.focus();
    };
  }, [open]);

  function onOverlayClick(e) {
    if (drawerRef.current && !drawerRef.current.contains(e.target)) setOpen(false);
  }

  async function shareThisSite() {
    const shareData = { title: BRAND.name, text: `${BRAND.name} — ${BRAND.tagline}. Washing, ironing, dry cleaning, pickup & delivery.`, url: window.location.origin };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled the share sheet */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      alert(`Link copied — paste it anywhere to share ${BRAND.name}.`);
    } catch {
      window.open(`${WA_BASE}?text=${encodeURIComponent(`${shareData.text} ${shareData.url}`)}`, "_blank", "noopener,noreferrer");
    }
  }

  // Desktop omits "Home" (the logo is the home link) and "Book" (the Book Now button is the CTA).
  const desktopLinks = NAV_LINKS.filter(([path]) => path !== "/booking" && path !== "/");

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(11,11,11,0.97)", backdropFilter: "blur(8px)", borderBottom: `1px solid rgba(212,175,55,0.45)` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Link to="/" aria-label={`${BRAND.name} — home`} style={{ flexShrink: 0, textDecoration: "none" }}>
          <Logo height={44} withWordmark />
        </Link>
        <nav className="desktop-nav" aria-label="Main" style={{ display: "none" }}>
          {desktopLinks.map(([path, label]) => (
            <Link key={path} to={path} style={{
              fontWeight: 600, fontSize: 13.5, letterSpacing: 0.3,
              color: loc.pathname === path ? C.goldLight : "#E6DFCB", padding: "8px 10px", textDecoration: "none",
              borderBottom: loc.pathname === path ? `2px solid ${C.gold}` : "2px solid transparent",
            }}>{label}</Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div className="desktop-nav" style={{ display: "none", gap: 10, marginRight: 4 }}>
            <button onClick={() => setSearchOpen(true)} aria-label="Search the site" title="Search" style={iconBtn}>
              <Search size={17} color={C.goldLight} />
            </button>
            <Button variant="whatsapp" style={{ padding: "10px 16px", fontSize: 14 }} onClick={() => window.open(`${WA_BASE}?text=${encodeURIComponent(WA_GREETING)}`, "_blank", "noopener,noreferrer")}><MessageCircle size={16} /> WhatsApp</Button>
            <Button variant="primary" style={{ padding: "10px 18px", fontSize: 14 }} onClick={() => nav("/booking")}>Book Now</Button>
          </div>

          {/* Four distinct, always-reachable mobile actions: Book, Track, Search, Menu. */}
          <button onClick={() => nav("/booking")} className="mobile-toggle" aria-label="Book a laundry service" title="Book a laundry service" style={iconBtn}><CalendarPlus size={17} color={C.goldLight} /></button>
          <button onClick={() => nav("/track")} className="mobile-toggle" aria-label="Track my request" title="Track my request" style={iconBtn}><ClipboardCheck size={17} color={C.goldLight} /></button>
          <button onClick={() => setSearchOpen(true)} className="mobile-toggle" aria-label="Search the site" title="Search" style={iconBtn}><Search size={17} color={C.goldLight} /></button>
          <button ref={toggleBtnRef} onClick={() => setOpen(true)} className="mobile-toggle" aria-label="Open menu" aria-expanded={open}
            style={{ ...iconBtn, background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold})`, border: "none" }}>
            <Menu size={18} color={C.ink} />
          </button>
        </div>
      </div>

      {/* Overlay + drawer are portaled to <body>: a position:fixed element nested
          inside a position:sticky header can be clipped to the header's box on mobile. */}
      {open && createPortal(
        <div onMouseDown={onOverlayClick} onTouchStart={onOverlayClick} role="presentation"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, animation: "hoh-fade .2s ease" }}>
          <div ref={drawerRef} role="dialog" aria-modal="true" aria-label="Site menu"
            style={{ position: "absolute", top: 0, right: 0, height: "100%", width: "min(84vw, 340px)", background: "#fff", boxShadow: "-8px 0 30px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", animation: "hoh-slide-in .25s ease", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: C.ink, borderBottom: `2px solid ${C.gold}` }}>
              <Logo height={38} withWordmark />
              <button ref={closeBtnRef} onClick={() => setOpen(false)} aria-label="Close menu" style={{ ...iconBtn, width: 32, height: 32 }}>
                <X size={18} color={C.goldLight} />
              </button>
            </div>
            <nav aria-label="Mobile" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", flex: 1 }}>
              {NAV_LINKS.map(([path, label, Icon]) => {
                const active = loc.pathname === path;
                return (
                  <Link key={path} to={path} onClick={() => setOpen(false)} style={{
                    display: "flex", alignItems: "center", gap: 12, textAlign: "left", textDecoration: "none",
                    background: active ? C.ivory : "none", fontWeight: 600, fontSize: 15,
                    color: active ? C.accent : C.ink, padding: "13px 14px", borderRadius: 10,
                    borderLeft: active ? `3px solid ${C.gold}` : "3px solid transparent",
                  }}>
                    <Icon size={18} color={active ? C.accent : "#7A7466"} />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div style={{ padding: 14, borderTop: "1px solid #EDE6D3", display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={shareThisSite} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 0", borderRadius: 10, border: "1.5px solid #DCD3BC", background: "#fff", color: C.ink, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                <Share2 size={16} /> Share This Site
              </button>
              <Button variant="whatsapp" full onClick={() => window.open(`${WA_BASE}?text=${encodeURIComponent(WA_GREETING)}`, "_blank", "noopener,noreferrer")}><MessageCircle size={16} /> WhatsApp</Button>
              <Button variant="primary" full onClick={() => { setOpen(false); nav("/booking"); }}>Book Now</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <style>{`
        @media (min-width: 1000px) { .desktop-nav { display: flex !important; align-items: center; } .mobile-toggle { display: none !important; } }
        @media (max-width: 380px) { .mobile-toggle { width: 32px !important; height: 32px !important; } }
        @media (max-width: 560px) { .brand-descriptor { display: none; } }
        @media (max-width: 430px) { header .logo-words { display: none; } }
        @media (prefers-reduced-motion: reduce) { [role="dialog"], [role="presentation"] { animation: none !important; } }
        @keyframes hoh-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes hoh-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </header>
  );
}

const footLink = { display: "block", fontSize: 13.5, marginBottom: 9, color: "#BDB5A0", textDecoration: "none" };
const footHead = { fontFamily: FONT_DISPLAY, fontWeight: 700, color: C.goldLight, marginBottom: 14, fontSize: 13.5, letterSpacing: 1.5, textTransform: "uppercase" };

export function Footer() {
  // No Admin/Worker link here on purpose — staff portals are reached only by direct URL.
  const { settings, socials } = useBusinessSettings();
  const [showCredit, setShowCredit] = useState(false);
  const hours = settings.business_hours;

  return (
    <footer style={{ background: C.ink, color: "#E6DFCB", padding: "48px 20px 26px", borderTop: `2px solid ${C.gold}` }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 30 }}>
        <div>
          <Logo height={96} />
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#BDB5A0", maxWidth: 260, marginTop: 14 }}>
            {settings.tagline || BRAND.tagline}. Washing, ironing, dry cleaning, with pickup &amp; delivery.
          </p>
          {socials.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {socials.map((s) => {
                const Icon = SOCIAL_ICON_COMPONENTS[s.platform];
                return (
                  <a key={s.platform} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.platform}
                    style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(212,175,55,0.4)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                    {Icon ? <Icon size={15} color={C.goldLight} /> : <span style={{ color: C.goldLight, fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{s.platform.slice(0, 2)}</span>}
                  </a>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <div style={footHead}>Quick Links</div>
          {[["/services", "Services"], ["/pricing", "Price List"], ["/booking", "Book"], ["/track", "Track Request"], ["/gallery", "Gallery"], ["/faq", "FAQ"]].map(([p, l]) => (
            <Link key={p} to={p} style={footLink}>{l}</Link>
          ))}
        </div>
        <div>
          <div style={footHead}>Contact</div>
          <a href={`tel:+${PHONE_INTL}`} style={{ ...footLink, display: "flex", gap: 8 }}><Phone size={15} /> {settings.phone || PHONE_DISPLAY}</a>
          {settings.email && <a href={`mailto:${settings.email}`} style={{ ...footLink, display: "flex", gap: 8 }}><Mail size={15} /> {settings.email}</a>}
          {settings.address && <div style={{ ...footLink, display: "flex", gap: 8 }}><MapPin size={15} style={{ flexShrink: 0, marginTop: 2 }} /> {settings.address}</div>}
          {hours && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: "#9A927D", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Hours</div>
              {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
                <div key={d} style={{ fontSize: 12, color: "#BDB5A0", display: "flex", justifyContent: "space-between", maxWidth: 200 }}>
                  <span style={{ textTransform: "capitalize" }}>{d}</span><span>{formatHoursLine(hours, d)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div style={footHead}>Legal</div>
          <Link to="/privacy" style={footLink}>Privacy Policy</Link>
          <Link to="/terms" style={footLink}>Terms &amp; Conditions</Link>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 34, paddingTop: 20, borderTop: "1px solid rgba(212,175,55,0.2)", fontSize: 12, color: "#8C8571" }}>
        © {new Date().getFullYear()} {settings.business_name || BRAND.name}. All rights reserved.
        {DEVELOPER_CREDIT && (
          <>
            {" · "}
            <button onClick={() => setShowCredit(true)} style={{ background: "none", border: "none", color: "#8C8571", fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Site by {DEVELOPER_CREDIT.name}</button>
          </>
        )}
      </div>

      {DEVELOPER_CREDIT && showCredit && (
        <div role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowCredit(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div role="dialog" aria-modal="true" aria-label="Developer contact" style={{ background: "#fff", color: C.ink, borderRadius: 16, width: "100%", maxWidth: 320, padding: 22, textAlign: "center" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{DEVELOPER_CREDIT.name}</div>
            <div style={{ fontSize: 13, color: "#5F594D", marginBottom: 18 }}>Built and maintains this site</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Button variant="primary" full onClick={() => { window.location.href = `tel:${DEVELOPER_CREDIT.phone}`; }}><Phone size={15} /> Call — {DEVELOPER_CREDIT.phone}</Button>
              <Button variant="secondary" full onClick={() => { window.location.href = `mailto:${DEVELOPER_CREDIT.email}`; }}><Mail size={15} /> Email</Button>
              <button onClick={() => setShowCredit(false)} style={{ marginTop: 6, background: "none", border: "none", color: "#7A7466", fontSize: 13, cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}

export function WhatsAppFloat({ message }) {
  const href = `${WA_BASE}?text=${encodeURIComponent(message || WA_GREETING)}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" style={{
      position: "fixed", bottom: 22, right: 22, zIndex: 60, width: 58, height: 58, borderRadius: "50%",
      background: C.whatsapp, display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 6px 20px rgba(0,0,0,0.35)", textDecoration: "none", border: `2px solid ${C.ink}`,
    }}>
      <MessageCircle size={28} color={C.ink} fill={C.ink} />
    </a>
  );
}
