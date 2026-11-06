import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, MessageCircle, ArrowRight, ClipboardList, Search, Check, ChevronRight, Droplets, Wind, Shirt, Tag } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C, BRAND, WA_BASE, WA_GREETING, FONT_DISPLAY, formatPrice } from "../lib/constants";
import { Button, Section, Eyebrow, H2 } from "../components/UI";
import { HeroSlideshow } from "../components/HeroSlideshow";

const CORE_OFFER = [
  { icon: Droplets, title: "Washing", desc: "Everyday laundry washed, dried and neatly folded — charged per kilogram.", slug: "wash-fold" },
  { icon: Wind, title: "Ironing", desc: "Washed, folded and professionally pressed, ready to wear.", slug: "wash-fold-iron" },
  { icon: Shirt, title: "Dry Cleaning", desc: "Specialist care for suits, dresses and delicate garments.", slug: "dry-cleaning" },
  { icon: Truck, title: "Pickup & Delivery", desc: "We collect from your door and bring it back fresh.", path: "/pickup-delivery" },
];

function PricePreview() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("services").select("id,name,price_type,price_amount,price_unit").eq("is_active", true).eq("price_type", "fixed").order("sort_order").limit(4);
      setRows(data || []);
    })();
  }, []);
  if (rows.length === 0) return null;
  return (
    <Section bg={C.ink}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <Eyebrow style={{ color: C.gold }}>Transparent Pricing</Eyebrow>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "clamp(25px,4vw,34px)", color: "#fff", margin: 0, letterSpacing: 0.4 }}>Simple prices, no surprises</h2>
        </div>
        <Button variant="dark" onClick={() => nav("/pricing")}>Full Price List <ChevronRight size={16} /></Button>
      </div>
      <div className="hoh-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: "1px solid rgba(212,175,55,0.45)", borderRadius: 14, padding: "20px 18px", background: "rgba(255,255,255,0.03)" }}>
            <div style={{ color: "#E6DFCB", fontSize: 13.5, fontWeight: 600, marginBottom: 8, letterSpacing: 0.4 }}>{r.name}</div>
            <div style={{ color: C.goldLight, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 21 }}>{formatPrice(r)}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export default function Home() {
  const nav = useNavigate();
  const startBooking = (slug) => nav(slug ? `/booking?service=${slug}` : "/booking");

  return (
    <div>
      <style>{`
        /* Phones: always two cards per row, with tighter padding so nothing feels cramped. */
        @media (max-width: 640px) {
          .hoh-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 12px !important; }
          .hoh-grid-2 > * { padding: 16px 14px !important; min-width: 0; }
          .hoh-grid-2 > * > div:first-child { margin-bottom: 8px; }
        }
      `}</style>
      <HeroSlideshow>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "84px 20px" }}>
          <div style={{ maxWidth: 600 }}>
            <Eyebrow style={{ color: C.gold }}>{BRAND.descriptor} · Pickup &amp; Delivery</Eyebrow>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "clamp(34px,5.6vw,56px)", color: "#fff", lineHeight: 1.1, letterSpacing: 0.5, margin: "0 0 18px" }}>
              Quality care for <span style={{ color: C.gold }}>every garment</span>
            </h1>
            <p style={{ fontSize: 17, color: "#E6DFCB", lineHeight: 1.65, marginBottom: 16, maxWidth: 500 }}>
              Washing, ironing and dry cleaning, handled with the attention your clothes deserve — and collected from and delivered to your door.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: C.goldLight, fontWeight: 700, fontSize: 13.5, marginBottom: 28 }}>
              <Truck size={17} /> Pickup &amp; Delivery Available
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => startBooking()}>Book a Laundry Service <ArrowRight size={16} /></Button>
              <Button variant="whatsapp" onClick={() => window.open(`${WA_BASE}?text=${encodeURIComponent(WA_GREETING)}`, "_blank", "noopener,noreferrer")}><MessageCircle size={16} /> WhatsApp Us</Button>
            </div>
          </div>
        </div>
      </HeroSlideshow>

      <Section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }} className="hoh-grid-2">
          {[
            { icon: ClipboardList, title: "Book a Service", desc: "Start a new laundry request in minutes.", action: () => startBooking() },
            { icon: Search, title: "Track My Request", desc: "Check the status of laundry you've already sent.", action: () => nav("/track") },
            { icon: Truck, title: "Pickup & Delivery", desc: "See how collection and delivery works.", action: () => nav("/pickup-delivery") },
            { icon: Tag, title: "Price List", desc: "See what every service costs.", action: () => nav("/pricing") },
          ].map(({ icon: Icon, title, desc, action }) => (
            <button key={title} onClick={action} style={{ cursor: "pointer", textAlign: "left", background: "#fff", border: "1px solid #E8E0CC", borderRadius: 14, padding: 22, font: "inherit" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><Icon size={20} color={C.gold} /></div>
              <div style={{ fontWeight: 700, color: C.ink, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 13.5, color: "#5F594D" }}>{desc}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section bg={C.ivory}>
        <Eyebrow>What We Offer</Eyebrow>
        <H2>All laundry services, under one roof</H2>
        <div className="hoh-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 24 }}>
          {CORE_OFFER.map((s) => (
            <button key={s.title} onClick={() => (s.path ? nav(s.path) : startBooking(s.slug))} style={{ cursor: "pointer", textAlign: "left", background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #E8E0CC", font: "inherit" }}>
              <s.icon size={26} color={C.accent} style={{ marginBottom: 12 }} />
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: C.ink, fontSize: 16, marginBottom: 6, letterSpacing: 0.3 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#5F594D", lineHeight: 1.55 }}>{s.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 22 }}><Button variant="secondary" onClick={() => nav("/services")}>See All Services <ChevronRight size={16} /></Button></div>
      </Section>

      <PricePreview />

      <Section>
        <Eyebrow>How It Works</Eyebrow>
        <H2>From basket to done</H2>
        <div className="hoh-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, marginTop: 24 }}>
          {["Choose a service", "Tell us the details", "Drop off or request pickup", "Get your request number", "Track progress online", "Collect, fresh & folded"].map((t, i) => (
            <div key={t} style={{ background: "#fff", border: "1px solid #E8E0CC", borderRadius: 14, padding: 18 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.ink, color: C.goldLight, border: `1px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{i + 1}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{t}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section bg={C.ivory}>
        <Eyebrow>Why {BRAND.name}</Eyebrow>
        <H2>Care you can see in every load</H2>
        <div className="hoh-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 18, marginTop: 20 }}>
          {[["Deep Cleaning", "Removes dirt, stains and odours"], ["Safe on All Fabrics", "Gentle care for every fabric"], ["Quick Turnaround", "Fast service, always on time"], ["Quality You Can See", "Spotless results every time"]].map(([t, d]) => (
            <div key={t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Check size={18} color={C.gold} /></div>
              <div><div style={{ fontWeight: 700, color: C.ink, fontSize: 14.5 }}>{t}</div><div style={{ fontSize: 13, color: "#5F594D" }}>{d}</div></div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div style={{ background: C.ink, border: `1px solid ${C.gold}`, borderRadius: 20, padding: "36px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ color: C.gold, fontWeight: 700, fontSize: 12.5, letterSpacing: 2, marginBottom: 8 }}>PICKUP &amp; DELIVERY AVAILABLE</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "clamp(18px,3vw,23px)", fontFamily: FONT_DISPLAY, lineHeight: 1.35 }}>We'll collect and deliver — you don't have to leave home.</div>
          </div>
          <Button variant="primary" onClick={() => nav("/pickup-delivery")}>Learn More <ChevronRight size={16} /></Button>
        </div>
      </Section>

      <Section bg={C.ivory}>
        <div style={{ textAlign: "center", maxWidth: 540, margin: "0 auto" }}>
          <Eyebrow>No Account Needed</Eyebrow>
          <H2>Track your laundry with just your phone number</H2>
          <p style={{ color: "#5F594D", fontSize: 14.5, marginBottom: 20 }}>Enter your request number and phone to see real-time status — no sign-up required.</p>
          <Button variant="primary" onClick={() => nav("/track")}>Track My Request <Search size={16} /></Button>
        </div>
      </Section>
    </div>
  );
}
