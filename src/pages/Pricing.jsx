import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C, BRAND, FONT_DISPLAY, WA_BASE, formatPrice } from "../lib/constants";
import { metaFor } from "../lib/serviceMeta";
import { Button, Section, Eyebrow, Spinner, EmptyState } from "../components/UI";

// Public price list. Reads the same `services` table the booking form and
// the Admin → Services tab use, so a price edited there changes here too.
export default function PricingPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("services").select("*").eq("is_active", true).order("sort_order");
      setRows(data || []);
    })();
  }, []);

  if (rows === null) return <Spinner label="Loading price list…" />;
  const priced = rows.filter((r) => r.slug !== "other");

  return (
    <div style={{ background: C.ink, minHeight: "60vh" }}>
      <Section>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <Eyebrow style={{ color: C.gold }}>{BRAND.name}</Eyebrow>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "clamp(32px,6vw,48px)", color: C.goldLight, margin: "0 0 10px", letterSpacing: 1 }}>Price List</h1>
            <div style={{ color: "#BDB5A0", letterSpacing: 3, fontSize: 12, textTransform: "uppercase" }}>{BRAND.tagline}</div>
          </div>

          {priced.length === 0 ? (
            <EmptyState title="Our price list is being updated" desc="WhatsApp us and we'll send it over." />
          ) : (
            <div style={{ border: `1px solid ${C.gold}`, borderRadius: 18, padding: "6px 20px", background: "rgba(255,255,255,0.02)" }}>
              {priced.map((r, i) => {
                const Icon = metaFor(r.slug).icon;
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderBottom: i === priced.length - 1 ? "none" : "1px solid rgba(212,175,55,0.35)" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={17} color={C.gold} /></div>
                    <div style={{ flex: 1, minWidth: 0, color: "#fff", fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, letterSpacing: 0.8, textTransform: "uppercase" }}>{r.name}</div>
                    <div style={{ color: C.goldLight, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, textAlign: "right", whiteSpace: "nowrap" }}>{formatPrice(r)}</div>
                  </div>
                );
              })}
            </div>
          )}

          <p style={{ color: "#9A927D", fontSize: 12.5, textAlign: "center", margin: "18px 0 28px", lineHeight: 1.6 }}>
            Final amounts are confirmed by our team once your items are received.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Button variant="primary" onClick={() => nav("/booking")}>Book a Service <ArrowRight size={16} /></Button>
            <Button variant="whatsapp" onClick={() => window.open(`${WA_BASE}?text=${encodeURIComponent(`Hello ${BRAND.name}, I would like to confirm a price.`)}`, "_blank", "noopener,noreferrer")}><MessageCircle size={16} /> Ask on WhatsApp</Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
