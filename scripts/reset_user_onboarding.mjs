import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://twrjigbbgioqdpwvkblo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cmppZ2JiZ2lvcWRwd3ZrYmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzUzMjk0OCwiZXhwIjoyMDk5MTA4OTQ4fQ.u_0wYh-kfYn2jQd4nlIiQpd9RvKizM92cyDj6nQqyJ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function resetAllUsersOnboarding() {
  const { data: usersData, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) {
    console.error("Error listing users:", userErr);
    return;
  }

  for (const user of usersData.users) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      const updatedPrefs = (profile.preferences || []).filter((p) => p !== "onboarded");
      await supabase
        .from('profiles')
        .update({ preferences: updatedPrefs })
        .eq('id', user.id);

      console.log(`✅ Reset onboarding for ${user.email} (${user.id})`);
    }
  }
}

resetAllUsersOnboarding().catch(console.error);
