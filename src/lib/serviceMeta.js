import { Droplets, Shirt, Wind, Layers, Sparkles, HelpCircle, Square, Footprints, BedDouble } from "lucide-react";

// Presentation metadata per service slug (icon, marketing copy, and how the
// booking form should word its quantity question). Name, price and image come
// live from the `services` table, so edits in Admin → Services always win;
// this only fills in what isn't a database column.
export const SERVICE_META = {
  "wash-fold": {
    icon: Droplets, desc: "Everyday laundry washed, dried and neatly folded.",
    benefits: ["Washed, dried and folded", "Charged per kilogram", "Gentle, fresh-smelling finish"],
    qty: { label: "Approximate weight", hint: 'Rough numbers are fine, e.g. "6 kg" or "a basketful"', placeholder: "e.g. 6 kg" },
  },
  "wash-fold-iron": {
    icon: Wind, desc: "Washed, folded and professionally pressed, ready to wear.",
    benefits: ["Crisp, wrinkle-free results", "Careful heat control", "Ready to wear or hang"],
    qty: { label: "Approximate weight", hint: 'Rough numbers are fine, e.g. "6 kg" or "a basketful"', placeholder: "e.g. 6 kg" },
  },
  "dry-cleaning": {
    icon: Shirt, desc: "Specialist care for suits, dresses and delicate garments.",
    benefits: ["Gentle on suits and delicates", "No shrinkage or fading", "Crisp, pressed finish"],
    qty: { label: "Number of garments", hint: 'e.g. "2 suits and 3 dresses"', placeholder: "e.g. 5" },
  },
  "duvet-4x6": { icon: BedDouble, desc: "Deep-cleaned 4×6 duvet, returned fresh and fluffy.", benefits: ["Deep wash and thorough drying", "Fresh and fluffy finish"], qty: { label: "Number of duvets", hint: "How many duvets?", placeholder: "e.g. 1" } },
  "duvet-5x6": { icon: BedDouble, desc: "Deep-cleaned 5×6 duvet, returned fresh and fluffy.", benefits: ["Deep wash and thorough drying", "Fresh and fluffy finish"], qty: { label: "Number of duvets", hint: "How many duvets?", placeholder: "e.g. 1" } },
  "duvet-6x6": { icon: BedDouble, desc: "Deep-cleaned 6×6 duvet, returned fresh and fluffy.", benefits: ["Deep wash and thorough drying", "Fresh and fluffy finish"], qty: { label: "Number of duvets", hint: "How many duvets?", placeholder: "e.g. 1" } },
  bedsheets: { icon: Layers, desc: "Bedsheets washed and folded, charged per pair.", benefits: ["Fresh, crisp linen", "Charged per pair"], qty: { label: "Number of pairs", hint: "A pair is two sheets", placeholder: "e.g. 3" } },
  curtains: { icon: Square, desc: "Curtains cleaned with care, charged per pair.", benefits: ["Removes dust and odours", "Charged per pair"], qty: { label: "Number of pairs", hint: "A pair is two curtain panels", placeholder: "e.g. 2" } },
  shoes: { icon: Footprints, desc: "Cleaning and care for shoes and sneakers.", benefits: ["Restores shoes and sneakers", "Material-specific cleaning", "Charged per pair"], qty: { label: "Number of pairs", hint: "How many pairs?", placeholder: "e.g. 2" } },
  "carpet-cleaning": { icon: Sparkles, desc: "Professional cleaning for carpets and rugs.", benefits: ["Removes deep dirt and odour", "Safe for most carpet materials", "Charged per kilogram"], qty: { label: "Approximate carpet size or weight", hint: 'e.g. "Large living room rug, about 3x4m"', placeholder: "e.g. 3x4 m" } },
  doormats: { icon: Square, desc: "Doormats cleaned and refreshed, charged per piece.", benefits: ["Removes ground-in dirt", "Charged per piece"], qty: { label: "Number of pieces", hint: "How many doormats?", placeholder: "e.g. 2" } },
  other: { icon: HelpCircle, desc: "Tell us exactly what you need — we will take it from there.", benefits: ["Describe your request in your own words", "No need to fit a fixed category", "Our team will confirm details with you"], qty: { label: "Approximate quantity", hint: 'Rough numbers are fine, e.g. "17" or "a basketful"', placeholder: "e.g. 17" } },
};

export const DEFAULT_META = { icon: Sparkles, desc: "", benefits: [], qty: { label: "Approximate quantity", hint: 'Rough numbers are fine, e.g. "17" or "a basketful"', placeholder: "e.g. 17" } };
export const metaFor = (slug) => SERVICE_META[slug] || DEFAULT_META;
