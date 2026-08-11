import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://twrjigbbgioqdpwvkblo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cmppZ2JiZ2lvcWRwd3ZrYmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzUzMjk0OCwiZXhwIjoyMDk5MTA4OTQ4fQ.u_0wYh-kfYn2jQd4nlIiQpd9RvKizM92cyDj6nQqyJ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUserPrefs() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, username, display_name, preferences');
  if (error) {
    console.error("Error fetching profiles:", error);
    return;
  }
  console.log("Current Supabase Profiles:");
  profiles.forEach((p) => {
    console.log(`- ${p.display_name} (@${p.username}): preferences =`, JSON.stringify(p.preferences));
  });
}

checkUserPrefs().catch(console.error);
