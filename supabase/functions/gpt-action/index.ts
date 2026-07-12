import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-timezone-offset",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
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

      const redirectBase = Deno.env.get("FRONTEND_URL") || "http://localhost:3000";
      const consentUrl = `${redirectBase}/?page=oauth-consent&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

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
      let code = "";
      let clientId = "";
      let redirectUri = "";

      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await req.formData();
        code = formData.get("code")?.toString() || "";
        clientId = formData.get("client_id")?.toString() || "";
        redirectUri = formData.get("redirect_uri")?.toString() || "";
      } else {
        try {
          const body = await req.json();
          code = body.code || "";
          clientId = body.client_id || "";
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

      const { data: oauthRecord, error: fetchError } = await supabase
        .from("oauth_codes")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (fetchError || !oauthRecord) {
        return new Response(JSON.stringify({ error: "Invalid or expired authorization code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(oauthRecord.expires_at).getTime() < Date.now()) {
        await supabase.from("oauth_codes").delete().eq("id", oauthRecord.id);
        return new Response(JSON.stringify({ error: "Authorization code has expired" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("oauth_codes").delete().eq("id", oauthRecord.id);

      const { data: userProfile, error: profileErr } = await supabase
        .from("profiles")
        .select("api_key")
        .eq("id", oauthRecord.profile_id)
        .single();

      if (profileErr || !userProfile) {
        return new Response(JSON.stringify({ error: "User profile not found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        access_token: userProfile.api_key,
        token_type: "Bearer",
        expires_in: 31536000, // 1 year cache for ChatGPT
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // D. GET or POST /telegram/cron (Bypass standard user authentication)
    if (path.endsWith("/telegram/cron")) {
      const cronSecret = Deno.env.get("CRON_SECRET") || "fitai_cron_secret_2026";
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
        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || prof.telegram_bot_token;
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
                let totalC = 0;
                let totalF = 0;
                meals.forEach((m) => {
                  totalCals += m.calories || 0;
                  totalP += m.protein || 0;
                  totalC += m.carbs || 0;
                  totalF += m.fats || 0;
                });

                let msg = `📊 *Daily Nutrition Report (${localDateStr})*\n\n`;
                msg += `👤 *User:* ${prof.display_name}\n\n`;
                msg += `🔥 *Calories:* ${totalCals} / ${prof.daily_calories_goal} kcal\n`;
                msg += `🥩 *Protein:* ${totalP} / ${prof.protein_goal}g\n`;
                msg += `🍞 *Carbs:* ${totalC} / ${prof.carbs_goal}g\n`;
                msg += `🥑 *Fats:* ${totalF} / ${prof.fats_goal}g\n\n`;

                if (meals.length === 0) {
                  msg += `⚠️ You logged no meals today. Don't forget to track your nutrition!`;
                } else {
                  msg += `🍽️ *Meals logged:* \n`;
                  meals.forEach((m) => {
                    msg += `- *${m.name}* (${m.calories} kcal, P:${m.protein}g C:${m.carbs}g F:${m.fats}g)\n`;
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

    // Parse timezone offset header (in minutes, e.g. -330 for IST +5:30)
    const timezoneOffsetHeader = req.headers.get("x-timezone-offset");
    let timezoneOffset = 0;
    if (timezoneOffsetHeader) {
      const parsed = parseInt(timezoneOffsetHeader);
      if (!isNaN(parsed)) {
        timezoneOffset = parsed;
      }
    }

    const getLocalTimeAndDate = () => {
      const localTimeMs = Date.now() - (timezoneOffset * 60 * 1000);
      const d = new Date(localTimeMs);
      const dateStr = d.toISOString().split("T")[0];
      const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      return { dateStr, timeStr };
    };

    const getDailyRemaining = async (profileId: string, dateStr: string) => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("daily_calories_goal, protein_goal, carbs_goal, fats_goal, fiber_goal")
        .eq("id", profileId)
        .single();

      if (!prof) return null;

      const { data: meals } = await supabase
        .from("meals")
        .select("calories, protein, carbs, fats, fiber")
        .eq("profile_id", profileId)
        .eq("date", dateStr);

      const totals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0
      };

      if (meals) {
        meals.forEach((m: any) => {
          totals.calories += m.calories || 0;
          totals.protein += m.protein || 0;
          totals.carbs += m.carbs || 0;
          totals.fats += m.fats || 0;
          totals.fiber += m.fiber || 0;
        });
      }

      return {
        calories: Math.max(0, (prof.daily_calories_goal || 2000) - totals.calories),
        protein: Math.max(0, (prof.protein_goal || 150) - totals.protein),
        carbs: Math.max(0, (prof.carbs_goal || 150) - totals.carbs),
        fats: Math.max(0, (prof.fats_goal || 60) - totals.fats),
        fiber: Math.max(0, (prof.fiber_goal || 30) - totals.fiber)
      };
    };

    console.log(`[gpt-action] Request: ${method} ${path} for user: ${profile.username} (timezoneOffset: ${timezoneOffset})`);

    // 4. API Router
    
    // --- PROFILE ENDPOINTS ---
    if (path.endsWith("/profile")) {
      if (method === "GET") {
        return new Response(JSON.stringify({ profile }), {
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
        if (body.gender !== undefined) updateData.gender = body.gender;
        if (body.daily_calories_goal !== undefined) updateData.daily_calories_goal = body.daily_calories_goal;
        if (body.weight_goal !== undefined) updateData.weight_goal = body.weight_goal;
        if (body.preferences !== undefined) updateData.preferences = body.preferences;
        
        // Smart Memory appending helper
        if (body.memories !== undefined) {
          const currentMemories = profile.memories || [];
          const newMemories = Array.isArray(body.memories) ? body.memories : [body.memories];
          // Filter duplicates
          const mergedMemories = Array.from(new Set([...currentMemories, ...newMemories]));
          updateData.memories = mergedMemories;
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

    // --- DAILY WELLNESS ENDPOINTS ---
    if (path.endsWith("/daily-wellness")) {
      if (method === "GET") {
        const queryDate = url.searchParams.get("date") || getLocalTimeAndDate().dateStr;
        
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

        return new Response(JSON.stringify({ date: queryDate, notes: record ? record.notes : "" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (method === "POST" || method === "PATCH") {
        const body = await req.json();
        const targetDate = body.date || getLocalTimeAndDate().dateStr;
        const notesContent = body.notes || "";

        const { data: record, error: upsertError } = await supabase
          .from("daily_wellness")
          .upsert(
            {
              profile_id: profile.id,
              date: targetDate,
              notes: notesContent,
            },
            { onConflict: "profile_id,date" }
          )
          .select("*")
          .single();

        if (upsertError) {
          return new Response(JSON.stringify({ error: "Failed to save daily wellness notes", details: upsertError }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ message: "Daily wellness notes saved successfully", record }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- MEALS ENDPOINTS ---
    if (path.endsWith("/meals")) {
      if (method === "GET") {
        const queryDate = url.searchParams.get("date") || getLocalTimeAndDate().dateStr;
        const { data: meals, error: mealsError } = await supabase
          .from("meals")
          .select("*")
          .eq("profile_id", profile.id)
          .eq("date", queryDate)
          .order("created_at", { ascending: false });

        if (mealsError) {
          return new Response(JSON.stringify({ error: "Failed to retrieve meals" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const remaining = await getDailyRemaining(profile.id, queryDate);
        return new Response(JSON.stringify({ date: queryDate, meals, daily_remaining: remaining }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
        const refineFoodPics = profile.preferences?.includes("refine_food_pics") ?? false;
        const disableEmptyImages = profile.preferences?.includes("disable_empty_images") ?? false;

        // Resolve preferred style prompt prefix
        const styleTag = profile.preferences?.find((p: string) => p.startsWith("food_pic_style:")) || "food_pic_style:gourmet";
        const styleKey = styleTag.split(":")[1] || "gourmet";
        
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
          const customTag = profile.preferences?.find((p: string) => p.startsWith("food_pic_custom_style:")) || "food_pic_custom_style:";
          const customVal = customTag.split(":")[1] || "";
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
            const seed = Math.floor(Math.random() * 1000000);
            imageUrlToDownload = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=600&nologo=true&seed=${seed}&model=flux`;
            console.log(`[image-refinement] Resolved image fallback: ${imageUrlToDownload}`);
          }
        }

        let finalImageUrl = imageUrlToDownload;

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

        const mealData = {
          profile_id: profile.id,
          name: body.name,
          time: resolvedTime,
          type: body.type || "Meal",
          calories: parseInt(body.calories),
          protein: parseInt(body.protein || 0),
          carbs: parseInt(body.carbs || 0),
          fats: parseInt(body.fats || 0),
          fiber: parseInt(body.fiber || 0),
          image: imageUrlToDownload, // Use external URL as initial placeholder
          meal_description: body.meal_description || null,
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

            // 1. Download & upload image to Supabase Storage in the background
            if (imageUrlToDownload && imageUrlToDownload.startsWith("http")) {
              try {
                // Ensure the public bucket exists (ignore errors if already exists)
                await supabase.storage.createBucket("meal-images", {
                  public: true,
                  fileSizeLimit: 10485760, // 10MB
                  allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"]
                });
              } catch (_) {
                // Bucket already exists
              }

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
                      "Carbs (g)": { number: newMeal.carbs },
                      "Fats (g)": { number: newMeal.fats },
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
        return new Response(JSON.stringify({ message: "Meal logged successfully", meal: newMeal, daily_remaining: remaining }), {
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
        return new Response(JSON.stringify({ message: "Meal deleted successfully", meal: deletedMeal, daily_remaining: remaining }), {
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
        if (body.carbs !== undefined) updateData.carbs = parseInt(body.carbs);
        if (body.fats !== undefined) updateData.fats = parseInt(body.fats);
        if (body.fiber !== undefined) updateData.fiber = parseInt(body.fiber);
        if (body.type !== undefined) updateData.type = body.type;
        if (body.time !== undefined) updateData.time = body.time;
        if (body.date !== undefined) updateData.date = body.date;
        if (body.image !== undefined) updateData.image = body.image;
        if (body.meal_description !== undefined) updateData.meal_description = body.meal_description;

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
        return new Response(JSON.stringify({ message: "Meal updated successfully", meal: updatedMeal, daily_remaining: remaining }), {
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
          tags: Array.isArray(body.tags) ? body.tags : [],
          image: body.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
          ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
          instructions: body.instructions || "",
          micros: body.micros || []
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
      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || body.telegram_bot_token || profile.telegram_bot_token;
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
