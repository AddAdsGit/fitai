import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://twrjigbbgioqdpwvkblo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cmppZ2JiZ2lvcWRwd3ZrYmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzUzMjk0OCwiZXhwIjoyMDk5MTA4OTQ4fQ.u_0wYh-kfYn2jQd4nlIiQpd9RvKizM92cyDj6nQqyJ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function resetDatabase() {
  console.log("🔥 STARTING FULL DATABASE CLEANUP...");

  // 1. Delete all shares
  const { error: errShares } = await supabase.from('shares').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Shares delete status:", errShares ? errShares.message : "CLEARED");

  // 2. Delete all meals
  const { error: errMeals } = await supabase.from('meals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Meals delete status:", errMeals ? errMeals.message : "CLEARED");

  // 3. Delete all weight_logs
  const { error: errWeight } = await supabase.from('weight_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Weight logs delete status:", errWeight ? errWeight.message : "CLEARED");

  // 4. Delete all daily_wellness
  const { error: errWellness } = await supabase.from('daily_wellness').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Daily wellness delete status:", errWellness ? errWellness.message : "CLEARED");

  // 5. Delete all recipes
  const { error: errRecipes } = await supabase.from('recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Recipes delete status:", errRecipes ? errRecipes.message : "CLEARED");

  // 6. Delete all user_tags
  const { error: errTags } = await supabase.from('user_tags').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("User tags delete status:", errTags ? errTags.message : "CLEARED");

  // 7. Delete all profiles
  const { error: errProfiles } = await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Profiles delete status:", errProfiles ? errProfiles.message : "CLEARED");

  // 8. Delete all auth users
  const { data: userData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("Error listing users:", listErr.message);
  } else if (userData && userData.users) {
    console.log(`Found ${userData.users.length} auth users to delete...`);
    for (const u of userData.users) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.error(`Failed to delete user ${u.id}:`, delErr.message);
      } else {
        console.log(`Deleted auth user ${u.email || u.id}`);
      }
    }
  }

  console.log("🎉 FULL DATABASE RESET COMPLETE!");
}

resetDatabase().catch(console.error);
