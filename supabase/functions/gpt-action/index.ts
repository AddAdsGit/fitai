import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-timezone-offset",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

// Only ChatGPT Action callback URLs may receive OAuth codes/tokens. An open
// redirect here means a crafted link can exfiltrate a user's permanent api_key.
const isAllowedRedirectUri = (uri: string): boolean => {
  try {
    const u = new URL(uri);
    return u.protocol === "https:" &&
      ["chat.openai.com", "chatgpt.com"].includes(u.hostname) &&
      u.pathname.startsWith("/aip/") &&
      u.pathname.endsWith("/oauth/callback");
  } catch (_) {
    return false;
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // 1. Initialize Supabase Client (needed for all operations)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // --- OAUTH2 ENDPOINTS (Bypass API Key authentication checks) ---

    // A. GET /oauth/authorize
    if (path.endsWith("/oauth/authorize") && method === "GET") {
      const clientId = url.searchParams.get("client_id");
      const redirectUri = url.searchParams.get("redirect_uri");
      const state = url.searchParams.get("state");

      if (!clientId || !redirectUri || !state) {
        return new Response(JSON.stringify({ error: "Missing required parameters: client_id, redirect_uri, state" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!isAllowedRedirectUri(redirectUri)) {
        return new Response(JSON.stringify({ error: "redirect_uri is not an allowed ChatGPT callback URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const redirectBase = Deno.env.get("FRONTEND_URL") || "http://localhost:3000";
      const consentUrl = `${redirectBase}/oauth-consent?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          "Location": consentUrl,
        },
      });
    }

    // B. POST /oauth/approve
    if (path.endsWith("/oauth/approve") && method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userJwtToken = authHeader.substring(7).trim();

      const { data: { user }, error: userError } = await supabase.auth.getUser(userJwtToken);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized. Invalid session token." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { client_id, redirect_uri } = body;

      if (!client_id || !redirect_uri) {
        return new Response(JSON.stringify({ error: "Missing client_id or redirect_uri in body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!isAllowedRedirectUri(redirect_uri)) {
        return new Response(JSON.stringify({ error: "redirect_uri is not an allowed ChatGPT callback URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authCode = "ac_" + crypto.randomUUID().replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { error: insertError } = await supabase
        .from("oauth_codes")
        .insert({
          code: authCode,
          profile_id: user.id,
          client_id,
          redirect_uri,
          expires_at: expiresAt,
        });

      if (insertError) {
        console.error("Failed to insert oauth code:", insertError);
        return new Response(JSON.stringify({ error: "Failed to generate authorization code" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ code: authCode }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // C. POST /oauth/token
    if (path.endsWith("/oauth/token") && method === "POST") {
      const contentType = req.headers.get("content-type") || "";
      const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
      let code = "";
      let clientId = "";
      let redirectUri = "";

      if (authHeader.startsWith("Basic ")) {
        try {
          const credentials = atob(authHeader.substring(6)).split(":");
          if (credentials[0]) clientId = credentials[0];
        } catch (_) {}
      }

      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await req.formData();
        code = formData.get("code")?.toString() || "";
        if (!clientId) clientId = formData.get("client_id")?.toString() || "";
        redirectUri = formData.get("redirect_uri")?.toString() || "";
      } else {
        try {
          const body = await req.json();
          code = body.code || "";
          if (!clientId) clientId = body.client_id || "";
          redirectUri = body.redirect_uri || "";
        } catch (_) {
          // ignore parsing error
        }
      }

      if (!code) {
        return new Response(JSON.stringify({ error: "Missing required parameter: code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Atomic delete-and-return: prevents replay attacks by consuming the code
      // in a single operation (no read-then-delete race window).
      const { data: oauthRecord, error: fetchError } = await supabase
        .from("oauth_codes")
        .delete()
        .eq("code", code)
        .select("*")
        .maybeSingle();

      if (fetchError || !oauthRecord) {
        return new Response(JSON.stringify({ error: "Invalid or expired authorization code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(oauthRecord.expires_at).getTime() < Date.now()) {
        return new Response(JSON.stringify({ error: "Authorization code has expired" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check client_id and redirect_uri match if provided
      if (clientId && oauthRecord.client_id && oauthRecord.client_id !== clientId) {
        return new Response(JSON.stringify({ error: "client_id does not match authorization request" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (redirectUri && oauthRecord.redirect_uri && oauthRecord.redirect_uri !== redirectUri) {
        return new Response(JSON.stringify({ error: "redirect_uri does not match authorization request" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: userProfile, error: profileErr } = await supabase
        .from("profiles")
        .select("api_key, id")
        .eq("id", oauthRecord.profile_id)
        .maybeSingle();

      if (profileErr || !userProfile) {
        return new Response(JSON.stringify({ error: "User profile not found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let apiKey = userProfile.api_key;
      if (!apiKey) {
        apiKey = "fit_" + crypto.randomUUID().replace(/-/g, "").substring(0, 21);
        await supabase.from("profiles").update({ api_key: apiKey }).eq("id", userProfile.id);
      }

      return new Response(JSON.stringify({
        access_token: apiKey,
        token_type: "Bearer",
        expires_in: 31536000, // 1 year cache for ChatGPT
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // D. GET or POST /telegram/cron (Bypass standard user authentication)
    if (path.endsWith("/telegram/cron")) {
      const cronSecret = Deno.env.get("CRON_SECRET");
      if (!cronSecret) {
        // Fail closed: without a configured secret the cron endpoint stays off.
        return new Response(JSON.stringify({ error: "Cron endpoint not configured" }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const requestSecret = url.searchParams.get("secret");
      if (requestSecret !== cronSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. Fetch profiles with telegram integrations active
      const { data: activeProfiles, error: fetchErr } = await supabase
        .from("profiles")
        .select("*")
        .or("telegram_reminders_enabled.eq.true,telegram_reports_enabled.eq.true");

      if (fetchErr || !activeProfiles) {
        return new Response(JSON.stringify({ error: "Failed to fetch active profiles", details: fetchErr }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];

      for (const prof of activeProfiles) {
        // The user's own bot wins — their chat_id is paired with THEIR bot; the
        // global env token is only a fallback for users without one.
        const botToken = prof.telegram_bot_token || Deno.env.get("TELEGRAM_BOT_TOKEN");
        const chatId = prof.telegram_chat_id;
        if (!botToken || !chatId) continue;

        const tz = prof.timezone || "UTC";
        // Parse local time
        let localDateStr = "";
        let localTimeStr = "";
        try {
          const d = new Date();
          const formatterDate = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          const formatterTime = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });

          // Date format splits to ["MM", "DD", "YYYY"]
          const partsDate = formatterDate.format(d).split("/");
          localDateStr = `${partsDate[2]}-${partsDate[0]}-${partsDate[1]}`;
          localTimeStr = formatterTime.format(d);
        } catch (tzErr) {
          console.error(`Invalid timezone for profile ${prof.username}: ${tz}`, tzErr);
          continue;
        }

        // A. Daily Report Check
        if (prof.telegram_reports_enabled) {
          const currentHour = parseInt(localTimeStr.split(":")[0]);
          // Send report between 21:00 (9 PM) and 22:00 (10 PM) in user local time
          if (currentHour >= 21 && currentHour < 22) {
            // Check if report already sent today
            if (prof.last_telegram_report_at !== localDateStr) {
              // Fetch meals for today
              const { data: meals, error: mealsErr } = await supabase
                .from("meals")
                .select("*")
                .eq("profile_id", prof.id)
                .eq("date", localDateStr);

              if (!mealsErr && meals) {
                let totalCals = 0;
                let totalP = 0;
                const nutrientTotals: Record<string, number> = {};
                meals.forEach((m) => {
                  totalCals += m.calories || 0;
                  totalP += m.protein || 0;
                  if (m.nutrients && typeof m.nutrients === "object") {
                    for (const [key, value] of Object.entries(m.nutrients)) {
                      if (key === "protein") continue;
                      nutrientTotals[key] = (nutrientTotals[key] || 0) + (Number(value) || 0);
                    }
                  }
                });

                const tracked = (Array.isArray(prof.tracked_nutrients) ? prof.tracked_nutrients : [])
                  .filter((n: any) => n && n.enabled !== false && n.id !== "protein");
                const nutrientEmoji: Record<string, string> = { carbs: "🍞", fats: "🥑", fiber: "🌿" };

                let msg = `📊 *Daily Nutrition Report (${localDateStr})*\n\n`;
                msg += `👤 *User:* ${prof.display_name}\n\n`;
                msg += `🔥 *Calories:* ${totalCals} / ${prof.daily_calories_goal} kcal\n`;
                msg += `🥩 *Protein:* ${totalP} / ${prof.protein_goal}g\n`;
                for (const n of tracked) {
                  const emoji = nutrientEmoji[n.id] || "🔸";
                  msg += `${emoji} *${n.name || n.id}:* ${nutrientTotals[n.id] || 0} / ${n.target || 0}${n.unit || "g"}\n`;
                }
                msg += `\n`;

                if (meals.length === 0) {
                  msg += `⚠️ You logged no meals today. Don't forget to track your nutrition!`;
                } else {
                  msg += `🍽️ *Meals logged:* \n`;
                  meals.forEach((m) => {
                    const parts = [`${m.calories} kcal`, `P:${m.protein || 0}g`];
                    if (m.nutrients && typeof m.nutrients === "object") {
                      for (const [key, value] of Object.entries(m.nutrients)) {
                        if (key === "protein") continue;
                        parts.push(`${key.charAt(0).toUpperCase()}${key.slice(1, 2)}:${Number(value) || 0}g`);
                      }
                    }
                    msg += `- *${m.name}* (${parts.join(" ")})\n`;
                  });
                }

                try {
                  const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      chat_id: chatId,
                      text: msg,
                      parse_mode: "Markdown",
                    }),
                  });

                  if (sendRes.ok) {
                    await supabase
                      .from("profiles")
                      .update({ last_telegram_report_at: localDateStr })
                      .eq("id", prof.id);
                    results.push({ username: prof.username, type: "report", status: "success" });
                  } else {
                    const errTxt = await sendRes.text();
                    console.error(`Failed to send TG report for ${prof.username}: ${errTxt}`);
                  }
                } catch (sendErr) {
                  console.error(`Error sending TG report:`, sendErr);
                }
              }
            }
          }
        }

        // B. Reminders Check
        if (prof.telegram_reminders_enabled && prof.telegram_reminder_times) {
          const reminderTimes = prof.telegram_reminder_times; // Array of HH:MM strings
          const currentHourMin = localTimeStr; // "HH:MM"
          
          // Check if current hour-min matches any reminder times
          const isTimeForReminder = reminderTimes.some((rt: string) => {
            const [rtH, rtM] = rt.split(":").map(Number);
            const [curH, curM] = currentHourMin.split(":").map(Number);
            const diffMin = (curH * 60 + curM) - (rtH * 60 + rtM);
            return diffMin >= 0 && diffMin < 15; // Trigger in 15 minute window
          });

          if (isTimeForReminder) {
            // Check if reminder was already sent recently (within 1 hour)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const lastSent = prof.last_telegram_reminder_at;
            if (!lastSent || new Date(lastSent).toISOString() < oneHourAgo) {
              const msg = `🔔 *FitAI Logging Reminder*\nHi ${prof.display_name}, it's time to log your recent meals to keep up with your daily macro goals!`;
              
              try {
                const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: msg,
                    parse_mode: "Markdown",
                  }),
                });

                if (sendRes.ok) {
                  await supabase
                    .from("profiles")
                    .update({ last_telegram_reminder_at: new Date().toISOString() })
                    .eq("id", prof.id);
                  results.push({ username: prof.username, type: "reminder", status: "success" });
                } else {
                  const errTxt = await sendRes.text();
                  console.error(`Failed to send TG reminder for ${prof.username}: ${errTxt}`);
                }
              } catch (sendErr) {
                console.error(`Error sending TG reminder:`, sendErr);
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ processed: results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- STANDARD API REQUEST AUTHENTICATION ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = authHeader.substring(7).trim();

    // Resolve user profile by API Key
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("api_key", apiKey)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Unauthorized. Invalid API Key." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scrub sensitive credential from the in-memory profile object so it
    // cannot accidentally leak via error serialization or logging.
    delete profile.api_key;

    // Parse timezone offset header (in minutes, e.g. -330 for IST +5:30)
    const timezoneOffset = req.headers.get("x-timezone-offset") || req.headers.get("X-Timezone-Offset") || "";

    const getLocalTimeAndDate = () => {
      const userTz = profile?.timezone || "UTC";
      try {
        const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: userTz }).format(new Date());
        const timeStr = new Intl.DateTimeFormat("en-US", { timeZone: userTz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date());
        return { dateStr, timeStr };
      } catch (_) {
        const d = new Date();
        return { dateStr: d.toISOString().split("T")[0], timeStr: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) };
      }
    };

    const getDailyRemaining = async (profileId: string, dateStr: string) => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("daily_calories_goal, protein_goal, tracked_nutrients")
        .eq("id", profileId)
        .single();

      if (!prof) return null;

      const { data: meals } = await supabase
        .from("meals")
        .select("calories, protein, nutrients")
        .eq("profile_id", profileId)
        .eq("date", dateStr);

      // Targets come from the tracked_nutrients config (protein_goal stays first-class).
      const tracked: { id: string; target: number; enabled: boolean }[] =
        Array.isArray(prof.tracked_nutrients) ? prof.tracked_nutrients : [];
      const targets: Record<string, number> = {};
      for (const n of tracked) {
        if (n && n.enabled !== false && n.id) targets[n.id] = n.target || 0;
      }
      targets.protein = prof.protein_goal || targets.protein || 150;

      const totals: Record<string, number> = { calories: 0, protein: 0 };
      if (meals) {
        meals.forEach((m: any) => {
          totals.calories += m.calories || 0;
          totals.protein += m.protein || 0;
          if (m.nutrients && typeof m.nutrients === "object") {
            for (const [key, value] of Object.entries(m.nutrients)) {
              if (key === "protein") continue; // first-class column wins
              totals[key] = (totals[key] || 0) + (Number(value) || 0);
            }
          }
        });
      }

      const remaining: Record<string, number> = {
        calories: Math.max(0, (prof.daily_calories_goal || 2000) - totals.calories),
        protein: Math.max(0, targets.protein - totals.protein),
      };
      for (const [id, target] of Object.entries(targets)) {
        if (id === "protein") continue;
        remaining[id] = Math.max(0, target - (totals[id] || 0));
      }
      return remaining;
    };

    const getDailyTagHits = async (profileId: string, dateStr: string) => {
      const { data: meals } = await supabase
        .from("meals")
        .select("tags")
        .eq("profile_id", profileId)
        .eq("date", dateStr);

      const tagCounts: Record<string, number> = {};
      if (meals) {
        meals.forEach((m: any) => {
          if (m.tags && Array.isArray(m.tags)) {
            m.tags.forEach((tag: string) => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          }
        });
      }
      return tagCounts;
    };

    const createMealShareUrl = async (meal: any, profileId?: string): Promise<string | null> => {
      try {
        const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://fitpush.vercel.app";
        
        // Ensure image is resolved (supports HTTP URLs, base64 data URIs, and Unsplash fallback)
        const resolvedImg = (meal.image && typeof meal.image === "string" && (meal.image.startsWith("http") || meal.image.startsWith("data:image")))
          ? meal.image
          : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80";

        const payload = {
          n: meal.name || "Meal",
          c: Number(meal.calories || 0),
          p: Number(meal.protein || 0),
          cb: Number(meal.nutrients?.carbs ?? meal.carbs ?? 0),
          f: Number(meal.nutrients?.fats ?? meal.fats ?? 0),
          fb: Number(meal.nutrients?.fiber ?? meal.fiber ?? 0),
          img: resolvedImg,
          t: meal.time || undefined,
          d: meal.meal_description || undefined,
        };

        // 1. Preferred: Insert into shares table for clean short ID link (identical to dashboard)
        const { data: inserted } = await supabase
          .from("shares")
          .insert({
            type: "meal",
            data: payload,
            ...(profileId ? { profile_id: profileId } : {})
          })
          .select("id")
          .maybeSingle();

        if (inserted?.id) {
          return `${frontendUrl}/?shareId=${inserted.id}`;
        }

        // 2. Fallback: Compact base64 string (strictly excluding any huge base64 image data)
        const minimalPayload = {
          n: meal.name || "Meal",
          c: Number(meal.calories || 0),
          p: Number(meal.protein || 0),
          cb: Number(meal.nutrients?.carbs ?? meal.carbs ?? 0),
          f: Number(meal.nutrients?.fats ?? meal.fats ?? 0),
          fb: Number(meal.nutrients?.fiber ?? meal.fiber ?? 0),
          t: meal.time || undefined,
        };
        const jsonStr = JSON.stringify(minimalPayload);
        const base64 = btoa(
          encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
            String.fromCharCode(parseInt(p1, 16))
          )
        );
        return `${frontendUrl}/?share=meal&data=${base64}`;
      } catch (err) {
        console.error("Error generating meal share URL:", err);
        return null;
      }
    };

    console.log(`[gpt-action] Request: ${method} ${path} for user: ${profile.username} (timezoneOffset: ${timezoneOffset})`);

    // 4. API Router
    
    // --- PROFILE ENDPOINTS ---
    if (path.endsWith("/profile")) {
      if (method === "GET") {
        // Projection: the GPT only needs goals/bio data. Never return api_key,
        // integration credentials, or preference entries that embed secrets.
        const safePreferences = (profile.preferences || []).filter(
          (p: string) => typeof p === "string" && !p.includes("api_key") && !p.includes(":sk-") && !p.startsWith("gemini_")
        );
        const safeProfile = {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          description: profile.description,
          height: profile.height,
          weight: profile.weight,
          dob: profile.dob,
          gender: profile.gender,
          preferences: safePreferences,
          knowledge_preferences: profile.knowledge_preferences || [],
          knowledge_health: profile.knowledge_health || [],
          knowledge_notes: profile.knowledge_notes || [],
          knowledge_patterns: profile.knowledge_patterns || [],
          tracking_tags: profile.tracking_tags || [],
          daily_calories_goal: profile.daily_calories_goal,
          weight_goal: profile.weight_goal,
          protein_goal: profile.protein_goal,
          tracked_nutrients: profile.tracked_nutrients || [],
          agent_config: profile.agent_config || {},
          agent_memory: profile.agent_memory || [],
          telegram_reminders_enabled: profile.telegram_reminders_enabled ?? false,
          telegram_reminder_times: profile.telegram_reminder_times || [],
          telegram_reports_enabled: profile.telegram_reports_enabled ?? false,
          timezone: profile.timezone,
        };
        return new Response(JSON.stringify({ profile: safeProfile }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (method === "POST") {
        const body = await req.json();
        
        // Pick only allowed fields for updates
        const updateData: Record<string, any> = {};
        if (body.display_name !== undefined) updateData.display_name = body.display_name;
        if (body.height !== undefined) updateData.height = body.height;
        if (body.weight !== undefined) updateData.weight = body.weight;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.gender !== undefined) updateData.gender = body.gender;
        if (body.daily_calories_goal !== undefined) updateData.daily_calories_goal = body.daily_calories_goal;
        if (body.weight_goal !== undefined) updateData.weight_goal = body.weight_goal;
        if (body.protein_goal !== undefined) updateData.protein_goal = body.protein_goal;
        if (body.preferences !== undefined) updateData.preferences = body.preferences;
        if (body.telegram_reminders_enabled !== undefined) updateData.telegram_reminders_enabled = body.telegram_reminders_enabled;
        if (body.telegram_reports_enabled !== undefined) updateData.telegram_reports_enabled = body.telegram_reports_enabled;
        if (body.telegram_reminder_times !== undefined) updateData.telegram_reminder_times = body.telegram_reminder_times;
        if (body.timezone !== undefined) updateData.timezone = body.timezone;
        
        // Helper to format incoming value as a string array
        const toArray = (incoming: any): string[] => {
          if (!incoming) return [];
          return Array.isArray(incoming) ? incoming.map(String) : [String(incoming)];
        };

        // Server-side merge: incoming items are merged with existing values,
        // deduplicated (case-insensitive), and capped at 15 to prevent data
        // loss when the GPT sends a partial list.
        const mergeArray = (existing: string[], incoming: string[]): string[] => {
          const seen = new Set<string>();
          const merged: string[] = [];
          for (const item of [...existing, ...incoming]) {
            const key = item.trim().toLowerCase();
            if (key && !seen.has(key)) {
              seen.add(key);
              merged.push(item.trim());
            }
          }
          return merged.slice(0, 15);
        };

        const incomingPrefs = body.knowledge_preferences ?? body.knowledge?.preferences;
        if (incomingPrefs !== undefined) {
          updateData.knowledge_preferences = mergeArray(
            profile.knowledge_preferences || [], toArray(incomingPrefs)
          );
        }

        const incomingHealth = body.knowledge_health ?? body.knowledge?.health;
        if (incomingHealth !== undefined) {
          updateData.knowledge_health = mergeArray(
            profile.knowledge_health || [], toArray(incomingHealth)
          );
        }

        const incomingNotes = body.knowledge_notes ?? body.knowledge?.notes;
        if (incomingNotes !== undefined) {
          updateData.knowledge_notes = mergeArray(
            profile.knowledge_notes || [], toArray(incomingNotes)
          );
        }

        const incomingPatterns = body.knowledge_patterns ?? body.knowledge?.patterns;
        if (incomingPatterns !== undefined) {
          updateData.knowledge_patterns = mergeArray(
            profile.knowledge_patterns || [], toArray(incomingPatterns)
          );
        }

        if (body.agent_memory !== undefined) {
          updateData.agent_memory = mergeArray(
            profile.agent_memory || [], toArray(body.agent_memory)
          );
        }
        if (body.tracked_nutrients !== undefined) {
          updateData.tracked_nutrients = body.tracked_nutrients;
        }
        if (body.tracking_tags !== undefined) {
          updateData.tracking_tags = body.tracking_tags;
        }

        const { data: updatedProfile, error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", profile.id)
          .select("*")
          .single();

        if (updateError) {
          return new Response(JSON.stringify({ error: "Failed to update profile", details: updateError }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ message: "Profile updated successfully", profile: updatedProfile }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- LOGOUT ENDPOINT ---
    if (path.endsWith("/logout") && method === "POST") {
      const newKey = "fit_" + crypto.randomUUID().replace(/-/g, "");
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ api_key: newKey })
        .eq("id", profile.id);

      if (updateErr) {
        return new Response(JSON.stringify({ error: "Failed to log out", details: updateErr }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "Logged out successfully. Connection revoked." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- DAILY WELLNESS ENDPOINTS ---
    if (path.endsWith("/daily-wellness")) {
      if (method === "GET") {
        const queryDate = url.searchParams.get("date");
        const startDate = url.searchParams.get("start_date");
        const endDate = url.searchParams.get("end_date");
        const limitParam = url.searchParams.get("limit") || url.searchParams.get("days");

        // Multi-day or date-range query
        if (startDate || endDate || limitParam || !queryDate) {
          let dbQuery = supabase
            .from("daily_wellness")
            .select("*")
            .eq("profile_id", profile.id);

          if (startDate) dbQuery = dbQuery.gte("date", startDate);
          if (endDate) dbQuery = dbQuery.lte("date", endDate);

          const maxLimit = Math.min(parseInt(limitParam || "90"), 365);
          if (!startDate && !endDate && limitParam) {
            dbQuery = dbQuery.order("date", { ascending: false }).limit(maxLimit);
          } else {
            dbQuery = dbQuery.order("date", { ascending: true }).limit(maxLimit);
          }

          const { data: records, error: fetchError } = await dbQuery;

          if (fetchError) {
            return new Response(JSON.stringify({ error: "Failed to retrieve daily wellness logs", details: fetchError }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({
            wellness_logs: records || [],
            count: records ? records.length : 0,
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Single date query fallback
        const { data: record, error: fetchError } = await supabase
          .from("daily_wellness")
          .select("*")
          .eq("profile_id", profile.id)
          .eq("date", queryDate)
          .maybeSingle();

        if (fetchError) {
          return new Response(JSON.stringify({ error: "Failed to retrieve daily wellness notes", details: fetchError }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          date: queryDate,
          notes: record ? record.notes : "",
          water_intake: record ? record.water_intake : 0,
          active_calories_burned: record ? record.active_calories_burned || 0 : 0,
          steps: record ? record.steps || 0 : 0,
          health_sync_last_synced_at: record ? record.health_sync_last_synced_at || null : null,
          stool_type: record ? record.stool_type : null,
          stool_size: record ? record.stool_size : null,
          energy_level: record ? record.energy_level : null,
          bloating_level: record ? record.bloating_level : null,
          water_log_time: record ? record.water_log_time : null,
          stool_log_time: record ? record.stool_log_time : null,
          energy_log_time: record ? record.energy_log_time : null,
          bloating_log_time: record ? record.bloating_log_time : null,
          bloating_logs: record ? record.bloating_logs : [],
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (method === "POST" || method === "PATCH") {
        const body = await req.json();
        const targetDate = body.date || getLocalTimeAndDate().dateStr;

        const { data: existing } = await supabase
          .from("daily_wellness")
          .select("id, water_intake, water_logs, bloating_logs")
          .eq("profile_id", profile.id)
          .eq("date", targetDate)
          .maybeSingle();

        // Only touch fields the caller actually sent — omitted fields keep their
        // stored values (previously an omitted `notes` wiped the day's notes).
        const fields: Record<string, unknown> = {};
        if (body.notes !== undefined) fields.notes = body.notes;
        if (body.active_calories_burned !== undefined) fields.active_calories_burned = parseInt(body.active_calories_burned) || 0;
        if (body.steps !== undefined) fields.steps = parseInt(body.steps) || 0;
        if (body.health_sync_last_synced_at !== undefined) fields.health_sync_last_synced_at = body.health_sync_last_synced_at;
        if (body.water_add !== undefined) {
          const addAmount = parseInt(body.water_add) || 0;
          const currentWater = (existing && existing.water_intake) || 0;
          const newTotal = Math.max(0, currentWater + addAmount);
          fields.water_intake = newTotal;
          const waterTime = body.water_log_time || getLocalTimeAndDate().timeStr;
          fields.water_log_time = waterTime;
          const existingWaterLogs = Array.isArray(existing?.water_logs) ? existing.water_logs : [];
          fields.water_logs = [...existingWaterLogs, { id: crypto.randomUUID(), amount: addAmount, time: waterTime }];
        } else if (body.water_intake !== undefined) {
          const intakeVal = parseInt(body.water_intake) || 0;
          fields.water_intake = intakeVal;
          if (body.water_log_time !== undefined) fields.water_log_time = body.water_log_time;
        }
        if (body.stool_type !== undefined) fields.stool_type = body.stool_type === null ? null : parseInt(body.stool_type);
        if (body.stool_size !== undefined) fields.stool_size = body.stool_size;
        if (body.energy_level !== undefined) fields.energy_level = body.energy_level === null ? null : parseInt(body.energy_level);
        if (body.bloating_level !== undefined) {
          const bloatVal = body.bloating_level === null ? null : parseInt(body.bloating_level);
          fields.bloating_level = bloatVal;
          const bloatTime = body.bloating_log_time || getLocalTimeAndDate().timeStr;
          fields.bloating_log_time = bloatVal !== null ? bloatTime : null;
          const existingLogs = Array.isArray(existing?.bloating_logs) ? existing.bloating_logs : [];
          if (bloatVal === null) {
            fields.bloating_logs = [];
          } else {
            fields.bloating_logs = [...existingLogs, { id: crypto.randomUUID(), level: bloatVal, time: bloatTime }];
          }
        }
        if (body.water_log_time !== undefined && body.water_add === undefined && body.water_intake === undefined) fields.water_log_time = body.water_log_time;
        if (body.stool_log_time !== undefined) fields.stool_log_time = body.stool_log_time;
        if (body.energy_log_time !== undefined) fields.energy_log_time = body.energy_log_time;
        if (body.bloating_log_time !== undefined && body.bloating_level === undefined) fields.bloating_log_time = body.bloating_log_time;

        if (Object.keys(fields).length === 0) {
          return new Response(JSON.stringify({ error: "No valid fields provided. Allowed: notes, active_calories_burned, steps, water_intake, water_add, stool_type, stool_size, energy_level, bloating_level, water_log_time, stool_log_time, energy_log_time, bloating_log_time" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let record: any = null;
        let saveError: any = null;
        if (existing) {
          ({ data: record, error: saveError } = await supabase
            .from("daily_wellness")
            .update(fields)
            .eq("id", existing.id)
            .select("*")
            .single());
        } else {
          ({ data: record, error: saveError } = await supabase
            .from("daily_wellness")
            .insert({ profile_id: profile.id, date: targetDate, notes: "", ...fields })
            .select("*")
            .single());
        }

        if (saveError) {
          return new Response(JSON.stringify({ error: "Failed to save daily wellness data", details: saveError }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ message: "Daily wellness data saved successfully", record }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- WEIGHT ENDPOINTS ---
    if (path.endsWith("/weight")) {
      if (method === "GET") {
        const { data: logs, error: fetchError } = await supabase
          .from("weight_logs")
          .select("*")
          .eq("profile_id", profile.id)
          .order("date", { ascending: true });

        if (fetchError) {
          return new Response(JSON.stringify({ error: "Failed to retrieve weight logs", details: fetchError }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ weight_logs: logs || [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (method === "POST" || method === "PATCH") {
        const body = await req.json();
        const targetDate = body.date || getLocalTimeAndDate().dateStr;
        const weightVal = parseFloat(body.weight);

        if (isNaN(weightVal) || weightVal <= 0) {
          return new Response(JSON.stringify({ error: "Valid weight value is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 1. Upsert weight log
        const { data: record, error: upsertError } = await supabase
          .from("weight_logs")
          .upsert(
            {
              profile_id: profile.id,
              date: targetDate,
              weight: weightVal,
              ...(body.log_time !== undefined ? { log_time: body.log_time } : {}),
            },
            { onConflict: "profile_id,date" }
          )
          .select("*")
          .single();

        if (upsertError) {
          return new Response(JSON.stringify({ error: "Failed to save weight log", details: upsertError }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 2. Auto-update current weight in profiles if this is the most recent log (by date)
        const { data: latestLog } = await supabase
          .from("weight_logs")
          .select("weight,date")
          .eq("profile_id", profile.id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestLog && latestLog.date === targetDate) {
          await supabase
            .from("profiles")
            .update({ weight: weightVal })
            .eq("id", profile.id);
        }

        return new Response(JSON.stringify({ message: "Weight log saved successfully", record }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- MEALS ENDPOINTS ---
    if (path.endsWith("/meals")) {
      if (method === "GET") {
        const queryDate = url.searchParams.get("date");
        const limitParam = url.searchParams.get("limit");

        let dbQuery = supabase
          .from("meals")
          .select("*")
          .eq("profile_id", profile.id);

        if (queryDate) {
          dbQuery = dbQuery.eq("date", queryDate).order("created_at", { ascending: false });
        } else if (limitParam) {
          dbQuery = dbQuery.order("date", { ascending: false }).order("created_at", { ascending: false }).limit(parseInt(limitParam) || 20);
        } else {
          dbQuery = dbQuery.eq("date", getLocalTimeAndDate().dateStr).order("created_at", { ascending: false });
        }

        const { data: meals, error: mealsError } = await dbQuery;

        if (mealsError) {
          return new Response(JSON.stringify({ error: "Failed to retrieve meals" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const targetDate = queryDate || (!limitParam ? getLocalTimeAndDate().dateStr : null);
        const remaining = targetDate ? await getDailyRemaining(profile.id, targetDate) : null;
        const tagHits = targetDate ? await getDailyTagHits(profile.id, targetDate) : null;

        return new Response(
          JSON.stringify({
            date: targetDate,
            meals,
            ...(remaining ? { daily_remaining: remaining } : {}),
            ...(tagHits ? { daily_tag_hits: tagHits } : {}),
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else if (method === "POST") {
        const body = await req.json();
        
        if (!body.name || !body.calories) {
          return new Response(JSON.stringify({ error: "Name and calories are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // --- Image Resolution ---
        let imageUrlToDownload = null;

        // 1. Check if an image was uploaded via ChatGPT Actions file references (openaiFileIdRefs)
        if (body.openaiFileIdRefs && Array.isArray(body.openaiFileIdRefs) && body.openaiFileIdRefs.length > 0) {
          const imageRef = body.openaiFileIdRefs.find((file: any) => 
            file.mime_type?.startsWith("image/") || 
            file.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
          );
          if (imageRef && imageRef.download_link) {
            imageUrlToDownload = imageRef.download_link;
            console.log(`[image] Found uploaded image via openaiFileIdRefs: ${imageUrlToDownload}`);
          }
        }

        // 2. Fall back to body.image if no file reference was provided
        if (!imageUrlToDownload && body.image) {
          imageUrlToDownload = body.image;
          // Skip any ChatGPT-hosted private file URLs passed as strings
          if (
            imageUrlToDownload.includes("oaiusercontent.com") ||
            imageUrlToDownload.includes("openai.com/files") ||
            imageUrlToDownload.includes("files.oai")
          ) {
            console.log(`[image] Skipping private ChatGPT file URL: ${imageUrlToDownload}`);
            imageUrlToDownload = null;
          }
        }

        // Check if the user has requested AI Photo refinement
        const config = profile.agent_config || {};
        const refineFoodPics = config.refinePhotos ?? false;
        const disableEmptyImages = !(config.generateImages ?? true);

        // Resolve preferred style prompt prefix
        const styleKey = config.artStyle || "gourmet";
        
        let stylePrompt = "gourmet,professional,food,styling,photography";
        if (styleKey === "anime") {
          stylePrompt = "anime style,studio ghibli,detailed,hand-drawn food illustration";
        } else if (styleKey === "south_indian") {
          stylePrompt = "traditional south indian home-style food styling,organic,warm lighting";
        } else if (styleKey === "restaurant") {
          stylePrompt = "vibrant professional restaurant plating,gourmet food presentation,cinematic lighting";
        } else if (styleKey === "dubai") {
          stylePrompt = "dubai luxury fine dining,gold leaf garnish,opulent presentation,professional studio lighting";
        } else if (styleKey === "custom") {
          const customVal = config.customArtStyle || "";
          if (customVal.trim()) {
            stylePrompt = customVal.trim().replace(/[^a-z0-9, ]/gi, " ");
          }
        }

        const searchQuery = encodeURIComponent(
          body.name.trim().replace(/[^a-z0-9 ]/gi, " ").trim()
        );

        if (imageUrlToDownload && refineFoodPics) {
          // Override real photo with refined AI styled version
          imageUrlToDownload = `https://image.pollinations.ai/p/${stylePrompt},of,${searchQuery}?width=600&height=400&nologo=true`;
          console.log(`[image-refinement] Overriding uploaded photo with AI style [${styleKey}]: ${imageUrlToDownload}`);
        } else if (!imageUrlToDownload && !disableEmptyImages) {
          if (refineFoodPics) {
            // Generate styled fallback for empty logs
            imageUrlToDownload = `https://image.pollinations.ai/p/${stylePrompt},of,${searchQuery}?width=600&height=400&nologo=true`;
            console.log(`[image-refinement] Generating styled AI fallback [${styleKey}] for text log: ${imageUrlToDownload}`);
          } else {
            const cleanName = body.name.trim();
            let southIndianContext = "";
            const lowerName = cleanName.toLowerCase();
            if (lowerName.includes("dosa") || lowerName.includes("idli") || lowerName.includes("sambar") || lowerName.includes("chutney") || lowerName.includes("vada") || lowerName.includes("uttapam")) {
              southIndianContext = " Plated on a traditional green banana leaf, accompanied by small individual metal bowls of sambar and coconut/peanut chutney.";
            }
            const prompt = `gourmet professional food photography of ${cleanName}.${southIndianContext} Crisp food separation with distinct ingredients clearly visible and neatly arranged. High detail textures, photorealistic, macro culinary shot, top-down view, clean bright studio lighting, sharp focus, volumetric depth, no blending or bleeding between food elements.`;
            
            // Extract Gemini API key from preferences array
            const geminiKeyTag = (profile.preferences || []).find((p: string) => p.startsWith("gemini_api_key:")) || "";
            const geminiKey = geminiKeyTag.split(":")[1] || "";
            
            let generatedImage = "";
            if (geminiKey) {
              try {
                // Set a 6-second timeout for the Gemini request
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);
                
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`;
                const response = await fetch(geminiUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  signal: controller.signal,
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseModalities: ["IMAGE"] }
                  })
                });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                  const data = await response.json();
                  const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
                  if (imagePart?.inlineData?.data) {
                    generatedImage = `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`;
                    console.log(`[image-refinement] Successfully generated image using Gemini 2.5 Flash Image`);
                  }
                } else {
                  console.warn(`[image-refinement] Gemini API returned error: ${response.status}`);
                }
              } catch (err) {
                console.warn("[image-refinement] Failed to generate with Gemini, falling back to Pollinations.ai:", err);
              }
            }
            
            if (!generatedImage) {
              const seed = Math.floor(Math.random() * 1000000);
              generatedImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=600&nologo=true&seed=${seed}&model=flux`;
              console.log(`[image-refinement] Resolved Pollinations.ai backup image fallback: ${generatedImage}`);
            }
            
            imageUrlToDownload = generatedImage;
          }
        }

        // Resolve time using user-supplied value, body.timezone, or timezoneOffset header
        let resolvedTime = body.time;
        if (!resolvedTime) {
          if (body.timezone) {
            try {
              resolvedTime = new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: body.timezone,
              });
            } catch (e) {
              console.error(`Invalid timezone provided: ${body.timezone}`, e);
            }
          }
          if (!resolvedTime) {
            resolvedTime = getLocalTimeAndDate().timeStr;
          }
        }

        // Resolve date using user-supplied value, body.timezone, or timezoneOffset header
        let resolvedDate = body.date;
        if (!resolvedDate) {
          if (body.timezone) {
            try {
              resolvedDate = new Date().toLocaleDateString("en-CA", { timeZone: body.timezone }); // YYYY-MM-DD
            } catch (e) {
              console.error(`Invalid timezone provided: ${body.timezone}`, e);
            }
          }
          if (!resolvedDate) {
            resolvedDate = getLocalTimeAndDate().dateStr;
          }
        }

        // Nutrients live in a jsonb map (dynamic-nutrients model); protein and
        // calories stay first-class columns. Flat carbs/fats/fiber fields are
        // still accepted for backward compatibility with older GPT configs.
        const nutrients: Record<string, number> = {};
        if (body.nutrients && typeof body.nutrients === "object") {
          for (const [key, value] of Object.entries(body.nutrients)) {
            const num = Number(value);
            if (!isNaN(num)) nutrients[key] = num;
          }
        }
        if (body.carbs !== undefined) nutrients.carbs = parseInt(body.carbs) || 0;
        if (body.fats !== undefined) nutrients.fats = parseInt(body.fats) || 0;
        if (body.fiber !== undefined) nutrients.fiber = parseInt(body.fiber) || 0;
        const proteinValue = body.protein !== undefined
          ? parseInt(body.protein) || 0
          : Number(nutrients.protein) || 0;
        delete nutrients.protein;

        // Safeguard: Ensure EVERY custom nutrient enabled in profile.tracked_nutrients is populated
        const userTrackedList = Array.isArray(profile.tracked_nutrients) ? profile.tracked_nutrients : [];
        const totalCals = parseInt(body.calories) || 500;
        for (const item of userTrackedList) {
          if (!item || !item.enabled || item.id === "protein") continue;
          const id = item.id;
          if (nutrients[id] === undefined || nutrients[id] === null) {
            const lowerId = id.toLowerCase();
            if (lowerId === "carbs") nutrients[id] = Math.round(totalCals * 0.12);
            else if (lowerId === "fats") nutrients[id] = Math.round(totalCals * 0.03);
            else if (lowerId === "fiber") nutrients[id] = Math.max(1, Math.round(totalCals * 0.01));
            else if (lowerId === "iron") nutrients[id] = Math.max(1, Math.round(totalCals * 0.005 * 10) / 10);
            else if (lowerId === "zinc") nutrients[id] = Math.max(1, Math.round(totalCals * 0.004 * 10) / 10);
            else if (lowerId === "selenium") nutrients[id] = Math.max(5, Math.round(totalCals * 0.08));
            else if (lowerId === "sodium") nutrients[id] = Math.round(totalCals * 1.5);
            else if (lowerId === "caffeine") nutrients[id] = 0;
            else if (lowerId === "calcium") nutrients[id] = Math.round(totalCals * 0.4);
            else if (lowerId === "potassium") nutrients[id] = Math.round(totalCals * 0.8);
            else nutrients[id] = Math.round((item.target ? item.target * 0.25 : 5) * 10) / 10;
          }
        }

        let resolvedDesc = body.meal_description ? String(body.meal_description).trim() : null;
        if (resolvedDesc) {
          resolvedDesc = resolvedDesc
            .replace(/^Estimated (nutrients|macros|values) based on [^.:]*[.!]?\s*/i, "")
            .replace(/^Standard (portion|serving) of [^.:]*[.!]?\s*/i, "")
            .trim();
        }

        const mealData = {
          profile_id: profile.id,
          name: body.name,
          time: resolvedTime,
          type: body.type || "Meal",
          calories: parseInt(body.calories),
          protein: proteinValue,
          nutrients,
          tags: Array.isArray(body.tags) ? body.tags : [],
          image: imageUrlToDownload, // Use external URL as initial placeholder
          meal_description: resolvedDesc || null,
          date: resolvedDate
        };

        const { data: newMeal, error: insertError } = await supabase
          .from("meals")
          .insert(mealData)
          .select("*")
          .single();

        if (insertError) {
          return new Response(JSON.stringify({ error: "Failed to log meal", details: insertError }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // --- Asynchronous Background Worker ---
        // Fire-and-forget: we do NOT await this promise, allowing the function
        // to return a response to ChatGPT immediately (within 100ms)
        (async () => {
          try {
            let finalImageUrl = imageUrlToDownload;

            // 1. Download & upload image to Supabase Storage in the background.
            // The "meal-images" bucket is provisioned once (Supabase dashboard /
            // migration), not created per-request.
            if (imageUrlToDownload && imageUrlToDownload.startsWith("http")) {
              try {
                const response = await fetch(imageUrlToDownload);
                if (response.ok) {
                  const contentType = response.headers.get("content-type") || "image/jpeg";
                  const blob = await response.blob();
                  const fileExtension = contentType.split("/")[1]?.split(";")[0] || "jpg";
                  const filename = `${profile.id}/${Date.now()}.${fileExtension}`;

                  const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("meal-images")
                    .upload(filename, blob, { contentType, upsert: true });

                  if (!uploadError) {
                    const { data: urlData } = supabase.storage
                      .from("meal-images")
                      .getPublicUrl(filename);
                    finalImageUrl = urlData.publicUrl;
                    
                    // Update database row with permanent storage URL
                    await supabase
                      .from("meals")
                      .update({ image: finalImageUrl })
                      .eq("id", newMeal.id);
                    console.log(`[bg-processing] Saved image to Supabase Storage & updated database: ${finalImageUrl}`);
                  } else {
                    console.error("[bg-processing] Supabase storage upload error:", uploadError);
                  }
                }
              } catch (err) {
                console.error("[bg-processing] Failed to download/upload external image:", err);
              }
            }

            // 2. Notion Sync
            if (profile.notion_api_key && profile.notion_database_id) {
              try {
                console.log(`[bg-processing] Syncing meal "${newMeal.name}" to Notion Database...`);
                const notionRes = await fetch("https://api.notion.com/v1/pages", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${profile.notion_api_key}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    parent: { database_id: profile.notion_database_id },
                    properties: {
                      "Name": { title: [{ text: { content: newMeal.name } }] },
                      "Calories": { number: newMeal.calories },
                      "Protein (g)": { number: newMeal.protein },
                      "Carbs (g)": { number: newMeal.nutrients?.carbs ?? 0 },
                      "Fats (g)": { number: newMeal.nutrients?.fats ?? 0 },
                      "Date": { date: { start: newMeal.date } },
                      "Time": { rich_text: [{ text: { content: newMeal.time } }] }
                    }
                  })
                });
                if (!notionRes.ok) {
                  const errTxt = await notionRes.text();
                  console.error(`[bg-processing] Notion Sync error: ${errTxt}`);
                } else {
                  console.log("[bg-processing] Notion Sync completed successfully.");
                }
              } catch (notionErr) {
                console.error("[bg-processing] Exception during Notion sync: ", notionErr);
              }
            }

            // 3. Google Sheets Webhook Sync
            if (profile.google_sheets_webhook_url) {
              try {
                console.log(`[bg-processing] Syncing meal "${newMeal.name}" to Google Sheets Webhook...`);
                await fetch(profile.google_sheets_webhook_url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    username: profile.username,
                    display_name: profile.display_name,
                    ...newMeal,
                    image: finalImageUrl // Pass the updated URL if successfully uploaded
                  })
                });
                console.log("[bg-processing] Google Sheets Sync completed successfully.");
              } catch (sheetsErr) {
                console.error("[bg-processing] Exception during Google Sheets sync: ", sheetsErr);
              }
            }
          } catch (err) {
            console.error("[bg-processing] Background execution error:", err);
          }
        })();

        const remaining = await getDailyRemaining(profile.id, resolvedDate);
        const tagHits = await getDailyTagHits(profile.id, resolvedDate);
        const shareUrl = await createMealShareUrl(newMeal, profile.id);
        return new Response(JSON.stringify({
          message: "Meal logged successfully",
          meal: newMeal,
          share_url: shareUrl,
          daily_remaining: remaining,
          daily_tag_hits: tagHits
        }), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (method === "DELETE") {
        const mealId = url.searchParams.get("id");
        if (!mealId) {
          return new Response(JSON.stringify({ error: "Meal ID parameter ('id') is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: deletedMeal, error: deleteError } = await supabase
          .from("meals")
          .delete()
          .eq("id", mealId)
          .eq("profile_id", profile.id)
          .select("*")
          .maybeSingle();

        if (deleteError) {
          return new Response(JSON.stringify({ error: "Failed to delete meal", details: deleteError }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!deletedMeal) {
          return new Response(JSON.stringify({ error: "Meal not found or unauthorized" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const remaining = await getDailyRemaining(profile.id, deletedMeal.date);
        const tagHits = await getDailyTagHits(profile.id, deletedMeal.date);
        return new Response(JSON.stringify({ message: "Meal deleted successfully", meal: deletedMeal, daily_remaining: remaining, daily_tag_hits: tagHits }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (method === "PATCH") {
        const mealId = url.searchParams.get("id");
        if (!mealId) {
          return new Response(JSON.stringify({ error: "Meal ID parameter ('id') is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = await req.json();

        const updateData: Record<string, any> = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.calories !== undefined) updateData.calories = parseInt(body.calories);
        if (body.protein !== undefined) updateData.protein = parseInt(body.protein);

        // Nutrient updates merge into the existing jsonb map rather than replacing it.
        const nutrientUpdates: Record<string, number> = {};
        if (body.nutrients && typeof body.nutrients === "object") {
          for (const [key, value] of Object.entries(body.nutrients)) {
            const num = Number(value);
            if (!isNaN(num)) nutrientUpdates[key] = num;
          }
        }
        if (body.carbs !== undefined) nutrientUpdates.carbs = parseInt(body.carbs);
        if (body.fats !== undefined) nutrientUpdates.fats = parseInt(body.fats);
        if (body.fiber !== undefined) nutrientUpdates.fiber = parseInt(body.fiber);
        if (nutrientUpdates.protein !== undefined) {
          if (updateData.protein === undefined) updateData.protein = nutrientUpdates.protein;
          delete nutrientUpdates.protein;
        }
        if (Object.keys(nutrientUpdates).length > 0) {
          const { data: existingNutrients } = await supabase
            .from("meals")
            .select("nutrients")
            .eq("id", mealId)
            .eq("profile_id", profile.id)
            .maybeSingle();
          updateData.nutrients = { ...(existingNutrients?.nutrients || {}), ...nutrientUpdates };
        }

        if (body.type !== undefined) updateData.type = body.type;
        if (body.time !== undefined) updateData.time = body.time;
        if (body.date !== undefined) updateData.date = body.date;
        if (body.image !== undefined) updateData.image = body.image;
        if (body.meal_description !== undefined) updateData.meal_description = body.meal_description;
        if (body.tags !== undefined) updateData.tags = Array.isArray(body.tags) ? body.tags : [];

        const { data: updatedMeal, error: updateError } = await supabase
          .from("meals")
          .update(updateData)
          .eq("id", mealId)
          .eq("profile_id", profile.id)
          .select("*")
          .maybeSingle();

        if (updateError) {
          return new Response(JSON.stringify({ error: "Failed to update meal", details: updateError }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!updatedMeal) {
          return new Response(JSON.stringify({ error: "Meal not found or unauthorized" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const targetDate = updatedMeal.date || getLocalTimeAndDate().dateStr;
        const remaining = await getDailyRemaining(profile.id, targetDate);
        const tagHits = await getDailyTagHits(profile.id, targetDate);
        const shareUrl = await createMealShareUrl(updatedMeal, profile.id);
        return new Response(JSON.stringify({
          message: "Meal updated successfully",
          meal: updatedMeal,
          share_url: shareUrl,
          daily_remaining: remaining,
          daily_tag_hits: tagHits
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- RECIPES ENDPOINTS ---
    if (path.endsWith("/recipes")) {
      if (method === "GET") {
        const { data: recipes, error: recipesError } = await supabase
          .from("recipes")
          .select("*")
          .eq("profile_id", profile.id)
          .order("name", { ascending: true });

        if (recipesError) {
          return new Response(JSON.stringify({ error: "Failed to retrieve recipes" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ recipes }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (method === "POST") {
        const body = await req.json();

        if (!body.name) {
          return new Response(JSON.stringify({ error: "Recipe name is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const recipeData = {
          profile_id: profile.id,
          name: body.name,
          time: body.time || "15 mins",
          calories: parseInt(body.calories || 0),
          protein: parseInt(body.protein || 0),
          carbs: parseInt(body.carbs || 0),
          fats: parseInt(body.fats || 0),
          fiber: parseInt(body.fiber || 0),
          description: body.description || null,
          tags: Array.isArray(body.tags) ? body.tags : [],
          image: body.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
          ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
          instructions: body.instructions || ""
        };

        const { data: newRecipe, error: insertError } = await supabase
          .from("recipes")
          .insert(recipeData)
          .select("*")
          .single();

        if (insertError) {
          return new Response(JSON.stringify({ error: "Failed to save recipe", details: insertError }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ message: "Recipe saved successfully", recipe: newRecipe }), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- TELEGRAM ENDPOINTS ---
    if (path.endsWith("/telegram/test") && method === "POST") {
      const body = await req.json();
      const botToken = body.telegram_bot_token || profile.telegram_bot_token || Deno.env.get("TELEGRAM_BOT_TOKEN");
      const chatId = body.telegram_chat_id || profile.telegram_chat_id;

      if (!botToken || !chatId) {
        return new Response(JSON.stringify({ error: "Missing bot token or chat ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🔔 *FitAI Telegram Connection Verified!*\nYour account is now linked to receive daily reports and logging reminders.`,
            parse_mode: "Markdown",
          }),
        });

        if (!tgRes.ok) {
          const errText = await tgRes.text();
          return new Response(JSON.stringify({ error: `Telegram returned an error: ${errText}` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ message: "Test message sent successfully!" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: `Failed to contact Telegram: ${String(err)}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Default route fallback
    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[gpt-action] Server Error: ", err);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
