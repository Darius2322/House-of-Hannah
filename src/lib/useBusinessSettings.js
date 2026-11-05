import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { BRAND, PHONE_DISPLAY, PHONE_INTL, WA_BASE } from "./constants";

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

// Fallback so the site still renders correctly before the business_settings
// row loads, or if it is ever missing. Address/email/hours stay empty until
// the owner fills them in under Admin → Business Profile — nothing is guessed.
const FALLBACK = {
  business_name: BRAND.name,
  tagline: BRAND.tagline,
  phone: PHONE_DISPLAY,
  whatsapp_number: PHONE_INTL,
  address: null,
  maps_url: null,
  email: null,
  business_hours: null,
};

export function useBusinessSettings() {
  const [settings, setSettings] = useState(FALLBACK);
  const [socials, setSocials] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: bs }, { data: sl }] = await Promise.all([
          supabase.from("business_settings").select("*").eq("id", 1).maybeSingle(),
          supabase.from("social_links").select("*").eq("is_active", true),
        ]);
        if (cancelled) return;
        if (bs) setSettings({ ...FALLBACK, ...Object.fromEntries(Object.entries(bs).filter(([, v]) => v !== null && v !== "")) });
        if (sl) setSocials(sl.filter((s) => /^https?:\/\//i.test(s.url || "")));
      } catch {
        /* keep the fallback */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const waBase = settings.whatsapp_number ? `https://wa.me/${settings.whatsapp_number}` : WA_BASE;
  return { settings, socials, loaded, waBase, DAY_KEYS, DAY_LABELS };
}

export function formatHoursLine(hours, dayKey) {
  const d = hours?.[dayKey];
  if (!d || d.closed) return "Closed";
  if (!d.open || !d.close) return "—";
  return `${d.open} – ${d.close}`;
}
