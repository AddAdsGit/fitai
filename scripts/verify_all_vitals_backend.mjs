import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://twrjigbbgioqdpwvkblo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cmppZ2JiZ2lvcWRwd3ZrYmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzUzMjk0OCwiZXhwIjoyMDk5MTA4OTQ4fQ.u_0wYh-kfYn2jQd4nlIiQpd9RvKizM92cyDj6nQqyJ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runAudit() {
  console.log("=== RUNNING STRICT COLUMN-MATCHING BACKEND TEST ===");
  const { data: users } = await supabase.auth.admin.listUsers();
  const targetUser = users?.users?.find(u => u.email === "sivavenkatamanikanta@gmail.com");
  const profileId = targetUser.id;
  const todayStr = new Date().toISOString().split("T")[0];

  const sampleWaterLogs = [{ id: "w1", amount: 500, time: "10:00" }];
  const sampleStoolLogs = [{ id: "s1", type: 4, time: "10:30" }];
  const sampleEnergyLogs = [{ id: "e1", level: 5, time: "11:00" }];
  const sampleBloatingLogs = [{ id: "b1", level: 3, time: "11:30" }];

  const metaObj = {
    water_logs: sampleWaterLogs,
    stool_logs: sampleStoolLogs,
    energy_logs: sampleEnergyLogs,
    bloating_logs: sampleBloatingLogs
  };

  const syncedNotes = `<!-- FIT_WELLNESS_META: ${JSON.stringify(metaObj)} -->`;

  // ONLY send columns that actually exist in Supabase daily_wellness table!
  const payload = {
    profile_id: profileId,
    date: todayStr,
    notes: syncedNotes,
    water_intake: 500,
    water_log_time: "10:00",
    weight_log_time: "08:00"
  };

  console.log("Upserting strict payload...");
  const { data: upsertData, error: upsertErr } = await supabase
    .from("daily_wellness")
    .upsert(payload, { onConflict: "profile_id,date" })
    .select();

  if (upsertErr) {
    console.error("❌ Upsert failed:", upsertErr);
  } else {
    console.log("✅ UPSERT SUCCESSFUL! Row ID:", upsertData[0].id);
  }

  // Fetch back row and test parseWellnessRow logic
  const { data: fetchedRows } = await supabase
    .from("daily_wellness")
    .select("*")
    .eq("profile_id", profileId)
    .eq("date", todayStr);

  const row = fetchedRows[0];
  const match = row.notes.match(/<!-- FIT_WELLNESS_META: ([\s\S]*?) -->/);
  const meta = match ? JSON.parse(match[1]) : null;

  console.log("\n=== PERSISTENCE & PARSING VERIFICATION ===");
  console.log("Account Isolated profile_id:", row.profile_id);
  console.log("Water logs:", meta.water_logs);
  console.log("Stool logs:", meta.stool_logs);
  console.log("Energy logs:", meta.energy_logs);
  console.log("Bloating logs:", meta.bloating_logs);
}

runAudit().catch(console.error);
