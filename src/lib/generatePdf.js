import { BRAND, PHONE_DISPLAY, fmtDate, STATUS_LABEL } from "./constants";
import { trackingUrl } from "../components/RequestQR";

// jsPDF and qrcode are loaded on demand so they never weigh down the first
// page load — they are only needed when someone taps "Download PDF".
async function loadLogoDataUrl() {
  try {
    const res = await fetch("/logo-on-black.png");
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null; // header text still prints without the logo
  }
}

const INK = [11, 11, 11];
const GOLD = [212, 175, 55];
const GOLD_LIGHT = [240, 207, 110];
const MUTED = [122, 116, 102];

export async function downloadTicketPdf(req, kind = "ticket", business = {}) {
  const [{ jsPDF }, { default: QRCode }, logoDataUrl] = await Promise.all([
    import("jspdf"),
    import("qrcode"),
    loadLogoDataUrl(),
  ]);
  const qrDataUrl = await QRCode.toDataURL(trackingUrl(req.public_request_number), { width: 220, margin: 2, color: { dark: "#0B0B0B", light: "#FFFFFF" } });

  const phone = business.phone || PHONE_DISPLAY;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 56;

  // Black header band with gold rule
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageWidth, 118, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 118, pageWidth, 3, "F");
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", marginX, 20, 78, 78); } catch { /* unsupported image — header text still prints */ }
  }
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text("HOUSE OF HANNAH", marginX + 94, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(189, 181, 160);
  doc.text("ALL LAUNDRY SERVICES", marginX + 94, 72);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(kind === "receipt" ? "SERVICE RECEIPT" : "SERVICE TICKET", pageWidth - marginX, 62, { align: "right" });

  let y = 158;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);
  doc.roundedRect(marginX, y, pageWidth - marginX * 2, 56, 8, 8);
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("REQUEST NUMBER", pageWidth / 2, y + 20, { align: "center" });
  doc.setTextColor(...INK);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(req.public_request_number, pageWidth / 2, y + 42, { align: "center" });
  y += 86;

  const serviceName = req.custom_service ? `Other — ${req.custom_service}` : req.service_name;
  const rows = [
    ["Customer", req.customer_name],
    ["Service", serviceName],
    ["Quantity", req.quantity_approx || "—"],
    ["Pickup / Drop-off", req.fulfillment_type === "pickup" ? `Pickup — ${req.pickup_area || ""}` : "Drop-off at shop"],
    ["Date", fmtDate(req.created_at)],
    ["Status", STATUS_LABEL[req.status] || req.status],
    ...(kind === "receipt" ? [
      ["Amount", req.amount ? `KSh ${Number(req.amount).toLocaleString("en-KE")}` : "To Be Confirmed"],
      ["Payment Status", req.payment_status === "paid" ? "Paid" : "Unpaid"],
    ] : []),
  ];
  doc.setFontSize(11);
  rows.forEach(([label, value]) => {
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(label, marginX, y);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.text(String(value ?? "—"), pageWidth - marginX, y, { align: "right", maxWidth: pageWidth - marginX * 2 - 130 });
    doc.setDrawColor(232, 224, 204);
    doc.setLineWidth(0.5);
    doc.line(marginX, y + 8, pageWidth - marginX, y + 8);
    y += 26;
  });

  y += 20;
  const qrSize = 130;
  doc.addImage(qrDataUrl, "PNG", pageWidth / 2 - qrSize / 2, y, qrSize, qrSize);
  y += qrSize + 20;
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("Scan to track your laundry", pageWidth / 2, y, { align: "center" });
  y += 20;
  const footer = [BRAND.name, phone, business.address].filter(Boolean).join("  ·  ");
  doc.text(footer, pageWidth / 2, y, { align: "center", maxWidth: pageWidth - marginX * 2 });
  if (kind === "receipt" && req.payment_status !== "paid") {
    y += 18;
    doc.setTextColor(178, 49, 49);
    doc.text("This is not proof of payment.", pageWidth / 2, y, { align: "center" });
  }

  doc.save(`${req.public_request_number}-${kind}.pdf`);
}
