
import { describe, it, expect } from 'vitest';
import { decideBootRoute } from './boot';
import { buildDemoReminders, buildDemoAppointments, toDateKey, fromDateTime } from './demoData';
import { isReminderArray, isAppointmentArray } from '../storage';
import { ReminderStatus } from '../types';

describe('decideBootRoute', () => {
    const base = { hasProfile: false, hasData: false, onboarded: false };

    it('primeiro uso vê a splash com Demo e Iniciar', () => {
        expect(decideBootRoute(base)).toBe('splash');
    });

    it('perfil cadastrado vai direto para as doses do dia', () => {
        expect(decideBootRoute({ ...base, hasProfile: true })).toBe('app');
    });

    it('flag de onboarding concluído pula a splash', () => {
        expect(decideBootRoute({ ...base, onboarded: true })).toBe('app');
    });

    it('usuários antigos com dados reais não veem splash nem cadastro', () => {
        expect(decideBootRoute({ ...base, hasData: true })).toBe('app');
    });
});

describe('dados de demonstração', () => {
    const now = new Date(2026, 10, 24, 15, 30, 0); // 24/11/2026 15:30 local

    it('lembretes demo passam na validação real do app', () => {
        const reminders = buildDemoReminders(now);
        expect(reminders).toHaveLength(3);
        expect(isReminderArray(reminders)).toBe(true);
    });

    it('uso contínuo, histórico de ontem marcado como tomado', () => {
        const reminders = buildDemoReminders(now);
        const losartana = reminders.find((r) => r.medicationName.startsWith('Losartana'))!;
        expect(losartana.duration.type).toBe('continuous');
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        expect(losartana.history[toDateKey(yesterday)]['08:00']).toBe(ReminderStatus.TAKEN);
    });

    it('dose de hoje só entra no histórico se o horário já passou', () => {
        const reminders = buildDemoReminders(now);
        const losartana = reminders.find((r) => r.medicationName.startsWith('Losartana'))!;
        // 15:30 > 08:00 → dose de hoje das 08:00 tomada
        expect(losartana.history[toDateKey(now)]['08:00']).toBe(ReminderStatus.TAKEN);
        const omeprazol = reminders.find((r) => r.medicationName.startsWith('Omeprazol'))!;
        // 07:00 < 15:30 → também tomada; próxima dose só amanhã
        expect(omeprazol.history[toDateKey(now)]['07:00']).toBe(ReminderStatus.TAKEN);
    });

    it('consulta demo fica no futuro e passa na validação do app', () => {
        const appointments = buildDemoAppointments(now);
        expect(appointments).toHaveLength(1);
        expect(isAppointmentArray(appointments)).toBe(true);
        expect(fromDateTime(toDateKey(now), '23:59').getTime()).toBeGreaterThanOrEqual(now.getTime() - 60_000);
        const when = fromDateTime(appointments[0].dateTime.slice(0, 10), appointments[0].dateTime.slice(11, 16));
        expect(when.getTime()).toBeGreaterThan(now.getTime());
    });
});
