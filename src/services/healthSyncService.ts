import { Capacitor } from "@capacitor/core";
import { supabase } from "../lib/supabaseClient";

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  provider: "apple" | "google";
  status: "success" | "warning" | "error";
  message: string;
  details?: {
    activeCalories?: number;
    steps?: number;
    weight?: number;
    errorText?: string;
  };
}

// Helper to check native platform availability
export const isNativePlatform = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch (_) {
    return false;
  }
};

export const getPlatformName = (): "ios" | "android" | "web" => {
  try {
    const platform = Capacitor.getPlatform();
    if (platform === "ios") return "ios";
    if (platform === "android") return "android";
    return "web";
  } catch (_) {
    return "web";
  }
};

// Check if Apple Health can be used
export const isAppleHealthSupported = (): boolean => {
  const platform = getPlatformName();
  return platform === "ios" || platform === "web";
};

// Check if Google Fit / Health Connect can be used
export const isGoogleFitSupported = (): boolean => {
  const platform = getPlatformName();
  return platform === "android" || platform === "web";
};

/**
 * Request permissions for Apple Health (HealthKit) or Google Fit (Health Connect)
 */
export const requestHealthPermissions = async (
  provider: "apple" | "google"
): Promise<{ success: boolean; message: string }> => {
  const platform = getPlatformName();

  if (platform === "web") {
    return {
      success: true,
      message: `${provider === "apple" ? "Apple Health" : "Google Fit"} connected in Web Mode (Simulated permissions active).`,
    };
  }

  try {
    if (provider === "apple" && platform === "ios") {
      const { CapacitorHealthkit } = await import("@perfood/capacitor-healthkit");
      await CapacitorHealthkit.requestAuthorization({
        all: [],
        read: ["activeEnergyBurned", "stepCount", "weight"],
        write: ["weight"],
      });
      return {
        success: true,
        message: "Apple Health permissions granted.",
      };
    }

    if (provider === "google" && platform === "android") {
      const { Health } = await import("@capgo/capacitor-health");
      await Health.requestAuthorization({
        read: ["calories", "steps", "weight"],
        write: ["weight"],
      });
      return {
        success: true,
        message: "Google Fit & Health Connect permissions granted.",
      };
    }

    return {
      success: false,
      message: `Platform ${platform} does not support ${provider} native health sync.`,
    };
  } catch (err: any) {
    console.error(`Error requesting ${provider} permissions:`, err);
    return {
      success: false,
      message: err?.message || `Failed to request ${provider} health permissions.`,
    };
  }
};

/**
 * Fetch health metrics for a target date (defaults to today)
 */
export const fetchHealthMetrics = async (
  provider: "apple" | "google",
  targetDateStr?: string
): Promise<{ activeCalories: number; steps: number; weight?: number; error?: string }> => {
  const platform = getPlatformName();
  const dateStr = targetDateStr || new Date().toISOString().split("T")[0];

  if (platform === "web") {
    // Return simulated metrics on web mode for instant feedback
    return {
      activeCalories: 450,
      steps: 8420,
      weight: 72.5,
    };
  }

  try {
    let activeCalories = 0;
    let steps = 0;
    let weight: number | undefined = undefined;

    const startDate = `${dateStr}T00:00:00.000Z`;
    const endDate = `${dateStr}T23:59:59.999Z`;

    if (provider === "apple" && platform === "ios") {
      const { CapacitorHealthkit } = await import("@perfood/capacitor-healthkit");
      
      // Query active energy burned
      try {
        const energyResult = await CapacitorHealthkit.queryHKitSampleType<any>({
          sampleName: "activeEnergyBurned",
          startDate,
          endDate,
          limit: 100,
        });
        if (energyResult?.resultData && Array.isArray(energyResult.resultData)) {
          activeCalories = Math.round(
            energyResult.resultData.reduce((acc: number, item: any) => acc + (Number(item?.value) || 0), 0)
          );
        }
      } catch (e) {
        console.warn("Failed to query Apple Health active energy:", e);
      }

      // Query step count
      try {
        const stepResult = await CapacitorHealthkit.queryHKitSampleType<any>({
          sampleName: "stepCount",
          startDate,
          endDate,
          limit: 100,
        });
        if (stepResult?.resultData && Array.isArray(stepResult.resultData)) {
          steps = Math.round(
            stepResult.resultData.reduce((acc: number, item: any) => acc + (Number(item?.value) || 0), 0)
          );
        }
      } catch (e) {
        console.warn("Failed to query Apple Health steps:", e);
      }

      // Query weight
      try {
        const weightResult = await CapacitorHealthkit.queryHKitSampleType<any>({
          sampleName: "weight",
          startDate,
          endDate,
          limit: 1,
        });
        if (weightResult?.resultData && weightResult.resultData.length > 0) {
          const val = Number(weightResult.resultData[0]?.value);
          if (!isNaN(val) && val > 0) weight = Math.round(val * 10) / 10;
        }
      } catch (e) {
        console.warn("Failed to query Apple Health weight:", e);
      }
    } else if (provider === "google" && platform === "android") {
      const { Health } = await import("@capgo/capacitor-health");

      try {
        const queryResult = await Health.readSamples({
          startDate,
          endDate,
          dataType: "calories",
        });
        if (queryResult?.samples && Array.isArray(queryResult.samples)) {
          activeCalories = Math.round(
            queryResult.samples.reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0)
          );
        }
      } catch (e) {
        console.warn("Failed to query Google Fit calories:", e);
      }

      try {
        const stepResult = await Health.readSamples({
          startDate,
          endDate,
          dataType: "steps",
        });
        if (stepResult?.samples && Array.isArray(stepResult.samples)) {
          steps = Math.round(
            stepResult.samples.reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0)
          );
        }
      } catch (e) {
        console.warn("Failed to query Google Fit steps:", e);
      }

      try {
        const weightResult = await Health.readSamples({
          startDate,
          endDate,
          dataType: "weight",
          limit: 1,
        });
        if (weightResult?.samples && weightResult.samples.length > 0) {
          const val = Number(weightResult.samples[0].value);
          if (!isNaN(val) && val > 0) weight = Math.round(val * 10) / 10;
        }
      } catch (e) {
        console.warn("Failed to query Google Fit weight:", e);
      }
    }

    return { activeCalories, steps, weight };
  } catch (err: any) {
    console.error(`Error fetching ${provider} health metrics:`, err);
    return {
      activeCalories: 0,
      steps: 0,
      error: err?.message || `Failed to read ${provider} health data`,
    };
  }
};

/**
 * Execute Health Sync to Supabase & update local user logs
 */
export const performHealthSync = async (
  session: any,
  profileData: any,
  setProfileData: (data: any) => void,
  provider: "apple" | "google"
): Promise<{ success: boolean; message: string; logEntry: SyncLogEntry }> => {
  const timestamp = new Date().toISOString();
  const dateStr = new Date().toISOString().split("T")[0];

  try {
    const metrics = await fetchHealthMetrics(provider, dateStr);

    if (metrics.error) {
      const logEntry: SyncLogEntry = {
        id: crypto.randomUUID(),
        timestamp,
        provider,
        status: "error",
        message: `${provider === "apple" ? "Apple Health" : "Google Fit"} read failed: ${metrics.error}`,
        details: { errorText: metrics.error },
      };
      await appendHealthSyncLog(session, profileData, setProfileData, logEntry);
      return { success: false, message: logEntry.message, logEntry };
    }

    // Upsert into daily_wellness table in Supabase
    const userId = session?.user?.id || profileData?.id || localStorage.getItem("fitai_active_profile_id");
    if (userId) {
      const { data: existingWellness } = await supabase
        .from("daily_wellness")
        .select("id")
        .eq("profile_id", userId)
        .eq("date", dateStr)
        .maybeSingle();

      if (existingWellness) {
        await supabase
          .from("daily_wellness")
          .update({
            active_calories_burned: metrics.activeCalories,
            steps: metrics.steps,
            health_sync_last_synced_at: timestamp,
          })
          .eq("id", existingWellness.id);
      } else {
        await supabase.from("daily_wellness").insert({
          profile_id: userId,
          date: dateStr,
          notes: "",
          active_calories_burned: metrics.activeCalories,
          steps: metrics.steps,
          health_sync_last_synced_at: timestamp,
        });
      }

      // If weight was returned from health store, log it to weight_logs
      if (metrics.weight && metrics.weight > 0) {
        await supabase.from("weight_logs").upsert(
          {
            profile_id: userId,
            date: dateStr,
            weight: metrics.weight,
            log_time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          },
          { onConflict: "profile_id,date" }
        );
        // Also update current weight on profile
        await supabase.from("profiles").update({ weight: metrics.weight }).eq("id", userId);
      }
    }

    const providerName = provider === "apple" ? "Apple Health" : "Google Fit";
    const logEntry: SyncLogEntry = {
      id: crypto.randomUUID(),
      timestamp,
      provider,
      status: "success",
      message: `Synced ${metrics.activeCalories} kcal & ${metrics.steps.toLocaleString()} steps from ${providerName}`,
      details: {
        activeCalories: metrics.activeCalories,
        steps: metrics.steps,
        weight: metrics.weight,
      },
    };

    await appendHealthSyncLog(session, profileData, setProfileData, logEntry);
    return { success: true, message: logEntry.message, logEntry };
  } catch (err: any) {
    console.error("Health sync error:", err);
    const logEntry: SyncLogEntry = {
      id: crypto.randomUUID(),
      timestamp,
      provider,
      status: "error",
      message: `Sync error: ${err?.message || "Unknown error during health sync"}`,
      details: { errorText: err?.message },
    };
    await appendHealthSyncLog(session, profileData, setProfileData, logEntry);
    return { success: false, message: logEntry.message, logEntry };
  }
};

/**
 * Helper to append a sync log entry to profileData and Supabase
 */
export const appendHealthSyncLog = async (
  session: any,
  profileData: any,
  setProfileData: (data: any) => void,
  newLog: SyncLogEntry
) => {
  const currentLogs: SyncLogEntry[] = profileData?.health_sync_logs || [];
  const updatedLogs = [newLog, ...currentLogs].slice(0, 30);

  setProfileData({
    ...profileData,
    health_sync_logs: updatedLogs,
    health_sync_last_synced_at: newLog.status === "success" ? newLog.timestamp : profileData?.health_sync_last_synced_at,
  });

  const userId = session?.user?.id || profileData?.id || localStorage.getItem("fitai_active_profile_id");
  if (userId) {
    try {
      await supabase
        .from("profiles")
        .update({
          health_sync_logs: updatedLogs,
        })
        .eq("id", userId);
    } catch (e) {
      console.warn("Failed to persist health sync log to Supabase:", e);
    }
  }
};

/**
 * Clear all sync logs
 */
export const clearHealthSyncLogs = async (
  session: any,
  profileData: any,
  setProfileData: (data: any) => void
) => {
  setProfileData({
    ...profileData,
    health_sync_logs: [],
  });

  const userId = session?.user?.id || profileData?.id || localStorage.getItem("fitai_active_profile_id");
  if (userId) {
    try {
      await supabase
        .from("profiles")
        .update({ health_sync_logs: [] })
        .eq("id", userId);
    } catch (e) {
      console.warn("Failed to clear health sync logs in Supabase:", e);
    }
  }
};
