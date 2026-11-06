import React, { useEffect, useMemo, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { C, FONT_DISPLAY } from "../lib/constants";
import { Section, Eyebrow, H2, Field, TextInput, TextArea, Button, Spinner, EmptyState } from "../components/UI";
import { ReviewCarousel, Stars, ANONYMOUS } from "../components/ReviewCarousel";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", contact: "", rating: 5, text: "", website: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, customer_name, rating, review_text, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error && data) setReviews(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const average = useMemo(() => (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0), [reviews]);

  async function submit() {
    if (form.website) { setDone(true); return; } // honeypot: real people never fill this hidden field
    if (!form.text.trim()) { setError("Please write a few words about your experience."); return; }
    const last = Number(sessionStorage.getItem("hoh-review-last") || 0);
    if (Date.now() - last < 30000) { setError("Please wait a moment before submitting another review."); return; }
    setSubmitting(true);
    setError("");
    const isEmail = form.contact.includes("@");
    const { error: err } = await supabase.from("reviews").insert({
      customer_name: form.name.trim() || ANONYMOUS, // name is optional — blank means Anonymous
      phone: isEmail ? null : form.contact.trim() || null,
      email: isEmail ? form.contact.trim() : null,
      rating: form.rating,
      review_text: form.text.trim(),
    });
    setSubmitting(false);
    if (err) { setError(err.message?.includes("rate_limited") ? "You've submitted several reviews recently. Please try again later." : "We couldn't submit your review right now. Please try again."); return; }
    try { sessionStorage.setItem("hoh-review-last", String(Date.now())); } catch { /* storage unavailable */ }
    setDone(true);
    setForm({ name: "", contact: "", rating: 5, text: "", website: "" });
    load();
  }

  return (
    <>
      {/* 1 — what customers say (auto-advancing, 3 seconds per review) */}
      <Section>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <Eyebrow>Reviews</Eyebrow>
          <H2>What customers say</H2>
          {reviews.length > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <Stars value={Math.round(average)} />
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: C.ink, fontSize: 18 }}>{average.toFixed(1)}</span>
              <span style={{ fontSize: 13, color: "#7A7466" }}>from {reviews.length} review{reviews.length > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
        {loading ? <Spinner /> : reviews.length === 0 ? (
          <EmptyState title="No reviews yet" desc="Be the first to share your experience below." />
        ) : (
          <ReviewCarousel reviews={reviews} />
        )}
      </Section>

      {/* 2 — share your own */}
      <Section bg={C.ivory}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <Eyebrow>Your Turn</Eyebrow>
            <H2>Share your experience</H2>
          </div>
          <div style={{ background: "#fff", border: "1px solid #E8E0CC", borderRadius: 16, padding: 24 }}>
            {done ? (
              <div role="status" style={{ textAlign: "center", padding: 10 }}>
                <MessageSquareText size={26} color="#0C7A3D" style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 700, color: C.ink }}>Thanks for your review!</div>
                <div style={{ fontSize: 13, color: "#5F594D", marginTop: 4 }}>Thank you for sharing your experience.</div>
                <Button variant="ghost" onClick={() => setDone(false)} style={{ marginTop: 10 }}>Leave another</Button>
              </div>
            ) : (
              <>
                <Field label="Your name" hint="Optional — leave blank to post as Anonymous">
                  <TextInput value={form.name} maxLength={80} autoComplete="name" onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Anonymous" />
                </Field>
                <Field label="Phone or email" hint="Optional — kept private, never shown on the site">
                  <TextInput value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
                </Field>
                <Field label="Rating" required><Stars value={form.rating} onChange={(n) => setForm((f) => ({ ...f, rating: n }))} /></Field>
                <input className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
                <Field label="Your review" required>
                  <TextArea value={form.text} maxLength={1000} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Tell us about your experience..." />
                </Field>
                {error && <div role="alert" style={{ color: "#B23131", fontSize: 13, marginBottom: 10 }}>{error}</div>}
                <Button variant="primary" full disabled={submitting} onClick={submit}>{submitting ? "Submitting…" : "Submit Review"}</Button>
              </>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
