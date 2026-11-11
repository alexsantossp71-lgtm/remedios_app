
// Relatório de adesão às doses: usa o histórico já gravado nos lembretes
// (history['YYYY-MM-DD']['HH:MM'] = 'taken' | 'skipped') para responder
// "quantas das doses programadas nos últimos N dias foram tomadas?".
// Funções puras, cobertas por adherence.test.ts.

import { Reminder } from '../types';
import { parseLocalDate, toDateKey } from './datetime';

export interface Adherence {
    /** Doses programadas na janela (não conta doses futuras de hoje). */
    expected: number;
    taken: number;
    skipped: number;
    /** Programadas e nunca respondidas (inclui as de hoje ainda pendentes). */
    pending: number;
    /** Porcentagem de tomadas sobre programadas (0-100), ou null sem doses. */
    pct: number | null;
}

const DAY_MS = 86_400_000;

/** Meia-noite local do dia em questão. */
const midnightOf = (day: Date): Date => {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Horários programados de um lembrete em um dia específico:
 * - dentro do período do tratamento (início até início + N dias);
 * - respeitando frequência em dias alternados;
 * - sem doses futuras de hoje (ainda não "esperadas") e sem doses
 *   anteriores à criação do lembrete (ele nem existia).
 */
export const expectedTimesForDay = (reminder: Reminder, day: Date, now: Date): string[] => {
    const startDate = parseLocalDate(reminder.startDate);
    if (!startDate) return [];

    const dayMidnight = midnightOf(day);

    if (dayMidnight.getTime() < startDate.getTime()) return [];

    // Tratamento de N dias cobre de startDate até startDate + N dias.
    if (reminder.duration.type === 'days') {
        const end = new Date(startDate);
        end.setDate(end.getDate() + reminder.duration.days);
        if (dayMidnight.getTime() > end.getTime()) return [];
    }

    const diffDays = Math.round((dayMidnight.getTime() - startDate.getTime()) / DAY_MS);
    if (reminder.frequency.type === 'interval' && diffDays % reminder.frequency.days !== 0) {
        return [];
    }

    const createdMs = reminder.createdAt ? Date.parse(reminder.createdAt) : 0;
    const isToday = dayMidnight.getTime() === midnightOf(now).getTime();

    return reminder.times.filter(time => {
        const [hour, minute] = time.split(':').map(Number);
        const doseDate = new Date(dayMidnight);
        doseDate.setHours(hour, minute, 0, 0);
        if (isToday && doseDate.getTime() > now.getTime()) return false;
        if (createdMs > doseDate.getTime()) return false;
        return true;
    });
};

/** Adesão dos lembretes nos últimos `days` dias (incluindo hoje). */
export const computeAdherence = (reminders: Reminder[], days: number, now: Date = new Date()): Adherence => {
    const result: Adherence = { expected: 0, taken: 0, skipped: 0, pending: 0, pct: null };

    for (let offset = days - 1; offset >= 0; offset--) {
        const day = new Date(now);
        day.setDate(day.getDate() - offset);
        const key = toDateKey(day);

        reminders.forEach(reminder => {
            const dayHistory = reminder.history[key] ?? {};
            expectedTimesForDay(reminder, day, now).forEach(time => {
                result.expected += 1;
                const status = dayHistory[time];
                if (status === 'taken') result.taken += 1;
                else if (status === 'skipped') result.skipped += 1;
                else result.pending += 1;
            });
        });
    }

    result.pct = result.expected > 0 ? Math.round((result.taken / result.expected) * 100) : null;
    return result;
};
