import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://twrjigbbgioqdpwvkblo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cmppZ2JiZ2lvcWRwd3ZrYmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzUzMjk0OCwiZXhwIjoyMDk5MTA4OTQ4fQ.u_0wYh-kfYn2jQd4nlIiQpd9RvKizM92cyDj6nQqyJ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listProfiles() {
  console.log("=== LISTING ALL PROFILES ===");
  const { data, error } = await supabase.from('profiles').select('id, username, display_name, created_at');
  if (error) {
    console.error("Error listing profiles:", error.message);
  } else {
    data.forEach((p, i) => {
      console.log(`[${i+1}] ID: ${p.id} | Username: ${p.username} | Display Name: ${p.display_name} | Created: ${p.created_at}`);
    });
  }
}

listProfiles().catch(console.error);
