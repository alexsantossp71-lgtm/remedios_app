
import { formatDateBR, parseLocalDate } from './datetime';

// ===== Receita médica → lembretes =====
// A IA (nvidiaService) devolve entradas brutas lidas da receita (foto ou
// texto); este módulo sanitiza os dados e converte cada medicamento em um
// rascunho de lembrete. Tudo é puro e testável (Vitest), sem rede nem DOM.

/** Dados brutos de um medicamento extraído por IA de uma receita. */
export interface PrescriptionEntry {
    medicationName: string;
    dosage: string;
    instructions: string;
    /** Duração total do tratamento em dias; 0 = uso contínuo ou não informado. */
    durationDays: number;
    /** Intervalo entre doses em horas ("8/8h" → 8); 0 quando não se aplica. */
    intervalHours: number;
    /** Doses por dia ("3x ao dia" → 3); 0 quando não se aplica. */
    timesPerDay: number;
    /** Horários explícitos na receita, normalizados 'HH:MM'; vazio quando não há. */
    times: string[];
    /** Data de início escrita na receita ('YYYY-MM-DD'); '' quando ausente. */
    startDate: string;
}

/** Lembrete pronto para o app (falta apenas id/history/createdAt, feitos no App). */
export interface ReminderDraft {
    medicationName: string;
    dosage: string;
    instructions: string;
    startDate: string;
    duration: { type: 'days' | 'continuous'; days: number };
    frequency: { type: 'daily' | 'interval'; days: number };
    times: string[];
}

const MAX_NAME = 120;
const MAX_TEXT = 200;
const MAX_ENTRIES = 15;
const MAX_TIMES = 12;
const MAX_INTERVAL_HOURS = 72;
const MAX_DURATION_DAYS = 365;

const clipText = (value: unknown, max: number): string =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';

const clampInt = (value: unknown, max: number): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.min(max, Math.max(0, Math.floor(value)));
    }
    if (typeof value === 'string') {
        const parsed = parseInt(value.trim(), 10);
        if (Number.isFinite(parsed)) return Math.min(max, Math.max(0, parsed));
    }
    return 0;
};

/** Aceita 'HH:MM' (com 1 dígito na hora) e devolve 'HH:MM' padronizado; '' se inválido. */
const cleanTime = (value: unknown): string => {
    const match = typeof value === 'string' ? /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value) : null;
    if (!match) return '';
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return '';
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const isValidDateString = (value: string): boolean =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) && parseLocalDate(value) !== null;

/**
 * Valida e normaliza a lista devolvida pela IA: descarta itens sem nome,
 * força tipos, limita tamanhos e remove horários inválidos/duplicados.
 * Nunca lança — entrada inesperada devolve lista vazia.
 */
export function sanitizePrescriptionEntries(value: unknown): PrescriptionEntry[] {
    if (!Array.isArray(value)) return [];
    const entries: PrescriptionEntry[] = [];
    for (const raw of value.slice(0, MAX_ENTRIES)) {
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue;
        const record = raw as Record<string, unknown>;
        const medicationName = clipText(record.medicationName, MAX_NAME);
        if (!medicationName) continue;

        const times: string[] = [];
        if (Array.isArray(record.times)) {
            for (const item of record.times.slice(0, MAX_TIMES)) {
                const time = cleanTime(item);
                if (time && !times.includes(time)) times.push(time);
            }
        }

        const startDate = clipText(record.startDate, 10);
        entries.push({
            medicationName,
            dosage: clipText(record.dosage, MAX_TEXT),
            instructions: clipText(record.instructions, MAX_TEXT),
            durationDays: clampInt(record.durationDays, MAX_DURATION_DAYS),
            intervalHours: clampInt(record.intervalHours, MAX_INTERVAL_HOURS),
            timesPerDay: clampInt(record.timesPerDay, MAX_TIMES),
            times,
            startDate: isValidDateString(startDate) ? startDate : '',
        });
    }
    return entries;
}

/** Distribui `count` doses começando em `first` com passo de `stepHours` horas. */
export function spreadTimes(first: string, stepHours: number, count: number): string[] {
    const match = /^(\d{1,2}):(\d{2})$/.exec(first.trim());
    const startHour = match ? Number(match[1]) % 24 : 8;
    const startMinute = match ? Number(match[2]) % 60 : 0;
    const step = Math.max(1, Math.floor(stepHours));
    const total = Math.max(1, Math.floor(count));

    const times: string[] = [];
    for (let i = 0; i < total; i++) {
        const hour = (startHour + i * step) % 24;
        const time = `${String(hour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
        if (!times.includes(time)) times.push(time);
    }
    return times.sort();
}

/**
 * Converte uma entrada da receita em rascunho de lembrete.
 * `defaultStartDate` (hoje, no App) entra quando a receita não traz data
 * válida. Devolve `null` para entrada sem nome de medicamento.
 *
 * Regras de horários/frequência:
 * - horários explícitos na receita → usados como estão (diário);
 * - intervalo ≥ 24 h ("cada 2 dias") → frequência por dias;
 * - intervalo < 24 h ("8/8h") → diário com N doses distribuídas das 08:00;
 * - "3x ao dia" → diário com N doses igualmente espaçadas;
 * - nada informado → diário às 08:00 (usuário ajusta depois).
 */
export function entryToReminderDraft(entry: PrescriptionEntry, defaultStartDate: string): ReminderDraft | null {
    const medicationName = entry.medicationName.trim();
    if (!medicationName) return null;

    const startDate = isValidDateString(entry.startDate) ? entry.startDate : defaultStartDate;

    const durationDays = Math.max(0, Math.floor(entry.durationDays));
    const duration: ReminderDraft['duration'] =
        durationDays > 0
            ? { type: 'days', days: Math.min(MAX_DURATION_DAYS, durationDays) }
            : { type: 'continuous', days: 0 };

    const entryTimes = entry.times.filter((time) => /^\d{2}:\d{2}$/.test(time)).sort();
    const intervalHours = Math.max(0, Math.floor(entry.intervalHours));
    const timesPerDay = Math.max(0, Math.floor(entry.timesPerDay));

    let frequency: ReminderDraft['frequency'] = { type: 'daily', days: 1 };
    let times: string[] = entryTimes;

    if (intervalHours >= 24) {
        frequency = { type: 'interval', days: Math.min(30, Math.max(1, Math.round(intervalHours / 24))) };
        if (times.length === 0) times = ['08:00'];
    } else if (times.length > 0) {
        // Horários explícitos: uso direto com frequência diária.
    } else if (intervalHours > 0) {
        // "8/8h" → 24/8 = 3 doses ao dia a partir das 08:00.
        const count = Math.max(1, Math.round(24 / intervalHours));
        times = spreadTimes('08:00', intervalHours, count);
    } else if (timesPerDay > 0) {
        const count = Math.min(MAX_TIMES, timesPerDay);
        times = spreadTimes('08:00', Math.floor(24 / count), count);
    } else {
        times = ['08:00'];
    }

    return {
        medicationName,
        dosage: entry.dosage.trim(),
        instructions: entry.instructions.trim(),
        startDate,
        duration,
        frequency,
        times,
    };
}

/** Sanitiza + converte em lote, descartando entradas inválidas. */
export function draftsFromPrescription(entries: PrescriptionEntry[], defaultStartDate: string): ReminderDraft[] {
    return entries
        .map((entry) => entryToReminderDraft(entry, defaultStartDate))
        .filter((draft): draft is ReminderDraft => draft !== null);
}

/** Resumo legível do rascunho para a prévia de importação ("Por 7 dias · todos os dias · 08:00, 16:00, 00:00 · início 12/11/2026"). */
export function describeDraft(draft: ReminderDraft): string {
    const duration =
        draft.duration.type === 'continuous' ? 'Uso contínuo' : `Por ${draft.duration.days} dia(s)`;
    const frequency =
        draft.frequency.type === 'interval' ? `a cada ${draft.frequency.days} dia(s)` : 'todos os dias';
    return `${duration} · ${frequency} · ${draft.times.join(', ')} · início ${formatDateBR(draft.startDate)}`;
}
