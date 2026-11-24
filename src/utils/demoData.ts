
// Dados de exemplo do modo demonstração ("experimente em 30s sem instalar").
// Tudo é gerado em memória a partir do momento atual: nada é salvo no
// localStorage (os efeitos de gravação do app são pulados em modo demo) e
// nenhum dado real do usuário é tocado.

import { Reminder, ReminderStatus, Appointment } from '../types';

/** 'YYYY-MM-DD' local a partir de um Date (mesmo formato do app). */
export const toDateKey = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Date local a partir de 'YYYY-MM-DD' + 'HH:MM'. */
export const fromDateTime = (dateKey: string, time: string): Date => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(dateKey);
    date.setFullYear(Number(dateKey.slice(0, 4)));
    date.setMonth(Number(dateKey.slice(5, 7)) - 1, Number(dateKey.slice(8, 10)));
    date.setHours(hours, minutes, 0, 0);
    return date;
};

/**
 * Rotina de exemplo realista: uso contínuo (pressão + estômago) e um
 * analgésico em esquema curto. O histórico de ontem/hoje vem parcialmente
 * marcado como "tomado" para a tela de adesão ter cara de uso real.
 */
export function buildDemoReminders(now: Date): Reminder[] {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayKey = toDateKey(yesterday);
    const todayKey = toDateKey(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isPast = (time: string): boolean => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes < nowMinutes;
    };
    /**
     * Marca como tomadas todas as doses de hoje que já passaram: a demo abre
     * em dia, sem acionar o modal de doses perdidas, com "Próxima dose" no
     * futuro para a pessoa explorar tranquilamente.
     */
    const markPastTodayTaken = (reminder: Reminder): void => {
        const entry: Record<string, ReminderStatus> = {};
        for (const time of reminder.times) {
            if (isPast(time)) entry[time] = ReminderStatus.TAKEN;
        }
        if (Object.keys(entry).length > 0) reminder.history[todayKey] = entry;
    };

    const losartana: Reminder = {
        id: 'demo-losartana',
        medicationName: 'Losartana 50mg',
        dosage: '1 comprimido',
        instructions: 'pela manhã, com água',
        startDate: todayKey,
        duration: { type: 'continuous', days: 0 },
        frequency: { type: 'daily', days: 1 },
        times: ['08:00', '20:00'],
        history: {
            [yesterdayKey]: { '08:00': ReminderStatus.TAKEN, '20:00': ReminderStatus.TAKEN },
        },
        createdAt: fromDateTime(todayKey, '06:00').toISOString(),
    };
    markPastTodayTaken(losartana);

    const omeprazol: Reminder = {
        id: 'demo-omeprazol',
        medicationName: 'Omeprazol 20mg',
        dosage: '1 cápsula',
        instructions: 'em jejum, 30 min antes do café',
        startDate: todayKey,
        duration: { type: 'continuous', days: 0 },
        frequency: { type: 'daily', days: 1 },
        times: ['07:00'],
        history: {
            [yesterdayKey]: { '07:00': ReminderStatus.TAKEN },
        },
        createdAt: fromDateTime(todayKey, '06:00').toISOString(),
    };
    markPastTodayTaken(omeprazol);

    const paracetamol: Reminder = {
        id: 'demo-paracetamol',
        medicationName: 'Paracetamol 500mg',
        dosage: '1 comprimido',
        instructions: 'em caso de dor, a cada 8h, com alimentos',
        startDate: todayKey,
        duration: { type: 'days', days: 3 },
        frequency: { type: 'interval', days: 1 },
        times: ['09:00', '17:00', '01:00'],
        history: {
            [yesterdayKey]: { '09:00': ReminderStatus.TAKEN, '17:00': ReminderStatus.TAKEN },
        },
        createdAt: fromDateTime(todayKey, '06:00').toISOString(),
    };

    markPastTodayTaken(paracetamol);

    return [losartana, omeprazol, paracetamol];
}

/** Consulta de exemplo já agendada, para a aba Minha Saúde não ficar vazia. */
export function buildDemoAppointments(now: Date): Appointment[] {
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    const dateKey = toDateKey(nextWeek);
    return [{
        id: 'demo-consulta-cardio',
        doctorId: '',
        doctorName: 'Dra. Helena Duarte (cardiologista)',
        dateTime: `${dateKey}T10:30`,
        location: 'Clínica Vida, sala 204',
        reason: 'Reavaliação da pressão e dos exames',
        notes: 'Levar lista de medicamentos e o laudo mais recente.',
        reminderOffset: 60,
        notifiedOffsets: [],
        createdAt: now.toISOString(),
    }];
}
