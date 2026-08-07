export type DateKey = `${number}-${number}-${number}`;

export enum ReminderStatus {
  TAKEN = 'taken',
  SKIPPED = 'skipped',
}

export type DoseState = ReminderStatus | 'upcoming' | 'due' | 'missed';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface MedicationSuggestion {
  name: string;
}

export interface Reminder {
  id: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  startDate: string;
  duration: {
    type: 'days' | 'continuous';
    days: number;
  };
  frequency: {
    type: 'daily' | 'interval';
    days: number;
  };
  times: string[];
  history: Record<string, Record<string, ReminderStatus>>;
  enabled: boolean;
  createdAt: string;
}

export type ReminderInput = Omit<Reminder, 'id' | 'history' | 'createdAt'>;

export interface Snooze {
  id: string;
  doseKey: string;
  reminderId: string;
  date: string;
  time: string;
  dueAt: string;
}

export interface UserSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  theme: ThemePreference;
  alertPromptDismissed: boolean;
}

export interface AppData {
  version: 2;
  reminders: Reminder[];
  snoozes: Snooze[];
  alertedDoseKeys: Record<string, string>;
  settings: UserSettings;
  updatedAt: string;
}

export interface DoseOccurrence {
  key: string;
  alertKey: string;
  reminderId: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  date: string;
  time: string;
  scheduledAt: Date;
  snoozed: boolean;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
