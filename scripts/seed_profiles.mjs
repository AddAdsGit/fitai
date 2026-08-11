import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://twrjigbbgioqdpwvkblo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cmppZ2JiZ2lvcWRwd3ZrYmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzUzMjk0OCwiZXhwIjoyMDk5MTA4OTQ4fQ.u_0wYh-kfYn2jQd4nlIiQpd9RvKizM92cyDj6nQqyJ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedProfiles() {
  const { data: authData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("Error listing users:", listErr);
    return;
  }

  for (const user of authData.users) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      const baseUsername = user.email ? user.email.split('@')[0] : "user_" + user.id.slice(0, 6);
      const googleName = user.user_metadata?.full_name || baseUsername;
      const googleAvatar = user.user_metadata?.avatar_url || null;
      const newKey = "fit_" + crypto.randomUUID().replace(/-/g, "");

      const profile = {
        id: user.id,
        username: baseUsername,
        display_name: googleName,
        image_url: googleAvatar,
        height: 175,
        weight: 70,
        dob: "1998-05-15",
        gender: "Male",
        preferences: [],
        daily_calories_goal: 2000,
        weight_goal: 70.0,
        protein_goal: 150,
        api_key: newKey,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const { error: insErr } = await supabase.from('profiles').insert(profile);
      if (insErr) {
        console.error(`Failed to insert profile for ${user.email}:`, insErr.message);
      } else {
        console.log(`✅ Successfully created profile for ${user.email} (@${baseUsername})`);
      }
    } else {
      console.log(`Profile already exists for ${user.email}`);
    }
  }
}

seedProfiles().catch(console.error);
