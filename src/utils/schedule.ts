import { ReminderStatus, type DoseOccurrence, type DoseState, type Reminder } from '../types';
import {
  addCalendarDays,
  combineDateAndTime,
  differenceInCalendarDays,
  parseLocalDate,
  startOfLocalDay,
  toDateKey,
} from './date';

const DUE_WINDOW_MS = 30 * 60 * 1000;
const MAX_SEARCH_DAYS = 4_000;

export const makeDoseKey = (reminderId: string, date: string, time: string): string =>
  `${reminderId}|${date}|${time}`;

export const isReminderScheduledOn = (reminder: Reminder, dateKey: string): boolean => {
  if (!reminder.enabled) return false;

  const day = parseLocalDate(dateKey);
  const start = parseLocalDate(reminder.startDate);
  const dayOffset = differenceInCalendarDays(day, start);
  if (dayOffset < 0) return false;

  if (reminder.duration.type === 'days' && dayOffset >= reminder.duration.days) return false;

  return (
    reminder.frequency.type === 'daily' || dayOffset % Math.max(1, reminder.frequency.days) === 0
  );
};

export const makeOccurrence = (
  reminder: Reminder,
  date: string,
  time: string,
  options: { alertKey?: string; scheduledAt?: Date; snoozed?: boolean } = {},
): DoseOccurrence => {
  const key = makeDoseKey(reminder.id, date, time);
  return {
    key,
    alertKey: options.alertKey ?? key,
    reminderId: reminder.id,
    medicationName: reminder.medicationName,
    dosage: reminder.dosage,
    instructions: reminder.instructions,
    date,
    time,
    scheduledAt: options.scheduledAt ?? combineDateAndTime(date, time),
    snoozed: options.snoozed ?? false,
  };
};

export const getDosesForDate = (reminders: Reminder[], dateKey: string): DoseOccurrence[] =>
  reminders
    .filter((reminder) => isReminderScheduledOn(reminder, dateKey))
    .flatMap((reminder) => reminder.times.map((time) => makeOccurrence(reminder, dateKey, time)))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

export const getOccurrencesBetween = (
  reminders: Reminder[],
  from: Date,
  to: Date,
): DoseOccurrence[] => {
  if (from.getTime() > to.getTime()) return [];

  const occurrences: DoseOccurrence[] = [];
  let cursor = startOfLocalDay(from);
  const lastDay = startOfLocalDay(to);

  while (cursor.getTime() <= lastDay.getTime()) {
    const dateKey = toDateKey(cursor);
    for (const occurrence of getDosesForDate(reminders, dateKey)) {
      if (occurrence.scheduledAt >= from && occurrence.scheduledAt <= to) occurrences.push(occurrence);
    }
    cursor = startOfLocalDay(addCalendarDays(cursor, 1));
  }

  return occurrences.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
};

export const getRecordedStatus = (
  reminder: Reminder | undefined,
  date: string,
  time: string,
): ReminderStatus | undefined => reminder?.history[date]?.[time];

export const getDoseState = (
  occurrence: DoseOccurrence,
  reminder: Reminder | undefined,
  now = new Date(),
): DoseState => {
  const recorded = getRecordedStatus(reminder, occurrence.date, occurrence.time);
  if (recorded) return recorded;

  const difference = occurrence.scheduledAt.getTime() - now.getTime();
  if (difference > 0) return 'upcoming';
  if (Math.abs(difference) <= DUE_WINDOW_MS) return 'due';
  return 'missed';
};

export const isDoseHandled = (occurrence: DoseOccurrence, reminder: Reminder | undefined): boolean =>
  Boolean(getRecordedStatus(reminder, occurrence.date, occurrence.time));

export const getNextDose = (reminders: Reminder[], after = new Date()): DoseOccurrence | null => {
  let next: DoseOccurrence | null = null;
  const afterDay = startOfLocalDay(after);

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;

    const start = parseLocalDate(reminder.startDate);
    let cursor = start > afterDay ? start : afterDay;

    for (let index = 0; index < MAX_SEARCH_DAYS; index += 1) {
      const dateKey = toDateKey(cursor);
      if (isReminderScheduledOn(reminder, dateKey)) {
        const candidates = reminder.times
          .map((time) => makeOccurrence(reminder, dateKey, time))
          .filter(
            (occurrence) =>
              occurrence.scheduledAt > after &&
              !getRecordedStatus(reminder, occurrence.date, occurrence.time),
          )
          .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

        if (candidates.length > 0) {
          const candidate = candidates[0];
          if (!next || candidate.scheduledAt < next.scheduledAt) next = candidate;
          break;
        }
      }

      if (
        reminder.duration.type === 'days' &&
        differenceInCalendarDays(cursor, start) >= reminder.duration.days
      ) {
        break;
      }
      cursor = addCalendarDays(cursor, 1);
    }
  }

  return next;
};

export interface AdherenceSummary {
  total: number;
  taken: number;
  skipped: number;
  missed: number;
  percentage: number | null;
}

export const getAdherenceSummary = (
  reminders: Reminder[],
  from: Date,
  to: Date,
  now = new Date(),
): AdherenceSummary => {
  const elapsed = getOccurrencesBetween(reminders, from, to).filter(
    (occurrence) => occurrence.scheduledAt <= now,
  );
  let taken = 0;
  let skipped = 0;

  for (const occurrence of elapsed) {
    const reminder = reminders.find((item) => item.id === occurrence.reminderId);
    const status = getRecordedStatus(reminder, occurrence.date, occurrence.time);
    if (status === ReminderStatus.TAKEN) taken += 1;
    if (status === ReminderStatus.SKIPPED) skipped += 1;
  }

  const total = elapsed.length;
  const missed = Math.max(0, total - taken - skipped);
  return {
    total,
    taken,
    skipped,
    missed,
    percentage: total === 0 ? null : Math.round((taken / total) * 100),
  };
};
