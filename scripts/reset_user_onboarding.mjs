import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://twrjigbbgioqdpwvkblo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cmppZ2JiZ2lvcWRwd3ZrYmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzUzMjk0OCwiZXhwIjoyMDk5MTA4OTQ4fQ.u_0wYh-kfYn2jQd4nlIiQpd9RvKizM92cyDj6nQqyJ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function resetOnboarding() {
  const email = "sivavenkatamanikanta@gmail.com";
  console.log(`Resetting onboarding status for ${email}...`);

  const { data: usersData, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) {
    console.error("Error listing users:", userErr);
    return;
  }

  const user = usersData.users.find(u => u.email === email);
  if (!user) {
    console.error(`User with email ${email} not found`);
    return;
  }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profErr) {
    console.error("Error fetching profile:", profErr);
    return;
  }

  const updatedPrefs = (profile.preferences || []).filter(p => p !== "onboarded");

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ preferences: updatedPrefs })
    .eq('id', user.id);

  if (updateErr) {
    console.error("Error updating profile preferences:", updateErr);
  } else {
    console.log(`✅ Successfully reset onboarding for ${email} (${user.id})!`);
  }
}

resetOnboarding().catch(console.error);
