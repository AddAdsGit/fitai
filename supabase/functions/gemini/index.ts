import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

let globalKeyPointer = 0;

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
    const { prompt, image, mimeType, userApiKey } = body;
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt parameter in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Retrieve & Parse Gemini API Key Pool (Priority: Custom user keys -> GEMINI_API_KEYS -> GEMINI_API_KEY)
    const rawKeysString = (userApiKey && typeof userApiKey === "string" && userApiKey.trim())
      ? userApiKey.trim()
      : (Deno.env.get("GEMINI_API_KEYS") || Deno.env.get("GEMINI_API_KEY") || "");

    const keyPool = rawKeysString
      .split(/[,;\n]+/)
      .map((k: string) => k.trim())
      .filter(Boolean);

    if (keyPool.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No Gemini API keys found. Please set GEMINI_API_KEYS in Supabase secrets or enter API keys in App Settings.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Round-robin selection index
    const startIndex = globalKeyPointer % keyPool.length;
    globalKeyPointer = (globalKeyPointer + 1) % keyPool.length;

    const orderedKeys = [
      ...keyPool.slice(startIndex),
      ...keyPool.slice(0, startIndex)
    ];

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

    // 4. Key Pool Loop: Round-Robin rotation with instant failover on 429 rate limit
    let response = null;
    let lastError = "";

    for (const apiKey of orderedKeys) {
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

            // If key hit rate limit (429) or quota error (403), failover to next key in key pool
            if (response.status === 429 || response.status === 403 || lastError.includes("RESOURCE_EXHAUSTED")) {
              console.warn(`[Key Pool] Key ${apiKey.substring(0, 6)}... hit rate limit (${response.status}). Failing over to next key...`);
              break;
            }
          }
        } catch (err: any) {
          lastError = err.message || "Connection failed";
        }
      }

      if (response && response.ok) {
        break;
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
