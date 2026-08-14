import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://twrjigbbgioqdpwvkblo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cmppZ2JiZ2lvcWRwd3ZrYmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzUzMjk0OCwiZXhwIjoyMDk5MTA4OTQ4fQ.u_0wYh-kfYn2jQd4nlIiQpd9RvKizM92cyDj6nQqyJ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkColumns() {
  const { data, error } = await supabase.from('daily_wellness').select('*').limit(1);
  if (error) console.error(error);
  else {
    console.log("=== EXISTING DAILY_WELLNESS COLUMNS ===");
    console.log(data && data.length > 0 ? Object.keys(data[0]) : "No rows found, testing minimal insert...");
  }
}

checkColumns().catch(console.error);
