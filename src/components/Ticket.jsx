import React, { useState } from "react";
import { Printer, Download, Loader2 } from "lucide-react";
import { C, BRAND, PHONE_DISPLAY, fmtDate, STATUS_LABEL, FONT_DISPLAY } from "../lib/constants";
import { useBusinessSettings } from "../lib/useBusinessSettings";
import { Button } from "./UI";
import { RequestQR } from "./RequestQR";
import { downloadTicketPdf } from "../lib/generatePdf";

// `req` here is the customer-safe shape returned by the track_request() RPC,
// or the equivalent fields from a freshly-created request. It intentionally
// never includes internal_notes, assigned_worker_id, or raw ids.
export function TicketCard({ req, kind = "ticket" }) {
  const { settings } = useBusinessSettings();
  const serviceName = req.custom_service ? `Other — ${req.custom_service}` : req.service_name;
  return (
    <div className="printable-ticket" style={{ background: "#fff", border: `2px solid ${C.ink}`, borderRadius: 16, overflow: "hidden", maxWidth: 440, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px", background: C.ink, borderBottom: `3px solid ${C.gold}`, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
        <img src="/logo.png" alt={BRAND.name} width={52} height={52} style={{ height: 52, width: 52 }} />
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: C.goldLight, textTransform: "uppercase", letterSpacing: 1.5 }}>
          {kind === "receipt" ? "Service Receipt" : "Service Ticket"}
        </div>
      </div>
      <div style={{ padding: 24 }}>
      <div style={{ background: C.ivory, border: "1px solid #E8E0CC", borderRadius: 10, padding: "10px 14px", textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#5F594D", fontWeight: 600 }}>REQUEST NUMBER</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, letterSpacing: 0.5 }}>{req.public_request_number}</div>
      </div>
      {[
        ["Customer", req.customer_name], ["Service", serviceName],
        ["Quantity", req.quantity_approx || "—"],
        ["Pickup / Drop-off", req.fulfillment_type === "pickup" ? `Pickup — ${req.pickup_area || ""}` : "Drop-off at shop"],
        ["Date", fmtDate(req.created_at)], ["Status", STATUS_LABEL[req.status] || req.status],
        ...(kind === "receipt" ? [["Amount", req.amount ? `KES ${req.amount}` : "To Be Confirmed"], ["Payment Status", req.payment_status === "paid" ? "Paid" : "Unpaid"]] : []),
      ].map(([l, v], i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "7px 0", borderBottom: "1px dashed #E8E0CC" }}>
          <span style={{ color: "#7A7466", fontWeight: 600 }}>{l}</span><span style={{ color: C.ink, fontWeight: 600 }}>{v}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
        <RequestQR requestNumber={req.public_request_number} />
      </div>
      <div style={{ marginTop: 4, textAlign: "center", fontSize: 11.5, color: "#7A7466", lineHeight: 1.6 }}>
        {BRAND.name} · {settings.phone || PHONE_DISPLAY}{settings.address ? ` · ${settings.address}` : ""}<br />Track anytime under Track Request on our site.
      </div>
      {kind === "receipt" && req.payment_status !== "paid" && (
        <div style={{ marginTop: 10, fontSize: 10.5, color: "#B23131", textAlign: "center" }}>This is not proof of payment.</div>
      )}
      </div>
    </div>
  );
}

export function DocumentActions({ req, kind }) {
  const { settings } = useBusinessSettings();
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      await downloadTicketPdf(req, kind, { phone: settings.phone, address: settings.address });
    } catch {
      alert("Couldn't generate the PDF. Please try again, or use Print instead.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="no-print" style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
      {req && (
        <Button variant="primary" onClick={download} disabled={downloading}>
          {downloading ? <Loader2 size={16} className="spin" /> : <Download size={16} />} Download PDF
        </Button>
      )}
      <Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Print</Button>
    </div>
  );
}
