// supabase/functions/send-whatsapp/index.ts
// Deploy: supabase functions deploy send-whatsapp
// Secrets: supabase secrets set WA_PHONE_NUMBER_ID=xxx WA_ACCESS_TOKEN=xxx

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://lifedent-crm.vercel.app";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // ── 1. Verify the caller is an authenticated Supabase user ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // ── 2. Parse and validate request body ──
    const { to, body, patientId, kind, appointmentId } = await req.json();

    if (!to || !body) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'body'" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Prevent oversized payloads
    if (body.length > 1024) {
      return new Response(JSON.stringify({ error: "Message body too long" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Validate kind
    const ALLOWED_KINDS = ["CONFIRMATION", "REMINDER", "RECALL"];
    if (kind && !ALLOWED_KINDS.includes(kind)) {
      return new Response(JSON.stringify({ error: "Invalid message kind" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // ── 3. Format Egyptian number ──
    const formatNumber = (raw: string): string => {
      const digits = raw.replace(/\D/g, "");
      if (digits.startsWith("20")) return `+${digits}`;
      return `+20${digits.replace(/^0/, "")}`;
    };

    const waNumber = formatNumber(to);

    // ── 4. Call Meta WhatsApp API (token lives only here) ──
    const PHONE_NUMBER_ID = Deno.env.get("WA_PHONE_NUMBER_ID");
    const ACCESS_TOKEN    = Deno.env.get("WA_ACCESS_TOKEN");

    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured on server" }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const waRes = await fetch(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: waNumber,
          type: "text",
          text: { body },
        }),
      }
    );

    const waData = await waRes.json();

    if (!waRes.ok) {
      throw new Error(waData?.error?.message || "WhatsApp API error");
    }

    const wamid = waData?.messages?.[0]?.id || null;

    // ── 5. Log the message to Supabase ──
    await supabase.from("messages").insert({
      channel:    "WhatsApp",
      to_number:  waNumber,
      kind,
      body,
      status:     "Delivered",
      wamid,
      sent_by:    user.id,
    });

    return new Response(JSON.stringify({ success: true, wamid, to: waNumber }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-whatsapp error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
