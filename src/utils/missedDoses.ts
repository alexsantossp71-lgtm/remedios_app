
// Doses de HOJE que já passaram do horário sem resposta — aconteceu o
// alarme com o app fechado/em segundo plano. Função pura (o instante é
// parâmetro), coberta por missedDoses.test.ts.

import { Reminder } from '../types';
import { parseLocalDate, toDateKey } from './datetime';

export interface MissedDose {
    reminder: Reminder;
    time: string; // HH:MM
}

export const findMissedDoses = (list: Reminder[], now: Date = new Date()): MissedDose[] => {
    const dayKey = toDateKey(now);
    const missed: MissedDose[] = [];

    list.forEach(reminder => {
        const startDate = parseLocalDate(reminder.startDate);
        if (!startDate || startDate.getTime() > now.getTime()) return;

        if (reminder.duration.type === 'days') {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + reminder.duration.days);
            if (now > endDate) return;
        }

        const todayMidnight = new Date(now);
        todayMidnight.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((todayMidnight.getTime() - startDate.getTime()) / 86_400_000);
        if (reminder.frequency.type === 'interval' && diffDays % reminder.frequency.days !== 0) return;

        const createdMs = reminder.createdAt ? Date.parse(reminder.createdAt) : 0;
        reminder.times.forEach(time => {
            const [hour, minute] = time.split(':').map(Number);
            const doseDate = new Date(now);
            doseDate.setHours(hour, minute, 0, 0);
            if (doseDate.getTime() >= now.getTime()) return; // ainda não chegou
            if (reminder.history[dayKey]?.[time]) return; // já respondida
            if (createdMs > doseDate.getTime()) return; // lembrete criado depois da dose
            missed.push({ reminder, time });
        });
    });

    missed.sort((a, b) => a.time.localeCompare(b.time));
    return missed;
};
