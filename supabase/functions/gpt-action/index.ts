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

        return new Response(JSON.stringify({ date: queryDate, meals }), {
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

        // Check if the user has requested AI Photo refinement
        const refineFoodPics = profile.preferences?.includes("refine_food_pics") ?? false;
        
        let imageUrlToDownload = body.image;
        if (!imageUrlToDownload && refineFoodPics) {
          // If no custom image was provided, but refiner is active, generate a gourmet styled food photo prompt
          const searchName = encodeURIComponent(body.name.trim());
          imageUrlToDownload = `https://image.pollinations.ai/p/gourmet,professional,food,styling,photography,of,${searchName}?width=400&height=300&nologo=true`;
        }

        let finalImageUrl = imageUrlToDownload || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";

        // Download external image and save to self-hosted Supabase Storage
        if (imageUrlToDownload && imageUrlToDownload.startsWith("http")) {
          try {
            // Ensure the public bucket exists (ignore errors if already exists)
            await supabase.storage.createBucket("meal-images", {
              public: true,
              fileSizeLimit: 10485760, // 10MB
              allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"]
            });
          } catch (e) {
            // Bucket already exists or admin rights issue
          }

          try {
            // Fetch external image URL
            const response = await fetch(imageUrlToDownload);
            if (response.ok) {
              const contentType = response.headers.get("content-type") || "image/jpeg";
              const blob = await response.blob();
              
              // Generate unique file path
              const fileExtension = contentType.split("/")[1] || "jpg";
              const filename = `${profile.id}/${Date.now()}.${fileExtension}`;

              // Upload to Supabase Storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from("meal-images")
                .upload(filename, blob, {
                  contentType,
                  upsert: true
                });

              if (!uploadError) {
                // Construct public url
                const { data: urlData } = supabase.storage
                  .from("meal-images")
                  .getPublicUrl(filename);
                
                finalImageUrl = urlData.publicUrl;
              } else {
                console.error("Supabase storage upload error:", uploadError);
              }
            }
          } catch (err) {
            console.error("Failed to download external image URL:", err);
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

        const mealData = {
          profile_id: profile.id,
          name: body.name,
          time: resolvedTime,
          type: body.type || "Meal",
          calories: parseInt(body.calories),
          protein: parseInt(body.protein || 0),
          carbs: parseInt(body.carbs || 0),
          fats: parseInt(body.fats || 0),
          image: finalImageUrl,
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

        // --- Real-time Integrations Sync Trigger ---
        
        // 1. Notion Sync
        if (profile.notion_api_key && profile.notion_database_id) {
          try {
            console.log(`[sync] Syncing meal "${newMeal.name}" to Notion Database...`);
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
              console.error(`[sync] Notion Sync error: Status ${notionRes.status} - ${errTxt}`);
            } else {
              console.log("[sync] Notion Sync completed successfully.");
            }
          } catch (notionErr) {
            console.error("[sync] Exception during Notion sync: ", notionErr);
          }
        }

        // 2. Google Sheets Webhook Sync
        if (profile.google_sheets_webhook_url) {
          try {
            console.log(`[sync] Syncing meal "${newMeal.name}" to Google Sheets Webhook...`);
            const sheetsRes = await fetch(profile.google_sheets_webhook_url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: profile.username,
                display_name: profile.display_name,
                ...newMeal
              })
            });
            if (!sheetsRes.ok) {
              console.error(`[sync] Google Sheets Webhook error: Status ${sheetsRes.status}`);
            } else {
              console.log("[sync] Google Sheets Sync completed successfully.");
            }
          } catch (sheetsErr) {
            console.error("[sync] Exception during Google Sheets sync: ", sheetsErr);
          }
        }

        return new Response(JSON.stringify({ message: "Meal logged successfully", meal: newMeal }), {
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

        return new Response(JSON.stringify({ message: "Meal deleted successfully", meal: deletedMeal }), {
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
        if (body.type !== undefined) updateData.type = body.type;
        if (body.time !== undefined) updateData.time = body.time;
        if (body.date !== undefined) updateData.date = body.date;
        if (body.image !== undefined) updateData.image = body.image;

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

        return new Response(JSON.stringify({ message: "Meal updated successfully", meal: updatedMeal }), {
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
