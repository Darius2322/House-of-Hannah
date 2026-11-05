import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, MapPin, MessageCircle, ArrowRight, Mail } from "lucide-react";
import { C, BRAND, PHONE_DISPLAY, PHONE_INTL, WA_BASE, WA_GREETING, FONT_DISPLAY, fmtDateTime } from "../lib/constants";
import { useBusinessSettings, formatHoursLine } from "../lib/useBusinessSettings";
import { supabase } from "../lib/supabaseClient";
import { SOCIAL_ICON_COMPONENTS } from "../components/SocialIcons";
import { Section, Eyebrow, H2, Button, Spinner } from "../components/UI";

const FEEDBACK_COOLDOWN_MS = 30_000;

export function AboutPage() {
  const nav = useNavigate();
  const { settings } = useBusinessSettings();
  const rows = [
    { img: "/images/sweaters-closeup.jpg", alt: "Freshly folded knitwear", pos: "center", title: "Trusted with what matters",
      body: "From everyday essentials to your finest pieces, every load is handled the way we would want our own handled — carefully, and on time." },
    { img: "/images/carpet-steam-cleaning.jpg", alt: "Deep steam cleaning in progress", pos: "center 20%", title: "What We Do",
      body: "Washing, ironing, dry cleaning and folding, plus duvets, bedsheets, curtains, shoes, carpets and doormats — with pickup and delivery for customers who would rather not make the trip." },
    { img: "/images/laundromat-wide.jpg", alt: "Rows of commercial washing machines", pos: "center 55%", title: "Our Approach",
      body: "Every item is treated according to its fabric and the instructions you give us at booking. We aim for quick, reliable turnaround without cutting corners on cleanliness." },
  ];
  return (
    <Section>
      <Eyebrow>About Us</Eyebrow>
      <H2>Who We Are</H2>
      <p style={{ color: "#3D382F", lineHeight: 1.75, maxWidth: 660, fontSize: 15.5, marginBottom: 34 }}>
        {BRAND.name} is a full-service laundry offering washing, ironing, dry cleaning, and pickup and delivery.
        Our promise is simple: <em>{BRAND.tagline.toLowerCase()}</em> — from the moment your laundry reaches us to the moment it is back in your hands, fresh and neatly folded.
      </p>

      {rows.map((r, i) => (
        <div key={r.title} className={`about-row ${i % 2 ? "about-row-reverse" : ""} hoh-fade-in`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, alignItems: "center", marginBottom: 46 }}>
          <div className="about-row-img" style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${C.gold}` }}>
            <img src={r.img} alt={r.alt} loading="lazy" style={{ width: "100%", height: 280, objectFit: "cover", objectPosition: r.pos, display: "block", filter: "saturate(0.8)" }} />
          </div>
          <div>
            <H2>{r.title}</H2>
            <p style={{ color: "#3D382F", lineHeight: 1.75, fontSize: 15, margin: 0 }}>{r.body}</p>
            {i === rows.length - 1 && settings.address && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 700, color: C.ink, marginBottom: 4 }}>Our Location</div>
                <p style={{ color: "#3D382F", fontSize: 14, margin: 0 }}>{settings.address}</p>
              </div>
            )}
          </div>
        </div>
      ))}

      <Button variant="primary" onClick={() => nav("/booking")}>Book Your Laundry <ArrowRight size={16} /></Button>
      <style>{`
        @media (max-width: 720px) {
          .about-row { grid-template-columns: 1fr !important; }
          .about-row-reverse .about-row-img { order: -1; }
        }
        @media (min-width: 721px) { .about-row-reverse .about-row-img { order: 2; } }
      `}</style>
    </Section>
  );
}

export function PickupDeliveryPage() {
  const nav = useNavigate();
  const steps = [
    ["Request", "Choose \u201cI Need Pickup\u201d when you book and tell us your area, exact location and preferred date and time — or tap Pick Now if it's urgent."],
    ["We collect", "Our team confirms the details with you, then collects your laundry from your door."],
    ["We clean", "Your items are washed, ironed or dry-cleaned according to the instructions you gave us."],
    ["We return", "When it's ready, tell us on your tracking page whether you'll collect, want it delivered, or are sending someone."],
  ];
  return (
    <Section>
      <Eyebrow>Pickup &amp; Delivery</Eyebrow>
      <H2>We come to you</H2>
      <p style={{ color: "#3D382F", lineHeight: 1.75, maxWidth: 640, fontSize: 15.5, marginBottom: 24 }}>
        Not able to make the trip? We will collect your laundry, clean it with care, and bring it back.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 28, maxWidth: 900 }}>
        {steps.map(([t, d], i) => (
          <div key={t} style={{ background: "#fff", border: "1px solid #E8E0CC", borderRadius: 14, padding: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.ink, color: C.goldLight, border: `1px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{i + 1}</div>
            <div style={{ fontWeight: 700, color: C.ink, marginBottom: 4 }}>{t}</div>
            <div style={{ fontSize: 13.5, color: "#5F594D", lineHeight: 1.6 }}>{d}</div>
          </div>
        ))}
      </div>
      <Button variant="primary" onClick={() => nav("/booking")}>Book a Pickup <ArrowRight size={16} /></Button>
    </Section>
  );
}

export function ContactPage() {
  const { settings, socials } = useBusinessSettings();
  const hours = settings.business_hours;
  const [fb, setFb] = useState({ name: "", contact: "", type: "feedback", request_number: "", message: "", website: "" });
  const [fbBusy, setFbBusy] = useState(false);
  const [fbDone, setFbDone] = useState(false);
  const [fbErr, setFbErr] = useState("");

  async function submitFeedback(e) {
    e.preventDefault();
    if (fb.website) { setFbDone(true); return; } // honeypot: real people never fill this hidden field
    if (!fb.name.trim() || !fb.message.trim()) { setFbErr("Please add your name and a message."); return; }
    const last = Number(sessionStorage.getItem("hoh-feedback-last") || 0);
    if (Date.now() - last < FEEDBACK_COOLDOWN_MS) { setFbErr("Please wait a moment before sending another message."); return; }
    setFbErr("");
    setFbBusy(true);
    const isEmail = fb.contact.includes("@");
    const { error } = await supabase.from("feedback_messages").insert({
      name: fb.name.trim(),
      phone: isEmail ? null : fb.contact.trim() || null,
      email: isEmail ? fb.contact.trim() : null,
      message_type: fb.type,
      related_request_number: fb.request_number.trim() || null,
      message: fb.message.trim(),
    });
    setFbBusy(false);
    if (error) {
      setFbErr(error.message?.includes("rate_limited") ? "You've sent several messages recently. Please try again later or WhatsApp us." : "Couldn't send your message. Please try again or WhatsApp us directly.");
      return;
    }
    try { sessionStorage.setItem("hoh-feedback-last", String(Date.now())); } catch { /* storage unavailable */ }
    setFbDone(true);
  }

  const contactRow = { display: "flex", gap: 10, alignItems: "center" };
  return (
    <div>
      <div className="hoh-fade-in" style={{
        position: "relative", minHeight: 240, display: "flex", alignItems: "center", background: C.ink,
        backgroundImage: "radial-gradient(ellipse at 80% 20%, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0) 60%), linear-gradient(135deg, #0B0B0B 0%, #1A1A1A 100%)",
        borderBottom: `2px solid ${C.gold}`,
      }}>
        <div style={{ position: "relative", maxWidth: 1080, margin: "0 auto", padding: "48px 20px", width: "100%" }}>
          <Eyebrow style={{ color: C.gold }}>Contact</Eyebrow>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "clamp(28px,4.5vw,42px)", color: "#fff", margin: 0, letterSpacing: 0.6 }}>Get in touch</h1>
          <p style={{ color: "#BDB5A0", margin: "10px 0 0", fontSize: 15 }}>Call, WhatsApp or send us a message — we'd love to hear from you.</p>
        </div>
      </div>

      <Section>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420, flex: 1, minWidth: 280 }}>
            <div style={contactRow}><Phone size={18} color={C.accent} /><a href={`tel:+${PHONE_INTL}`} style={{ color: C.ink, fontWeight: 600, textDecoration: "none" }}>{settings.phone || PHONE_DISPLAY}</a></div>
            {settings.email && <div style={contactRow}><Mail size={18} color={C.accent} /><a href={`mailto:${settings.email}`} style={{ color: C.ink, fontWeight: 600, textDecoration: "none" }}>{settings.email}</a></div>}
            {settings.address && <div style={contactRow}><MapPin size={18} color={C.accent} /><span style={{ color: C.ink }}>{settings.address}</span></div>}
            {settings.maps_url && /^https?:\/\//i.test(settings.maps_url) && <a href={settings.maps_url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontWeight: 600, fontSize: 13.5 }}>Open in Google Maps →</a>}
            <Button variant="whatsapp" onClick={() => window.open(`${WA_BASE}?text=${encodeURIComponent(WA_GREETING)}`, "_blank", "noopener,noreferrer")}><MessageCircle size={16} /> Message Us on WhatsApp</Button>

            {hours && (
              <div style={{ marginTop: 10, background: C.ivory, border: "1px solid #E8E0CC", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, color: C.ink, marginBottom: 10, fontSize: 14 }}>Operating Hours</div>
                {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
                  <div key={d} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "#3D382F", padding: "4px 0" }}>
                    <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{d}</span>
                    <span>{formatHoursLine(hours, d)}</span>
                  </div>
                ))}
              </div>
            )}

            {socials.length > 0 && (
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                {socials.map((s) => {
                  const Icon = SOCIAL_ICON_COMPONENTS[s.platform];
                  return (
                    <a key={s.platform} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.platform}
                      style={{ width: 38, height: 38, borderRadius: 9, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                      {Icon ? <Icon size={16} color={C.goldLight} /> : <span style={{ color: C.goldLight, fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{s.platform.slice(0, 2)}</span>}
                    </a>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 26, borderTop: "1px solid #E8E0CC", paddingTop: 22 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: C.ink, marginBottom: 4, fontSize: 16 }}>Feedback &amp; Complaints</div>
              <p style={{ fontSize: 13, color: "#5F594D", marginBottom: 14 }}>Something we could do better, or a compliment for the team? Let us know directly — our staff read every message.</p>
              {fbDone ? (
                <div role="status" style={{ background: "#E4F9EC", color: "#0C7A3D", padding: 14, borderRadius: 10, fontSize: 13.5, fontWeight: 600 }}>✓ Thank you — your message has been sent to our team.</div>
              ) : (
                <form onSubmit={submitFeedback} style={{ display: "flex", flexDirection: "column", gap: 10 }} noValidate>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["feedback", "Feedback", C.accent, "#F6EDCB"], ["complaint", "Complaint", "#B23131", "#FCE8E8"]].map(([key, label, border, bg]) => (
                      <button key={key} type="button" aria-pressed={fb.type === key} onClick={() => setFb((f) => ({ ...f, type: key }))}
                        style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `2px solid ${fb.type === key ? border : "#DCD3BC"}`, background: fb.type === key ? bg : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", color: C.ink }}>{label}</button>
                    ))}
                  </div>
                  <input aria-label="Your name" value={fb.name} maxLength={100} onChange={(e) => setFb((f) => ({ ...f, name: e.target.value }))} placeholder="Your name" autoComplete="name" style={inputStyle} />
                  <input aria-label="Phone or email" value={fb.contact} maxLength={120} onChange={(e) => setFb((f) => ({ ...f, contact: e.target.value }))} placeholder="Phone or email (optional)" autoComplete="email" style={inputStyle} />
                  <input aria-label="Request number" value={fb.request_number} maxLength={30} onChange={(e) => setFb((f) => ({ ...f, request_number: e.target.value }))} placeholder="Request number (optional)" style={inputStyle} />
                  <textarea aria-label="Your message" value={fb.message} maxLength={2000} onChange={(e) => setFb((f) => ({ ...f, message: e.target.value }))} placeholder="Your message" rows={4} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
                  <input className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={fb.website} onChange={(e) => setFb((f) => ({ ...f, website: e.target.value }))} />
                  {fbErr && <div role="alert" style={{ color: "#B23131", fontSize: 12.5 }}>{fbErr}</div>}
                  <Button type="submit" variant="primary" disabled={fbBusy}>{fbBusy ? "Sending…" : "Send Message"}</Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

const inputStyle = { padding: "11px 14px", borderRadius: 10, border: "1.5px solid #DCD3BC", fontSize: 14, color: "#0B0B0B", fontFamily: "'Inter', sans-serif", width: "100%" };

export function FAQPage() {
  const { settings } = useBusinessSettings();
  const faqs = [
    ["What services do you offer?", "Washing, ironing, dry cleaning and folding, plus duvets, bedsheets, curtains, shoes, carpets and doormats — and anything else you describe under Other."],
    ["How much does it cost?", "See the Price List page for current prices. Final amounts are confirmed by our team once your items are received."],
    ["Do you offer pickup and delivery?", "Yes — choose “I Need Pickup” when booking and tell us your area, location and preferred date and time. When your laundry is ready you can choose delivery on your tracking page."],
    ["How do I book?", "Use the Book a Service page to complete a short, step-by-step request."],
    ["Do I need an account?", "No. You do not need an account to book or track a request."],
    ["How do I track my request?", "Go to Track My Request and enter your request number and the phone number you booked with."],
    ["What happens after I submit a request?", "You'll receive a unique request number, and our team will confirm and process it."],
    ["Can I download my ticket?", "Yes — a printable ticket is available on the confirmation and tracking pages. The receipt unlocks once payment is confirmed."],
    ["Where are you located?", settings.address ? settings.address : "Please call or WhatsApp us and we'll share our location."],
    [`How do I contact ${BRAND.name}?`, `Call or WhatsApp ${settings.phone || PHONE_DISPLAY}.`],
    ["How do I know when my laundry is ready?", "Track your request online — the status changes to Ready for Collection when it's done."],
  ];
  return (
    <Section>
      <Eyebrow>FAQ</Eyebrow>
      <H2>Frequently Asked Questions</H2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16, maxWidth: 760 }}>
        {faqs.map(([q, a]) => (
          <details key={q} style={{ background: "#fff", border: "1px solid #E8E0CC", borderRadius: 12, padding: "14px 18px" }}>
            <summary style={{ fontWeight: 700, color: C.ink, cursor: "pointer", fontSize: 14.5 }}>{q}</summary>
            <p style={{ marginTop: 8, marginBottom: 0, fontSize: 13.5, color: "#5F594D", lineHeight: 1.65 }}>{a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function LegalPage({ slug, fallbackTitle, fallbackContent }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("legal_pages").select("*").eq("slug", slug).not("published_at", "is", null).maybeSingle();
      setPage(data);
      setLoading(false);
    })();
  }, [slug]);
  if (loading) return <Spinner />;
  return (
    <Section>
      <Eyebrow>Legal</Eyebrow>
      <H2>{page?.title || fallbackTitle}</H2>
      <p style={{ color: "#3D382F", fontSize: 14.5, maxWidth: 700, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{page?.content || fallbackContent}</p>
      {page?.published_at && <div style={{ fontSize: 12, color: "#7A7466", marginTop: 18 }}>Last published {fmtDateTime(page.published_at)}</div>}
    </Section>
  );
}

export function PrivacyPage() {
  return <LegalPage slug="privacy" fallbackTitle="Privacy Policy" fallbackContent={`We collect only the information needed to process your laundry request — your name, phone number and service details (and your location only if you choose to share it for a pickup). This information is used solely to fulfil your request and is not sold or shared with third parties. To ask about or request deletion of your information, contact us on ${PHONE_DISPLAY}.`} />;
}
export function TermsPage() {
  return <LegalPage slug="terms" fallbackTitle="Terms & Conditions" fallbackContent={`By submitting a laundry request, you agree to provide accurate contact details and to collect or receive your items within a reasonable time of completion. ${BRAND.name} handles all garments with care and recommends disclosing any special fabric requirements or stains at booking.`} />;
}
