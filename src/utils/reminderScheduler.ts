import type { Reminder } from '../types';
import { parseLocalDate } from './datetime';

export interface NextReminderAlarm {
    nextAlarmTime: Date | null;
    nextAlarmReminder: { reminder: Reminder; time: string } | null;
}

/** Calcula o próximo alarme local sem depender de timers ou APIs do navegador. */
export function getNextReminderAlarm(reminders: Reminder[], now: Date = new Date()): NextReminderAlarm {
    let nextAlarmTime: Date | null = null;
    let nextAlarmReminder: { reminder: Reminder; time: string } | null = null;

    for (const reminder of reminders) {
        // A data de início é interpretada no fuso local, não como UTC.
        const startDate = parseLocalDate(reminder.startDate);
        if (!startDate) continue;

        if (reminder.duration.type === 'days') {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + reminder.duration.days);
            if (now > endDate) continue;
        }

        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) continue;

        const scheduledToday = reminder.frequency.type === 'daily' ||
            (reminder.frequency.type === 'interval' &&
                reminder.frequency.days > 0 &&
                diffDays % reminder.frequency.days === 0);
        if (!scheduledToday) continue;

        for (const time of reminder.times) {
            const [hour, minute] = time.split(':').map(Number);
            if (!Number.isInteger(hour) || !Number.isInteger(minute) ||
                hour < 0 || hour > 23 || minute < 0 || minute > 59) continue;

            const alarmDateTime = new Date(now);
            alarmDateTime.setHours(hour, minute, 0, 0);
            const historyKey = [
                alarmDateTime.getFullYear(),
                String(alarmDateTime.getMonth() + 1).padStart(2, '0'),
                String(alarmDateTime.getDate()).padStart(2, '0'),
            ].join('-');
            const dayHistory = reminder.history[historyKey] || {};

            if (alarmDateTime <= now || dayHistory[time]) continue;
            if (nextAlarmTime && alarmDateTime >= nextAlarmTime) continue;

            nextAlarmTime = alarmDateTime;
            nextAlarmReminder = { reminder, time };
        }
    }

    return { nextAlarmTime, nextAlarmReminder };
}
