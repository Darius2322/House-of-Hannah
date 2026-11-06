import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, Loader2, CheckCircle2, Circle, X, MessageCircle, Phone, Copy, Check, Share2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { PUBLIC_SITE_URL, C, BRAND, PHONE_INTL, WA_BASE, STATUS_FLOW, fmtDate, fmtDateTime, isValidKenyanMobile } from "../lib/constants";
import { Field, TextInput, Button, Chip, Section, Eyebrow, H2 } from "../components/UI";
import { TicketCard, DocumentActions } from "../components/Ticket";
import { ReturnPreferencePicker, ReviewModal } from "../components/TrackExtras";

export default function TrackPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [reqNo, setReqNo] = useState(params.get("request") || "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // 'notfound' | 'ratelimited' | 'badphone' | record
  const [timeline, setTimeline] = useState([]);
  const [tab, setTab] = useState("ticket");
  const [copied, setCopied] = useState(false);
  const [showReview, setShowReview] = useState(false);

  async function shareThisRequest() {
    const shareData = { title: BRAND.name, text: `My laundry request ${result.public_request_number} is all done — thanks ${BRAND.name}!`, url: PUBLIC_SITE_URL };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      alert("Link copied — share it with anyone!");
    } catch {}
  }

  async function copyRequestNumber() {
    try {
      await navigator.clipboard.writeText(result.public_request_number);
    } catch {
      // Clipboard API can be unavailable (older browsers, non-HTTPS); fail quietly.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  // Normalizes whatever the customer typed or pasted (lowercase, missing
  // hyphens, stray spaces) into the standard HOH-YYYY-NNNNNN shape before it
  // is sent to the server. QR-scanned numbers already arrive formatted.
  function normalizeRequestNumber(raw) {
    const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const m = cleaned.match(/^(HOH)(\d{4})(\d+)$/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return raw.trim().toUpperCase();
  }

  async function check() {
    if (loading || !phone.trim() || !reqNo.trim()) return;
    if (!isValidKenyanMobile(phone)) { setResult("badphone"); return; }
    const normalized = normalizeRequestNumber(reqNo);
    setReqNo(normalized);
    setLoading(true);
    setResult(null);
    setTimeline([]);
    const { data, error } = await supabase.rpc("track_request", { p_request_number: normalized, p_phone: phone.trim() });
    if (error && /rate_limited/i.test(error.message || "")) {
      setResult("ratelimited");
    } else if (!error && data && data.length > 0) {
      setResult(data[0]);
      const { data: hist } = await supabase.rpc("track_request_timeline", { p_request_number: normalized, p_phone: phone.trim() });
      setTimeline(hist || []);
    } else {
      setResult("notfound");
    }
    setLoading(false);
  }

  const isRecord = result && typeof result === "object";
  const currentIdx = isRecord ? STATUS_FLOW.findIndex((s) => s.key === result.status) : -1;

  return (
    <Section>
      <div className="track-layout" style={{ maxWidth: isRecord ? 520 : 980, margin: "0 auto", display: "grid", gridTemplateColumns: isRecord ? "1fr" : "1fr 1fr", gap: 40, alignItems: "center" }}>
        {!isRecord && (
          <div className="hoh-fade-in track-hero-img" style={{ borderRadius: 20, overflow: "hidden", border: `1px solid ${C.gold}` }}>
            <img src="/images/folding-on-bed.jpg" alt="Freshly cleaned laundry, folded and ready" style={{ width: "100%", height: "100%", minHeight: 280, objectFit: "cover", display: "block", filter: "saturate(0.8)" }} />
          </div>
        )}
        <div className="track-form-col">
        <div className="no-print" style={{ textAlign: "center", marginBottom: 26 }}>
          <Eyebrow>Track Your Order</Eyebrow>
          <H2>Track My Request</H2>
          <p style={{ color: "#5F594D", fontSize: 14 }}>Enter your request number and the phone number used when booking.</p>
        </div>
        <div className="no-print">
          <Field label="Request number" required><TextInput value={reqNo} onChange={(e) => setReqNo(e.target.value)} placeholder="HOH-2026-004821" autoCapitalize="characters" autoComplete="off" /></Field>
          <Field label="Phone number" required><TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" inputMode="tel" autoComplete="tel" onKeyDown={(e) => e.key === "Enter" && check()} /></Field>
          <Button variant="primary" full disabled={loading} onClick={check}>
            {loading ? <><Loader2 size={16} className="spin" /> Checking…</> : <><Search size={16} /> Track Request</>}
          </Button>
        </div>

        {typeof result === "string" && (
          <div role="alert" style={{ marginTop: 22, background: "#FCE8E8", color: "#B23131", padding: 16, borderRadius: 12, fontSize: 13.5, textAlign: "center" }}>
            {result === "ratelimited"
              ? "Too many attempts. Please wait a few minutes and try again, or WhatsApp us for help."
              : result === "badphone"
                ? "Please enter the Kenyan mobile number you booked with, e.g. 0745 604 435."
                : "We couldn't find a matching request. Double-check your request number and phone, or WhatsApp us for help."}
          </div>
        )}

        {isRecord && (
          <div style={{ marginTop: 28 }}>
            <div className="no-print" style={{ fontWeight: 700, color: "#0B0B0B", marginBottom: 4 }}>Hello, {result.customer_name}</div>
            <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12.5, color: "#7A7466" }}>Request Details</div>
              <button onClick={copyRequestNumber} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: copied ? "#0C7A3D" : C.accent }}>
                {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> {result.public_request_number}</>}
              </button>
            </div>

            {result.pickup_now && !["completed", "cancelled"].includes(result.status) && (
              <div className="no-print" style={{ textAlign: "center", marginBottom: 16, background: "#FCE8E8", color: "#B23131", padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 13.5 }}>
                🔴 Pickup requested now — our team has been notified.
              </div>
            )}
            {result.status === "completed" ? (
              <div className="no-print" style={{ textAlign: "center", marginBottom: 18 }}>
                <CheckCircle2 size={30} color="#0C7A3D" style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 800, color: "#0B0B0B", fontSize: 18 }}>Thank you, {result.customer_name}! ✓</div>
                <p style={{ color: "#5F594D", fontSize: 13.5, maxWidth: 380, margin: "0 auto 16px" }}>
                  Your laundry was completed{result.completed_at ? ` on ${fmtDate(result.completed_at)}` : ""}. Thank you for trusting {BRAND.name} with your laundry — we look forward to serving you again next time!
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <Button variant="primary" onClick={() => setShowReview(true)}>⭐ Leave a Review</Button>
                  <Button variant="secondary" onClick={shareThisRequest}><Share2 size={15} /> Share</Button>
                  <Button variant="secondary" onClick={() => nav("/contact")}><Phone size={15} /> Contact Us</Button>
                </div>
              </div>
            ) : result.status === "cancelled" ? (
              <div className="no-print" style={{ textAlign: "center", marginBottom: 18 }}>
                <X size={30} color="#B23131" style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 800, color: "#0B0B0B", fontSize: 18 }}>Request Cancelled</div>
              </div>
            ) : (
              <div className="no-print" style={{ marginBottom: 22 }}>
                {result.status === "ready" && (
                  <ReturnPreferencePicker requestNumber={result.public_request_number} phone={phone.trim()} current={result.return_method} />
                )}
                {STATUS_FLOW.map((s, i) => (
                  <div key={s.key} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                    {i < currentIdx ? <CheckCircle2 size={18} color="#0C7A3D" /> : i === currentIdx ? <div style={{ width: 18, height: 18, borderRadius: "50%", background: C.gold, boxShadow: `0 0 0 3px ${C.ink}` }} /> : <Circle size={18} color="#D9D1BA" />}
                    <div style={{ fontSize: 13.5, fontWeight: i <= currentIdx ? 700 : 500, color: i <= currentIdx ? "#0B0B0B" : "#A39C8B" }}>{s.label}</div>
                    {timeline.find((h) => h.status === s.key) && (
                      <div style={{ fontSize: 11, color: "#A39C8B", marginLeft: "auto", textAlign: "right" }}>{fmtDateTime(timeline.find((h) => h.status === s.key).created_at)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="no-print" style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 6 }}>
              <Chip active={tab === "ticket"} onClick={() => setTab("ticket")}>Ticket</Chip>
              <Chip active={tab === "receipt"} onClick={() => result.payment_status === "paid" && setTab("receipt")} disabled={result.payment_status !== "paid"}>
                Receipt{result.payment_status !== "paid" ? " 🔒" : ""}
              </Chip>
            </div>
            {result.payment_status !== "paid" && tab === "receipt" ? (
              <div className="no-print" style={{ textAlign: "center", color: "#7A7466", fontSize: 13, marginBottom: 14 }}>
                The receipt becomes available once payment is confirmed. Your ticket is available now below.
              </div>
            ) : null}
            <TicketCard req={result} kind={result.payment_status !== "paid" && tab === "receipt" ? "ticket" : tab} />
            <DocumentActions req={result} kind={result.payment_status !== "paid" && tab === "receipt" ? "ticket" : tab} />
            <div className="no-print" style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
              <Button variant="whatsapp" onClick={() => window.open(`${WA_BASE}?text=${encodeURIComponent(`Hello ${BRAND.name}, I am asking about request ${result.public_request_number}.`)}`, "_blank", "noopener,noreferrer")}><MessageCircle size={16} /> WhatsApp Us</Button>
              <Button variant="secondary" onClick={() => window.open(`tel:+${PHONE_INTL}`, "_self")}><Phone size={16} /> Call Us</Button>
            </div>
          </div>
        )}
        </div>
      </div>
      <style>{`
        .track-hero-img { order: 2; }
        .track-form-col { order: 1; }
        @media (max-width: 760px) {
          .track-layout { grid-template-columns: 1fr !important; }
          .track-hero-img { order: -1; max-height: 220px; }
        }
      `}</style>
      {showReview && <ReviewModal requestNumber={isRecord ? result.public_request_number : undefined} serviceName={isRecord ? (result.custom_service || result.service_name) : undefined} onClose={() => setShowReview(false)} />}
    </Section>
  );
}
