// supabase/functions/create-worker/index.ts
//
// Admin-only staff management. This is the ONLY place the service-role key is
// used; it never reaches the browser.
//
//   { action: "create", full_name, email, phone?, role: "manager" | "worker", temp_password }
//   { action: "reset_password", worker_id, temp_password }
//
// Deploy:   supabase functions deploy create-worker
// Secrets:  supabase secrets set ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Only the business's own site may call this from a browser. Local dev origins
// are allowed only while ALLOWED_ORIGINS is unset (never in production).
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED.length ? ALLOWED : DEV_ORIGINS;
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!jwt) return reply({ error: "Missing authorization" }, 401);

    const { data: { user }, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !user) return reply({ error: "Not authenticated" }, 401);

    const { data: caller } = await admin.from("profiles").select("role, full_name, is_active").eq("id", user.id).maybeSingle();
    if (!caller || !caller.is_active || caller.role !== "admin") {
      return reply({ error: "Only admins can manage staff accounts" }, 403);
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return reply({ error: "Invalid request body" }, 400); }
    const action = (body.action as string) || "create";
    const log = (entry: Record<string, unknown>) =>
      admin.from("activity_logs").insert({ actor_id: user.id, actor_label: caller.full_name || "admin", ...entry });

    if (action === "reset_password") {
      const workerId = String(body.worker_id ?? "");
      const pw = String(body.temp_password ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(workerId)) return reply({ error: "A valid worker_id is required" }, 400);
      if (pw.length < 10 || pw.length > 72) return reply({ error: "Password must be 10–72 characters" }, 400);

      // Admin accounts are never reset through this endpoint — only staff below admin.
      const { data: target } = await admin.from("profiles").select("role").eq("id", workerId).maybeSingle();
      if (!target || target.role === "admin") return reply({ error: "That account cannot be reset here" }, 403);

      const { error } = await admin.auth.admin.updateUserById(workerId, { password: pw });
      if (error) return reply({ error: error.message }, 400);
      await log({ action: "worker_password_reset", target_table: "profiles", target_id: workerId });
      return reply({ ok: true });
    }

    if (action !== "create") return reply({ error: "Unknown action" }, 400);

    const fullName = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim().slice(0, 30) : null;
    const role = String(body.role ?? "");
    const pw = String(body.temp_password ?? "");

    if (!fullName || fullName.length > 100) return reply({ error: "A full name (max 100 characters) is required" }, 400);
    if (!EMAIL_RE.test(email) || email.length > 150) return reply({ error: "A valid email is required" }, 400);
    if (!["manager", "worker"].includes(role)) return reply({ error: "role must be 'manager' or 'worker'" }, 400);
    if (pw.length < 10 || pw.length > 72) return reply({ error: "Password must be 10–72 characters" }, 400);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true });
    if (createErr || !created?.user) return reply({ error: createErr?.message ?? "Could not create user" }, 400);

    const { error: profileErr } = await admin.from("profiles").insert({
      id: created.user.id, full_name: fullName, phone, role, is_active: true,
    });
    if (profileErr) {
      // Don't leave an orphaned login behind if the profile row failed.
      await admin.auth.admin.deleteUser(created.user.id);
      return reply({ error: profileErr.message }, 400);
    }

    await log({ action: "worker_created", target_table: "profiles", target_id: created.user.id });
    return reply({ ok: true, userId: created.user.id });
  } catch (_e) {
    return reply({ error: "Unexpected server error" }, 500);
  }
});
