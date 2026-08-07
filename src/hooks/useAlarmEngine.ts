import { useEffect, useRef } from 'react';
import type { DoseOccurrence, Reminder, Snooze } from '../types';
import { makeOccurrence, getNextDose, getOccurrencesBetween, isDoseHandled } from '../utils/schedule';
import { playAlarmSound, showSystemNotification } from '../services/notifications';

const POLL_INTERVAL_MS = 30_000;
const ALERT_LOOKBACK_MS = 30 * 60 * 1000;

interface AlarmEngineOptions {
  reminders: Reminder[];
  snoozes: Snooze[];
  alertedDoseKeys: Record<string, string>;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  onDue: (occurrence: DoseOccurrence) => void;
  onAlerted: (alertKeys: string[]) => void;
}

export const useAlarmEngine = ({
  reminders,
  snoozes,
  alertedDoseKeys,
  notificationsEnabled,
  soundEnabled,
  onDue,
  onAlerted,
}: AlarmEngineOptions): void => {
  const lastCheckRef = useRef<number | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    if (lastCheckRef.current === null) lastCheckRef.current = Date.now() - ALERT_LOOKBACK_MS;
    const sessionSeen = new Set<string>();

    const getSnoozedOccurrences = (from: Date, to: Date): DoseOccurrence[] =>
      snoozes.flatMap((snooze) => {
        const dueAt = new Date(snooze.dueAt);
        const reminder = reminders.find((item) => item.id === snooze.reminderId);
        if (!reminder?.enabled || dueAt < from || dueAt > to || isDoseHandled(
          makeOccurrence(reminder, snooze.date, snooze.time),
          reminder,
        )) {
          return [];
        }

        return [
          makeOccurrence(reminder, snooze.date, snooze.time, {
            scheduledAt: dueAt,
            alertKey: `snooze|${snooze.id}`,
            snoozed: true,
          }),
        ];
      });

    const scheduleCheck = (): void => {
      if (cancelled) return;
      const now = new Date();
      const nextRegular = getNextDose(reminders, now);
      const enabledReminderIds = new Set(
        reminders.filter((reminder) => reminder.enabled).map((reminder) => reminder.id),
      );
      const nextSnooze = snoozes
        .filter((item) => enabledReminderIds.has(item.reminderId))
        .map((item) => new Date(item.dueAt))
        .filter((date) => date > now)
        .sort((a, b) => a.getTime() - b.getTime())[0];
      const nextTimestamp = [nextRegular?.scheduledAt, nextSnooze]
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      const delay = nextTimestamp
        ? Math.max(500, Math.min(POLL_INTERVAL_MS, nextTimestamp.getTime() - now.getTime() + 250))
        : POLL_INTERVAL_MS;
      timer = window.setTimeout(check, delay);
    };

    const check = async (): Promise<void> => {
      if (timer) window.clearTimeout(timer);
      const now = new Date();
      const previousCheck = lastCheckRef.current ?? now.getTime() - ALERT_LOOKBACK_MS;
      const from = new Date(Math.max(previousCheck, now.getTime() - ALERT_LOOKBACK_MS));
      lastCheckRef.current = now.getTime();

      const regular = getOccurrencesBetween(reminders, from, now).filter((occurrence) => {
        const reminder = reminders.find((item) => item.id === occurrence.reminderId);
        return !isDoseHandled(occurrence, reminder);
      });
      const candidates = [...regular, ...getSnoozedOccurrences(from, now)]
        .filter(
          (occurrence) =>
            !alertedDoseKeys[occurrence.alertKey] && !sessionSeen.has(occurrence.alertKey),
        )
        .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

      if (candidates.length > 0) {
        for (const occurrence of candidates) {
          sessionSeen.add(occurrence.alertKey);
          onDue(occurrence);
          if (notificationsEnabled) void showSystemNotification(occurrence);
        }
        onAlerted(candidates.map((occurrence) => occurrence.alertKey));
        if (soundEnabled) void playAlarmSound();
      }

      scheduleCheck();
    };

    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible') void check();
    };
    const handleFocus = (): void => void check();

    void check();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [
    alertedDoseKeys,
    notificationsEnabled,
    onAlerted,
    onDue,
    reminders,
    snoozes,
    soundEnabled,
  ]);
};
