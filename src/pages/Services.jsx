import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { C, FONT_DISPLAY, formatPrice } from "../lib/constants";
import { metaFor } from "../lib/serviceMeta";
import { Button, Section, Eyebrow, H2, Spinner, EmptyState } from "../components/UI";

export default function ServicesPage() {
  const nav = useNavigate();
  const [services, setServices] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      // Only active services are public — this mirrors Admin → Services → Enable/Disable.
      const { data, error } = await supabase.from("services").select("*").eq("is_active", true).order("sort_order");
      if (error) setFailed(true);
      setServices(data || []);
    })();
  }, []);

  if (services === null) return <Spinner label="Loading services…" />;

  return (
    <Section>
      <Eyebrow>Our Services</Eyebrow>
      <H2>Everything your laundry needs, handled with care</H2>
      {failed || services.length === 0 ? (
        <EmptyState title="Our services couldn't be loaded" desc="Please refresh, or WhatsApp us and we'll help right away." />
      ) : (
        <div className="services-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20, marginTop: 28 }}>
          {services.map((s) => {
            const meta = metaFor(s.slug);
            const Icon = meta.icon;
            return (
              <div key={s.id} className="service-card" style={{ background: "#fff", border: "1px solid #E8E0CC", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {s.image_url && <img src={s.image_url} alt={s.name} loading="lazy" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />}
                <div style={{ padding: 24, display: "flex", flexDirection: "column", flex: 1 }}>
                  {!s.image_url && (
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                      <Icon size={23} color={C.gold} />
                    </div>
                  )}
                  <h3 style={{ margin: "0 0 6px", fontFamily: FONT_DISPLAY, fontWeight: 700, color: C.ink, fontSize: 17, letterSpacing: 0.3 }}>{s.name}</h3>
                  <div className="service-desc" style={{ fontSize: 14, color: "#5F594D", marginBottom: 10, lineHeight: 1.55 }}>{s.description || meta.desc}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 14 }}>{formatPrice(s)}</div>
                  <ul className="service-benefits" style={{ margin: "0 0 18px", paddingLeft: 18 }}>
                    {meta.benefits.map((b) => <li key={b} style={{ fontSize: 13, color: "#3D382F", marginBottom: 5 }}>{b}</li>)}
                  </ul>
                  {/* Booking.jsx reads ?service= and preselects it (opening the free-text field for "other"). */}
                  <div style={{ marginTop: "auto" }}>
                    <Button variant="primary" full onClick={() => nav(`/booking?service=${encodeURIComponent(s.slug)}`)}>Request This Service</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        /* Mobile: a tidy 2-column grid instead of one long stack. */
        @media (max-width: 640px) {
          .services-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .services-grid .service-card > div { padding: 14px !important; }
          .services-grid .service-card { border-radius: 12px !important; }
          .services-grid .service-desc { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 12.5px !important; margin-bottom: 8px !important; }
          .services-grid .service-benefits { display: none; }
        }
        @media (min-width: 1024px) { .services-grid { grid-template-columns: repeat(4, 1fr) !important; } }
      `}</style>
    </Section>
  );
}
