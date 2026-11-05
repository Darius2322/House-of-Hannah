// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------
export const BRAND = {
  name: "House of Hannah",
  legalName: "House of Hannah",
  tagline: "Quality care for every garment",
  descriptor: "All Laundry Services",
};

// Single source of truth for the business phone number. WhatsApp links use
// the international form (no "+", no leading zero).
export const PHONE_DISPLAY = "0745 604 435";
export const PHONE_INTL = "254745604435";
export const WA_BASE = `https://wa.me/${PHONE_INTL}`;
export const WA_GREETING = `Hello ${BRAND.name}, I would like to ask about your laundry services.`;

// Optional developer credit shown in the footer. Set to null to hide it.
export const DEVELOPER_CREDIT = {
  name: "Darius",
  phone: "0110554040",
  email: "dariusmomanyi678@gmail.com",
};

// ---------------------------------------------------------------------------
// Palette — taken from the House of Hannah logo and price list (black + gold).
// `accent` is the deep gold used for text/icons on light backgrounds so it
// keeps WCAG AA contrast; `gold` is the bright metallic gold used for fills,
// borders and anything sitting on black.
// ---------------------------------------------------------------------------
export const C = {
  ink: "#0B0B0B",
  ink2: "#1A1A1A",
  gold: "#D4AF37",
  goldLight: "#F0CF6E",
  accent: "#8C6A00",
  ivory: "#FAF6EC",
  sand: "#F1EBDC",
  white: "#FFFFFF",
  whatsapp: "#25D366",
};

export const FONT_DISPLAY = "'Cinzel', Georgia, 'Times New Roman', serif";
export const FONT_BODY = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

// ---------------------------------------------------------------------------
// Phone handling — mirrors public.normalize_kenyan_phone() in the SQL schema,
// so the UI previews exactly what the database will store.
// ---------------------------------------------------------------------------
export function normalizeKenyanPhone(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.length === 9) return "254" + digits;
  return digits;
}
export function isValidKenyanMobile(raw) {
  return /^254[17]\d{8}$/.test(normalizeKenyanPhone(raw));
}

export const STATUS_FLOW = [
  { key: "submitted", label: "Request Received" },
  { key: "confirmed", label: "Confirmed" },
  { key: "picked_up", label: "Clothes Received" },
  { key: "processing", label: "Cleaning" },
  { key: "ready", label: "Ready for Collection" },
  { key: "completed", label: "Completed" },
];
export const STATUS_LABEL = Object.fromEntries(STATUS_FLOW.map((s) => [s.key, s.label]));
STATUS_LABEL.cancelled = "Cancelled";

// The 47 Kenyan counties — used for the pickup location selector.
// Constituency and ward stay free-text on purpose: a complete, accurate
// county → constituency → ward dataset should come from IEBC's official
// delimitation data before it is turned into dependent dropdowns.
export const KENYA_COUNTIES = [
  "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita Taveta",
  "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru",
  "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua",
  "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot",
  "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi",
  "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet",
  "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu", "Homa Bay",
  "Migori", "Kisii", "Nyamira", "Nairobi",
].sort();

export const ITEM_TYPES = ["Shirts", "T-shirts", "Trousers", "Dresses", "Suits", "Jackets", "Bedsheets", "Blankets", "Curtains", "Towels", "Shoes", "Carpets", "Doormats", "Duvets"];
export const STAIN_TYPES = ["Oil", "Mud", "Food", "Ink", "Odour", "Unknown"];
export const MATERIAL_TYPES = ["Cotton", "Wool", "Silk", "Linen", "Leather", "Suede", "Polyester", "Mixed fabric", "Unknown"];

export function formatPrice(service) {
  if (service?.price_type === "fixed" && service.price_amount != null) {
    const amount = Number(service.price_amount).toLocaleString("en-KE");
    return service.price_unit ? `KSh ${amount} ${service.price_unit}` : `KSh ${amount}`;
  }
  return "Price on request";
}

export function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtDateTime(iso) {
  if (!iso) return "—";
  // Always shown in East Africa Time regardless of the viewer's device timezone.
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
}
