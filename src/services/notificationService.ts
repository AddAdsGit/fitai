/**
 * FitAI Notification Service
 * Universal Web Push, Service Worker, and Scheduled Notification Handler.
 * Supports Android Chrome, iOS PWA, and Desktop browsers.
 */

export interface ReminderSlot {
  id: string;
  label: string;
  time: string; // 'HH:mm' 24h
  enabled: boolean;
  icon?: string;
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register Service Worker for background and mobile notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn('[FitAI Notifications] Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Check if the browser supports system notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await registerServiceWorker();
    }
    return perm;
  } catch (err) {
    console.error('[FitAI Notifications] Permission request error:', err);
    return 'denied';
  }
}

/**
 * Send an immediate system notification.
 * Uses ServiceWorker.showNotification on Android/Mobile Chrome & falls back to Notification constructor on Desktop.
 */
export async function sendAppNotification(
  title: string,
  options: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  } = {}
): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  if (Notification.permission !== 'granted') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') return false;
  }

  // Trigger tactile vibration on Android / mobile devices
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([120, 60, 120]);
    } catch (_) {}
  }

  const notificationOptions: NotificationOptions = {
    body: options.body || 'Time for your FitAI check-in! 🥗',
    icon: options.icon || '/favicon.ico',
    badge: options.badge || '/favicon.ico',
    tag: options.tag || 'fitai-reminder',
    data: options.data || { url: '/' },
  };

  // 1. Try Service Worker first (Required on Android Chrome & iOS PWA)
  if ('serviceWorker' in navigator) {
    try {
      const reg = swRegistration || (await navigator.serviceWorker.ready);
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('[FitAI Notifications] SW showNotification failed, attempting fallback:', swErr);
    }
  }

  // 2. Fallback to direct Notification constructor (for desktop browsers)
  try {
    new Notification(title, notificationOptions);
    return true;
  } catch (directErr) {
    console.warn('[FitAI Notifications] Direct notification constructor failed:', directErr);
    return false;
  }
}

/**
 * Parses user preferences and returns active reminder slots
 */
export function getActiveReminderSlots(profileData: any): ReminderSlot[] {
  const pref = (profileData?.preferences || []).find((p: string) => p.startsWith('reminder_slots:'));
  if (pref) {
    try {
      const parsed = JSON.parse(pref.substring('reminder_slots:'.length));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(s => s.enabled);
      }
    } catch (_) {}
  }

  // Default fallback slots
  const legacyTimes = profileData?.telegramReminderTimes || ['08:30', '13:00', '20:00'];
  return [
    { id: 'breakfast', label: 'Breakfast', time: legacyTimes[0] || '08:30', enabled: true, icon: 'sunrise' },
    { id: 'lunch', label: 'Lunch', time: legacyTimes[1] || '13:00', enabled: true, icon: 'sun' },
    { id: 'dinner', label: 'Dinner', time: legacyTimes[2] || '20:00', enabled: true, icon: 'moon' },
  ];
}

/**
 * Checks scheduled reminders against current time and triggers notification if due.
 * Ensures notifications are not sent more than once per day per slot.
 */
export function checkAndTriggerScheduledReminders(profileData: any): void {
  const isPushEnabled = (profileData?.preferences || []).some((p: string) => p === 'push_notifications:true');
  if (!isPushEnabled || getNotificationPermission() !== 'granted') return;

  const now = new Date();
  const todayKey = now.toISOString().split('T')[0];
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = currentHours + ':' + currentMinutes;

  const activeSlots = getActiveReminderSlots(profileData);

  activeSlots.forEach((slot) => {
    if (!slot.enabled || !slot.time) return;

    // Check if slot matches current time (within 1 minute)
    if (slot.time === currentTimeStr) {
      const sentKey = 'fitai_reminder_sent_' + todayKey + '_' + slot.id;
      const alreadySent = sessionStorage.getItem(sentKey) || localStorage.getItem(sentKey);

      if (!alreadySent) {
        // Mark as sent immediately to avoid duplicates in the same minute
        sessionStorage.setItem(sentKey, 'true');
        localStorage.setItem(sentKey, 'true');

        let reminderBody = 'Time for ' + slot.label + '! Did you log your meal?';
        if (slot.id === 'hydration') {
          reminderBody = 'Stay hydrated! Have a glass of water and track your vitals.';
        }

        sendAppNotification('FitAI ' + slot.label + ' Reminder', {
          body: reminderBody,
          tag: 'fitai-' + slot.id,
        });
      }
    }
  });
}
