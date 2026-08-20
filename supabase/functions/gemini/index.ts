import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

let globalKeyPointer = 0;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { prompt, image, mimeType, userApiKey, openRouterKey, action } = body;

    // 1. Retrieve & Parse Gemini API Key Pool from env or user input
    const rawKeysString = (userApiKey && typeof userApiKey === "string" && userApiKey.trim())
      ? userApiKey.trim()
      : (Deno.env.get("GEMINI_API_KEYS") || Deno.env.get("GEMINI_API_KEY") || "");

    const keyPool = rawKeysString
      .split(/[,;\n]+/)
      .map((k: string) => k.trim())
      .filter(Boolean);

    if (keyPool.length === 0) {
      keyPool.push(DEFAULT_BACKUP_KEY);
    }

    // Round-robin selection index
    const startIndex = globalKeyPointer % keyPool.length;
    globalKeyPointer = (globalKeyPointer + 1) % keyPool.length;

    const orderedKeys = [
      ...keyPool.slice(startIndex),
      ...keyPool.slice(0, startIndex)
    ];

    // Handle ListModels Request
    if (action === "listModels") {
      for (const apiKey of orderedKeys) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          if (res.ok) {
            const data = await res.json();
            const models = (data.models || [])
              .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
              .map((m: any) => ({
                name: m.name.replace(/^models\//, ""),
                displayName: m.displayName || m.name,
                description: m.description || "",
              }));
            return new Response(JSON.stringify({ models }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (_) {}
      }
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt parameter in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parts: any[] = [{ text: prompt }];
    if (image && typeof image === "string" && image.trim().length > 20) {
      const cleanBase64 = image.includes(",") ? image.split(",")[1] : image;
      if (cleanBase64 && cleanBase64.trim().length > 20) {
        parts.push({
          inline_data: {
            mime_type: mimeType || "image/jpeg",
            data: cleanBase64.trim(),
          },
        });
      }
    }

    // 2. Try Google Gemini Flash Models (gemini-3.6-flash -> gemini-3.7-flash) with Key Rotation
    let response = null;
    let lastError = "";

    for (const apiKey of orderedKeys) {
      for (const model of ["gemini-3.6-flash", "gemini-3.7-flash"]) {
        try {
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.1,
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
            console.warn(`[Gemini Edge] ${model} with key ${apiKey.substring(0, 6)}... returned ${response.status}: ${lastError}`);
          }
        } catch (err: any) {
          lastError = err.message || "Connection failed";
        }
      }

      if (response && response.ok) {
        break;
      }
    }

    // 3. Fallback: If Gemini failed or quota exhausted, try OpenRouter if key available
    const orApiKey = (openRouterKey && typeof openRouterKey === "string" && openRouterKey.trim())
      ? openRouterKey.trim()
      : Deno.env.get("OPENROUTER_API_KEY") || "";

    if ((!response || !response.ok) && orApiKey) {
      try {
        console.log("[Gemini Edge] Triggering OpenRouter Fallback...");
        const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${orApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://fitai.app",
            "X-Title": "FitAI",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
        });

        if (orRes.ok) {
          const orData = await orRes.json();
          const content = orData?.choices?.[0]?.message?.content || "{}";
          return new Response(JSON.stringify({ text: content, candidates: [{ content: { parts: [{ text: content }] } }] }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (orErr: any) {
        console.error("[Gemini Edge] OpenRouter fallback error:", orErr);
      }
    }

    if (!response || !response.ok) {
      return new Response(JSON.stringify({ error: lastError || "Failed to contact AI service" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
