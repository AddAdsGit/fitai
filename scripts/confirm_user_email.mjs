import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://twrjigbbgioqdpwvkblo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cmppZ2JiZ2lvcWRwd3ZrYmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzUzMjk0OCwiZXhwIjoyMDk5MTA4OTQ4fQ.u_0wYh-kfYn2jQd4nlIiQpd9RvKizM92cyDj6nQqyJ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function autoConfirmAllUsers() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error listing users:", error);
    return;
  }
  for (const u of data.users) {
    console.log(`Checking user: ${u.email} (${u.id})`);
    const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(
      u.id,
      { email_confirm: true }
    );
    if (updateErr) {
      console.error(`Error confirming ${u.email}:`, updateErr.message);
    } else {
      console.log(`✅ Auto-confirmed email for ${u.email}`);
    }
  }
}

autoConfirmAllUsers().catch(console.error);
