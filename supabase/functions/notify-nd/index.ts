// Edge function: envia e-mail de notificação ao criar/excluir ND.
// Usa Resend se RESEND_API_KEY estiver disponível; caso contrário, apenas loga.
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  to: string;
  subject: string;
  html: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, subject, html } = (await req.json()) as Payload;
    if (!to) {
      return new Response(JSON.stringify({ skipped: true, reason: "no recipient" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.log("[notify-nd] RESEND_API_KEY ausente. Email simulado:", { to, subject });
      return new Response(JSON.stringify({ simulated: true, to, subject }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "GesContas <onboarding@resend.dev>", to: [to], subject, html }),
    });
    const data = await r.json();
    return new Response(JSON.stringify(data), {
      status: r.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[notify-nd] erro:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
