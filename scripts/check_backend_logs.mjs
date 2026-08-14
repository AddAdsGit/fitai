import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://twrjigbbgioqdpwvkblo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cmppZ2JiZ2lvcWRwd3ZrYmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzUzMjk0OCwiZXhwIjoyMDk5MTA4OTQ4fQ.u_0wYh-kfYn2jQd4nlIiQpd9RvKizM92cyDj6nQqyJ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkBackendLogs() {
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error("Error fetching users:", userError);
    return;
  }
  const targetUser = users.users.find(u => u.email === "sivavenkatamanikanta@gmail.com");
  console.log("Target User ID:", targetUser ? targetUser.id : "Not found");

  if (!targetUser) return;

  const { data: profiles } = await supabase.from('profiles').select('id, display_name, preferences, agent_config').eq('id', targetUser.id);
  console.log("Profile Data:", JSON.stringify(profiles, null, 2));

  const { data: wellnessRows, error: wErr } = await supabase
    .from('daily_wellness')
    .select('*')
    .eq('profile_id', targetUser.id)
    .order('date', { ascending: false });

  if (wErr) {
    console.error("Error fetching daily_wellness:", wErr);
  } else {
    console.log("=== DAILY WELLNESS ROWS IN BACKEND ===");
    console.log(JSON.stringify(wellnessRows, null, 2));
  }
}

checkBackendLogs().catch(console.error);
