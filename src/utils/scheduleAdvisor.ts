
// Agendamento inteligente (item 10 da Camada 3): a IA sugere redistribuir os
// horários das doses respeitando jejum e intervalos. Este módulo é puro e
// testável: monta o bloco de dados enviado ao modelo, sanitiza a resposta e
// calcula diffs/mínimos de intervalo que a interface usa para revisar e
// aplicar as mudanças. A decisão final é sempre do usuário.

import { normalizeMedicationName } from './medicationCheck';

export interface ScheduleAdvisorMed {
    id: string;
    name: string;
    dosage: string;
    instructions: string;
    /** Horários atuais 'HH:MM' (ordenados pelo chamador ou não). */
    times: string[];
    /** 1 = todos os dias; N = a cada N dias. */
    frequencyDays: number;
    /** Uso contínuo (sem data de fim). */
    continuous: boolean;
}

export interface TimeChange {
    from: string;
    to: string;
}

export interface ScheduleSuggestion {
    medicationId: string;
    medicationName: string;
    /** Horários sugeridos, normalizados 'HH:MM', ordenados. */
    suggestedTimes: string[];
    reason: string;
    warnings: string[];
    /** true quando os horários sugeridos diferem dos atuais. */
    changed: boolean;
    /** Mudanças individuais (por posição após ordenar). */
    changes: TimeChange[];
    /** Menor intervalo entre doses sugeridas em minutos (inclui a virada da
     * meia-noite); null quando há menos de 2 horários. */
    minGapMinutes: number | null;
}

export interface ScheduleAdvice {
    summary: string;
    suggestions: ScheduleSuggestion[];
}

const MAX_SUGGESTIONS = 15;
const MAX_TIMES = 8;
const MAX_WARNINGS = 4;

const clipText = (value: unknown, max: number): string =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';

/** Aceita 'HH:MM' (com 1 dígito na hora) e devolve 'HH:MM' padronizado; '' se inválido. */
export function cleanAdvisorTime(value: unknown): string {
    const match = typeof value === 'string' ? /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value) : null;
    if (!match) return '';
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return '';
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** 'HH:MM' → minutos desde a meia-noite; null se inválido. */
export function timeToMinutes(time: string): number | null {
    const clean = cleanAdvisorTime(time);
    if (!clean) return null;
    const [hours, minutes] = clean.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Menor intervalo entre as doses de um dia, em minutos. Compara pares
 * consecutivos ordenados E a virada da meia-noite (última → primeira do dia
 * seguinte), que é o que importa para esquemas tipo "8/8h".
 */
export function minGapMinutes(times: string[]): number | null {
    const minutes = times
        .map(timeToMinutes)
        .filter((value): value is number => value !== null)
        .sort((a, b) => a - b);
    if (minutes.length < 2) return null;
    let min = Infinity;
    for (let i = 1; i < minutes.length; i++) {
        min = Math.min(min, minutes[i] - minutes[i - 1]);
    }
    const wrapGap = 24 * 60 - (minutes[minutes.length - 1] - minutes[0]);
    return Math.min(min, wrapGap);
}

/** Horários atuais e sugeridos são a mesma lista (ordem irrelevante)? */
const sameTimes = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((time, index) => time === sortedB[index]);
};

/** Diferenças por posição (listas ordenadas): o que mudou de horário. */
export function diffTimes(current: string[], suggested: string[]): TimeChange[] {
    const sortedCurrent = [...current].sort();
    const sortedSuggested = [...suggested].sort();
    const changes: TimeChange[] = [];
    for (let i = 0; i < sortedCurrent.length; i++) {
        const from = sortedCurrent[i];
        const to = sortedSuggested[i];
        if (from && to && from !== to) changes.push({ from, to });
    }
    return changes;
}

/** Lista final de horários sugeridos: válidos, sem repetição, ordenados. */
const cleanTimes = (raw: unknown): string[] => {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    for (const item of raw) {
        const clean = cleanAdvisorTime(item);
        if (clean) seen.add(clean);
        if (seen.size >= MAX_TIMES) break;
    }
    return [...seen].sort();
};

/**
 * Normaliza a resposta da IA; nunca lança. Só entram sugestões cujo
 * medicationId (ou, por fallback, nome normalizado) corresponde a um lembrete
 * conhecido — a IA não pode criar nem remover medicamentos por este caminho.
 */
export function sanitizeScheduleAdvice(value: unknown, medications: ScheduleAdvisorMed[]): ScheduleAdvice {
    const record =
        typeof value === 'object' && value !== null && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};

    const byId = new Map(medications.map((med) => [med.id, med]));
    const findByName = (name: string): ScheduleAdvisorMed | undefined => {
        const clean = normalizeMedicationName(name);
        return medications.find((med) => normalizeMedicationName(med.name) === clean);
    };

    const suggestions: ScheduleSuggestion[] = [];
    const rawList = Array.isArray(record.suggestions) ? (record.suggestions as unknown[]) : [];
    for (const raw of rawList.slice(0, MAX_SUGGESTIONS)) {
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue;
        const item = raw as Record<string, unknown>;

        const id = clipText(item.medicationId, 80);
        const name = clipText(item.medicationName, 120);
        const med = (id && byId.get(id)) || (name ? findByName(name) : undefined);
        if (!med) continue;

        const suggestedTimes = cleanTimes(item.suggestedTimes);
        if (!suggestedTimes.length) continue;

        const warnings = (Array.isArray(item.warnings) ? item.warnings : [])
            .filter((warning): warning is string => typeof warning === 'string' && warning.trim().length > 0)
            .map((warning) => warning.trim().slice(0, 200))
            .slice(0, MAX_WARNINGS);

        // Verificações determinísticas do app (não dependem da honestidade da IA):
        if (suggestedTimes.length !== med.times.length) {
            warnings.unshift(
                `A IA sugeriu ${suggestedTimes.length} dose(s), mas este lembrete tem ${med.times.length}. Confira antes de aplicar.`
            );
        }
        const gap = minGapMinutes(suggestedTimes);
        if (gap !== null && gap < 60) {
            warnings.push(
                `Intervalo mínimo entre doses de apenas ${Math.floor(gap / 60)}h${String(gap % 60).padStart(2, '0')} — confirme o que foi prescrito.`
            );
        }

        suggestions.push({
            medicationId: med.id,
            medicationName: med.name,
            suggestedTimes,
            reason: clipText(item.reason, 400),
            warnings: [...new Set(warnings)],
            changed: !sameTimes(med.times, suggestedTimes),
            changes: diffTimes(med.times, suggestedTimes),
            minGapMinutes: gap,
        });
    }

    return { summary: clipText(record.summary, 400), suggestions };
}

/**
 * Bloco de dados dos lembretes enviado ao modelo: uma linha por medicamento,
 * com id estável (a resposta referencia o id e não o nome).
 */
export function buildScheduleDataBlock(medications: ScheduleAdvisorMed[]): string {
    const lines = medications.map((med) => {
        const frequency = med.frequencyDays > 1 ? `a cada ${med.frequencyDays} dias` : 'todos os dias';
        const duration = med.continuous ? 'uso contínuo' : 'por prazo determinado';
        const parts = [
            `[${med.id}]`,
            med.name,
            med.dosage || 'dosagem não informada',
            `instruções: ${med.instructions || 'nenhuma'}`,
            frequency,
            duration,
            `horários atuais: ${med.times.length ? med.times.join(', ') : 'nenhum'}`,
        ];
        return `- ${parts.join(' | ')}`;
    });
    return `Medicamentos do paciente (id | nome | dosagem | instruções | frequência | duração | horários atuais):\n${lines.join('\n')}`;
}
