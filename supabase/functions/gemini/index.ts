import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify Authorization header is present
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { prompt, image, mimeType } = body;
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt parameter in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Retrieve Gemini API Key
    const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY secret is not set in Supabase Edge Function environment. Please enter a custom Gemini API key in App Settings.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const parts: any[] = [{ text: prompt }];
    if (image) {
      const cleanBase64 = image.includes(",") ? image.split(",")[1] : image;
      parts.push({
        inline_data: {
          mime_type: mimeType || "image/jpeg",
          data: cleanBase64,
        },
      });
    }

    // 4. Direct Call to Google's stable gemini-2.5-flash model with JSON config
    let response = null;
    let lastError = "";

    for (const model of ["gemini-2.5-flash", "gemini-1.5-flash"]) {
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 300,
              responseMimeType: "application/json"
            }
          })
        });

        if (response.ok) {
          lastError = "";
          break;
        } else {
          const errData = await response.json().catch(() => ({}));
          lastError = errData.error?.message || `HTTP ${response.status} Error`;
        }
      } catch (err: any) {
        lastError = err.message || "Connection failed";
      }
    }

    if (!response || !response.ok) {
      throw new Error(lastError || "Failed to contact Gemini API");
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Gemini Proxy Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
