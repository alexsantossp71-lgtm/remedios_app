import { ReminderStatus, type AppData, type Reminder, type Snooze, type UserSettings } from '../types';
import { isValidDateKey, isValidTime, todayKey } from './date';

export const STORAGE_KEY = 'remedioNaHora.data.v2';
const LEGACY_STORAGE_KEY = 'medicationReminders';
const MAX_ALERT_AGE = 14 * 86_400_000;

export const DEFAULT_SETTINGS: UserSettings = {
  notificationsEnabled: false,
  soundEnabled: true,
  theme: 'system',
  alertPromptDismissed: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const integer = (value: unknown, fallback: number, min: number, max: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
};

const makeId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const normalizeHistory = (value: unknown): Reminder['history'] => {
  if (!isRecord(value)) return {};
  const history: Reminder['history'] = {};

  for (const [date, rawDay] of Object.entries(value)) {
    if (!isValidDateKey(date) || !isRecord(rawDay)) continue;
    const day: Record<string, ReminderStatus> = {};
    for (const [time, status] of Object.entries(rawDay)) {
      if (!isValidTime(time)) continue;
      if (status === ReminderStatus.TAKEN || status === ReminderStatus.SKIPPED) day[time] = status;
    }
    if (Object.keys(day).length > 0) history[date] = day;
  }

  return history;
};

export const normalizeReminder = (value: unknown): Reminder | null => {
  if (!isRecord(value)) return null;
  const medicationName = text(value.medicationName, 120);
  if (!medicationName) return null;

  const rawDuration = isRecord(value.duration) ? value.duration : {};
  const durationType = rawDuration.type === 'continuous' ? 'continuous' : 'days';
  const rawFrequency = isRecord(value.frequency) ? value.frequency : {};
  const frequencyType = rawFrequency.type === 'interval' ? 'interval' : 'daily';
  const times = Array.isArray(value.times)
    ? [...new Set(value.times.filter(isValidTime))].sort()
    : [];

  return {
    id: text(value.id, 100) || makeId(),
    medicationName,
    dosage: text(value.dosage, 80),
    instructions: text(value.instructions, 300),
    startDate: isValidDateKey(value.startDate) ? value.startDate : todayKey(),
    duration: {
      type: durationType,
      days: durationType === 'days' ? integer(rawDuration.days, 7, 1, 3_650) : 0,
    },
    frequency: {
      type: frequencyType,
      days: frequencyType === 'interval' ? integer(rawFrequency.days, 2, 2, 365) : 1,
    },
    times: times.length > 0 ? times : ['08:00'],
    history: normalizeHistory(value.history),
    enabled: value.enabled !== false,
    createdAt: text(value.createdAt, 40) || new Date().toISOString(),
  };
};

const normalizeSettings = (value: unknown): UserSettings => {
  if (!isRecord(value)) return DEFAULT_SETTINGS;
  const theme = value.theme === 'light' || value.theme === 'dark' ? value.theme : 'system';
  return {
    notificationsEnabled: value.notificationsEnabled === true,
    soundEnabled: value.soundEnabled !== false,
    theme,
    alertPromptDismissed: value.alertPromptDismissed === true,
  };
};

const normalizeSnoozes = (value: unknown, reminders: Reminder[]): Snooze[] => {
  if (!Array.isArray(value)) return [];
  const reminderIds = new Set(reminders.map((reminder) => reminder.id));
  const now = Date.now();

  return value.flatMap((item): Snooze[] => {
    if (!isRecord(item)) return [];
    const reminderId = text(item.reminderId, 100);
    const date = text(item.date, 10);
    const time = text(item.time, 5);
    const dueAt = text(item.dueAt, 40);
    const dueTimestamp = Date.parse(dueAt);
    if (
      !reminderIds.has(reminderId) ||
      !isValidDateKey(date) ||
      !isValidTime(time) ||
      !Number.isFinite(dueTimestamp) ||
      dueTimestamp < now - 86_400_000
    ) {
      return [];
    }

    return [
      {
        id: text(item.id, 160) || makeId(),
        doseKey: text(item.doseKey, 240) || `${reminderId}|${date}|${time}`,
        reminderId,
        date,
        time,
        dueAt: new Date(dueTimestamp).toISOString(),
      },
    ];
  });
};

const normalizeAlerted = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {};
  const result: Record<string, string> = {};
  const cutoff = Date.now() - MAX_ALERT_AGE;
  for (const [key, timestamp] of Object.entries(value)) {
    if (typeof timestamp === 'string' && Date.parse(timestamp) >= cutoff) result[key] = timestamp;
  }
  return result;
};

export const createEmptyAppData = (): AppData => ({
  version: 2,
  reminders: [],
  snoozes: [],
  alertedDoseKeys: {},
  settings: { ...DEFAULT_SETTINGS },
  updatedAt: new Date().toISOString(),
});

export const normalizeAppData = (value: unknown): AppData => {
  const raw = Array.isArray(value) ? { reminders: value } : isRecord(value) ? value : {};
  const reminders = Array.isArray(raw.reminders)
    ? raw.reminders.map(normalizeReminder).filter((item): item is Reminder => item !== null)
    : [];

  return {
    version: 2,
    reminders,
    snoozes: normalizeSnoozes(raw.snoozes, reminders),
    alertedDoseKeys: normalizeAlerted(raw.alertedDoseKeys),
    settings: normalizeSettings(raw.settings),
    updatedAt: text(raw.updatedAt, 40) || new Date().toISOString(),
  };
};

export const loadAppData = (): AppData => {
  if (typeof window === 'undefined') return createEmptyAppData();

  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalizeAppData(JSON.parse(current));

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = normalizeAppData(JSON.parse(legacy));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return migrated;
    }
  } catch {
    // Corrupted browser data must not prevent the app from opening.
  }

  return createEmptyAppData();
};

export const saveAppData = (data: AppData): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
  } catch {
    // Storage can be unavailable in private browsing; the current session still works.
  }
};

export const exportAppData = (data: AppData): string => JSON.stringify(data, null, 2);

export const importAppData = (json: string): AppData => {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed) && (!isRecord(parsed) || !Array.isArray(parsed.reminders))) {
    throw new Error('Formato de cópia inválido.');
  }
  return normalizeAppData(parsed);
};
