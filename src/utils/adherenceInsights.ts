
// Análise de adesão por IA: constrói um relatório compacto a partir do
// histórico que o app JÁ registra (history['YYYY-MM-DD']['HH:MM']) e
// normaliza a resposta do modelo. Funções puras, sem rede nem DOM.

import { Reminder } from '../types';
import { expectedTimesForDay } from './adherence';
import { toDateKey } from './datetime';

export interface GapGroup {
    label: string; // "Noite (18h–23h)", "segunda-feira", nome do medicamento
    missed: number;
    expected: number;
}

export interface AdherenceWindow {
    expected: number;
    taken: number;
    missed: number;
    /** Maiores concentrações de doses não tomadas, só grupos com perda. */
    byTime: GapGroup[];
    byWeekday: GapGroup[]; // vazio na janela de 7 dias (cada dia aparece 1 vez)
    byMedication: GapGroup[];
}

export interface AdherenceReport {
    last7: AdherenceWindow;
    last30: AdherenceWindow;
}

export interface AdherenceInsight {
    title: string;
    detail: string;
    suggestion: string;
}

export interface AdherenceAnalysis {
    summary: string;
    insights: AdherenceInsight[];
}

const WEEKDAYS = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado',
];

const TIME_BUCKETS: Array<{ label: string; from: number; to: number }> = [
    { label: 'Madrugada (0h–5h)', from: 0, to: 5 },
    { label: 'Manhã (6h–11h)', from: 6, to: 11 },
    { label: 'Tarde (12h–17h)', from: 12, to: 17 },
    { label: 'Noite (18h–23h)', from: 18, to: 23 },
];

const bucketOf = (time: string): string => {
    const hour = Number(time.split(':')[0] ?? 0);
    const bucket = TIME_BUCKETS.find((b) => hour >= b.from && hour <= b.to);
    return bucket ? bucket.label : 'Horário indefinido';
};

const MAX_GROUPS = 8;

const topGroups = (map: Map<string, { missed: number; expected: number }>): GapGroup[] =>
    Array.from(map.entries())
        .map(([label, counts]) => ({ label, ...counts }))
        .filter((group) => group.missed > 0)
        .sort((a, b) => b.missed - a.missed || b.expected - a.expected)
        .slice(0, MAX_GROUPS)
        .map(({ label, missed, expected }) => ({ label, missed, expected }));

const EMPTY_MAP = (): Map<string, { missed: number; expected: number }> => new Map();

const bump = (map: Map<string, { missed: number; expected: number }>, label: string, missed: boolean): void => {
    const entry = map.get(label) ?? { missed: 0, expected: 0 };
    entry.expected += 1;
    if (missed) entry.missed += 1;
    map.set(label, entry);
};

/**
 * Agrega as doses não tomadas da janela por faixa de horário, dia da semana
 * e medicamento. "Não tomada" = pulada OU nunca respondida (esquecida);
 * doses ainda pendentes de hoje contam como esperadas, não como perda.
 */
function buildWindow(reminders: Reminder[], days: number, now: Date, withWeekday: boolean): AdherenceWindow {
    const byTime = EMPTY_MAP();
    const byWeekday = EMPTY_MAP();
    const byMedication = EMPTY_MAP();
    const window: AdherenceWindow = {
        expected: 0,
        taken: 0,
        missed: 0,
        byTime: [],
        byWeekday: [],
        byMedication: [],
    };

    for (let offset = days - 1; offset >= 0; offset--) {
        const day = new Date(now);
        day.setDate(day.getDate() - offset);
        const key = toDateKey(day);

        reminders.forEach((reminder) => {
            const dayHistory = reminder.history[key] ?? {};
            expectedTimesForDay(reminder, day, now).forEach((time) => {
                const taken = dayHistory[time] === 'taken';
                window.expected += 1;
                if (taken) {
                    window.taken += 1;
                    return;
                }
                window.missed += 1;
                bump(byTime, bucketOf(time), true);
                bump(byMedication, reminder.medicationName, true);
                if (withWeekday) {
                    bump(byWeekday, WEEKDAYS[day.getDay()], true);
                }
            });
        });
    }

    window.byTime = topGroups(byTime);
    window.byWeekday = withWeekday ? topGroups(byWeekday) : [];
    window.byMedication = topGroups(byMedication);
    return window;
}

/** Relatório completo (7 e 30 dias) enviado à IA como dado estruturado. */
export function buildAdherenceReport(reminders: Reminder[], now: Date = new Date()): AdherenceReport {
    return {
        last7: buildWindow(reminders, 7, now, false),
        last30: buildWindow(reminders, 30, now, true),
    };
}

/** Resumo curto para exibir no card ("84% nos últimos 30 dias"). */
export function describeWindow(window: AdherenceWindow): string {
    if (window.expected === 0) return 'sem doses programadas';
    const pct = Math.round((window.taken / window.expected) * 100);
    return `${pct}% (${window.taken} de ${window.expected})`;
}

const clipText = (value: unknown, max: number): string =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';

/**
 * Normaliza a resposta da IA; nunca lança — entrada estranha vira análise
 * vazia (o componente mostra "sem insights" em vez de quebrar).
 */
export function sanitizeAdherenceAnalysis(value: unknown): AdherenceAnalysis {
    const record = (
        typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}
    ) as Record<string, unknown>;

    const insights = (Array.isArray(record.insights) ? record.insights : [])
        .filter((item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null && !Array.isArray(item))
        .map((item) => ({
            title: clipText(item.title, 120),
            detail: clipText(item.detail, 400),
            suggestion: clipText(item.suggestion, 300),
        }))
        .filter((item) => item.title || item.detail)
        .slice(0, 6);

    return { summary: clipText(record.summary, 300), insights };
}

// ===== Fingerprint do relatório (chave do cache) =====
// djb2 sobre o JSON: muda 1 dose respondida → chave nova → re-analisa.

export function reportFingerprint(report: AdherenceReport): string {
    const json = JSON.stringify(report);
    let hash = 5381;
    for (let i = 0; i < json.length; i++) {
        hash = ((hash << 5) + hash + json.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
}
