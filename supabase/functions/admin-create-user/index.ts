// supabase/functions/admin-create-user/index.ts
// Invokes Supabase admin API to create users.
// Required because the anon key cannot create auth users.
// Service role key is stored as a Supabase secret — never in browser.
//
// Deploy:
//   supabase functions deploy admin-create-user
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
//
// (SUPABASE_URL is auto-provided by the Supabase Edge runtime.)

import { serve }       from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

const CORS = {
  "Access-Control-Allow-Origin":  "*", // tighten to your Vercel domain in prod
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY              = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!SERVICE_ROLE_KEY) {
      return json({ error: "Server not configured: SUPABASE_SERVICE_ROLE_KEY missing" }, 500);
    }

    // 1. Verify the caller is an admin via their JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Invalid session" }, 401);

    const { data: profile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return json({ error: "Forbidden: admin only" }, 403);
    }

    // 2. Parse the invite payload
    const body = await req.json();
    const { action, email, password, fullName, role, userId, isActive } = body || {};

    // 3. Service-role client can do anything
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (action === "create") {
      if (!email || !password || !role) {
        return json({ error: "email, password, role required" }, 400);
      }
      if (!["admin", "dentist", "receptionist"].includes(role)) {
        return json({ error: "invalid role" }, 400);
      }

      // Create the auth user (auto-confirm so they can log in immediately)
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || "" },
      });
      if (cErr) return json({ error: cErr.message }, 400);

      // The handle_new_user trigger inserts a row in profiles with default role 'receptionist'.
      // Update to the desired role + name.
      await admin
        .from("profiles")
        .update({ role, full_name: fullName || "", is_active: true })
        .eq("id", created.user.id);

      return json({ success: true, user: { id: created.user.id, email } });
    }

    if (action === "update_role") {
      if (!userId || !role) return json({ error: "userId, role required" }, 400);
      const { error } = await admin
        .from("profiles")
        .update({ role })
        .eq("id", userId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "set_active") {
      if (!userId || typeof isActive !== "boolean") {
        return json({ error: "userId, isActive required" }, 400);
      }
      const { error } = await admin
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", userId);
      if (error) return json({ error: error.message }, 400);
      // Optionally: also disable the auth user when deactivated
      if (!isActive) {
        await admin.auth.admin.updateUserById(userId, { ban_duration: "100y" });
      } else {
        await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      }
      return json({ success: true });
    }

    if (action === "reset_password") {
      if (!userId || !password) return json({ error: "userId, password required" }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: err.message || "Server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
