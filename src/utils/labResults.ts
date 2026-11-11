
// Laudos de laboratório: converte a resposta da IA em valores estruturados,
// compara cada valor com a faixa de referência (no app, nunca na IA) e
// calcula a evolução de exames repetidos. Funções puras e testáveis.

import type { LabValue } from '../types';

export interface RawLabValue {
    examName?: unknown;
    value?: unknown;
    unit?: unknown;
    reference?: unknown;
}

export interface LabScanResult {
    labName: string;
    examDate: string; // 'YYYY-MM-DD' ou ''
    values: LabValue[];
}

const MAX_VALUES = 40;

const clip = (value: unknown, max: number): string =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';

/**
 * Converte texto de valor em número aceitando o padrão brasileiro:
 * vírgula como decimal ("5,4"), ponto como decimal ("5.4") e ponto de
 * milhar ("10.200" → 10200) quando o agrupamento indica milhar.
 */
export function parseNumericValue(text: string): number | null {
    const trimmed = text.trim().replace(/\s/g, '');
    if (!trimmed) return null;
    const hasComma = trimmed.includes(',');
    const hasDot = trimmed.includes('.');

    let normalized = trimmed;
    if (hasComma && hasDot) {
        // "10.200,45" → remove pontos de milhar, vírgula vira decimal.
        normalized = trimmed.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
        // Só vírgula: pode ser decimal ("5,4") ou milhar sem ponto ("5,400" não é comum) → decimal.
        normalized = trimmed.replace(',', '.');
    } else if (hasDot) {
        const groups = trimmed.split('.');
        // "10.200" (uma vírgula inexistente, grupo final de 3 dígitos e mais de um grupo) → milhar.
        const looksThousands = groups.length > 1 && groups.slice(1).every((g) => /^\d{3}$/.test(g));
        normalized = looksThousands ? trimmed.replace(/\./g, '') : trimmed;
    }

    const parsed = Number.parseFloat(normalized.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Interpreta a faixa de referência escrita no laudo:
 * "70 - 99", "70 a 99", "entre 70 e 99", "até 100", "< 100", "≤ 100",
 * "≥ 4,0", "> 4,0", "0,9-1,3". Devolve os limites que conseguir extrair.
 */
export function parseReferenceText(text: string): { low: number | null; high: number | null } {
    const cleaned = text.trim();
    if (!cleaned) return { low: null, high: null };

    // Faixa completa: dois números separados por '-', 'a', 'e', 'até'.
    const rangeMatch = /(\d+(?:[.,]\d+)?)\s*(?:-|–|a|até|e)\s*(\d+(?:[.,]\d+)?)/i.exec(cleaned);
    if (rangeMatch) {
        const low = parseNumericValue(rangeMatch[1]);
        const high = parseNumericValue(rangeMatch[2]);
        if (low !== null && high !== null) return { low, high };
    }

    // "até X" / "< X" / "≤ X" → só limite superior.
    const upperMatch = /(?:até|<|≤|menor que|max(?:imo)?)\s*(\d+(?:[.,]\d+)?)/i.exec(cleaned);
    if (upperMatch) {
        const high = parseNumericValue(upperMatch[1]);
        if (high !== null) return { low: null, high };
    }

    // "≥ X" / "> X" / "a partir de X" → só limite inferior.
    const lowerMatch = /(?:>|≥|>=|maior que|a partir de|min(?:imo)?)\s*(\d+(?:[.,]\d+)?)/i.exec(cleaned);
    if (lowerMatch) {
        const low = parseNumericValue(lowerMatch[1]);
        if (low !== null) return { low, high: null };
    }

    return { low: null, high: null };
}

/** Compara o valor com a faixa (no app; a IA NÃO opina sobre resultado). */
export function flagOf(
    numericValue: number | null,
    low: number | null,
    high: number | null
): LabValue['flag'] {
    if (numericValue === null || (low === null && high === null)) return '';
    if (low !== null && numericValue < low) return 'low';
    if (high !== null && numericValue > high) return 'high';
    return 'normal';
}

const isValidDate = (value: string): boolean =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00`).getTime());

/**
 * Normaliza a resposta da IA para um laudo; nunca lança. Valores sem nome
 * de exame são descartados; flags são calculadas aqui, com a faixa que a
 * IA apenas transcreveu.
 */
export function sanitizeLabScan(value: unknown): LabScanResult {
    const record = (
        typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}
    ) as Record<string, unknown>;

    const listRaw = Array.isArray(record.resultados)
        ? record.resultados
        : Array.isArray(record.values)
            ? record.values
            : [];

    const values: LabValue[] = [];
    for (const raw of (listRaw as RawLabValue[]).slice(0, MAX_VALUES)) {
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue;
        const examName = clip(raw.examName, 120);
        if (!examName) continue;
        const valueText = clip(raw.value, 60);
        const referenceText = clip(raw.reference, 80);
        const numericValue = valueText ? parseNumericValue(valueText) : null;
        const { low, high } = parseReferenceText(referenceText);
        values.push({
            examName,
            valueText,
            numericValue,
            unit: clip(raw.unit, 30),
            referenceLow: low,
            referenceHigh: high,
            referenceText,
            flag: flagOf(numericValue, low, high),
        });
    }

    const examDate = clip(record.examDate, 10);
    return {
        labName: clip(record.labName, 120),
        examDate: isValidDate(examDate) ? examDate : '',
        values,
    };
}

/** Agrupa laudos repetidos pelo nome do exame ignorando maiúsculas/acentos. */
export function normalizeExamName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

export interface LabResultLike {
    date: string;
    labName?: string;
    values: LabValue[];
}

export interface TrendEntry {
    date: string;
    labName: string;
    value: number;
    unit: string;
}

export interface ExamTrend {
    examName: string; // nome mais recente usado pelo usuário
    entries: TrendEntry[];
    first: TrendEntry | null;
    last: TrendEntry | null;
    /** Variação percentual do primeiro para o último; null sem número válido. */
    pctChange: number | null;
    direction: 'up' | 'down' | 'stable';
}

const MIN_CHANGE_PCT = 2;

/**
 * Histórico por exame (nome normalizado), com valores numéricos ordenados
 * por data e a variação do primeiro para o último resultado.
 */
export function computeTrends(results: LabResultLike[]): ExamTrend[] {
    const groups = new Map<string, { displayName: string; entries: TrendEntry[] }>();

    results.forEach((result) => {
        const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(result.date) ? result.date : '';
        if (!dateKey) return;
        result.values.forEach((value) => {
            if (value.numericValue === null) return;
            const key = normalizeExamName(value.examName);
            if (!key) return;
            const group = groups.get(key) ?? { displayName: value.examName, entries: [] };
            group.entries.push({
                date: dateKey,
                labName: result.labName ?? '',
                value: value.numericValue,
                unit: value.unit ?? '',
            });
            groups.set(key, group);
        });
    });

    const trends: ExamTrend[] = [];
    groups.forEach((group) => {
        if (group.entries.length < 2) return;
        const entries = [...group.entries].sort((a, b) => a.date.localeCompare(b.date));
        const first = entries[0];
        const last = entries[entries.length - 1];
        const pctChange =
            first.value !== 0 ? Math.round(((last.value - first.value) / Math.abs(first.value)) * 100) : null;
        const direction =
            pctChange === null || Math.abs(pctChange) < MIN_CHANGE_PCT
                ? 'stable'
                : pctChange > 0
                    ? 'up'
                    : 'down';
        trends.push({ examName: group.displayName, entries, first, last, pctChange, direction });
    });

    trends.sort((a, b) => (b.last?.date ?? '').localeCompare(a.last?.date ?? ''));
    return trends.slice(0, 12);
}

/** "Glicemia: 95 → 110 mg/dL (subiu ~16%) entre 12/03/2026 e 10/11/2026". */
export function describeTrend(trend: ExamTrend): string {
    if (!trend.first || !trend.last || trend.pctChange === null) {
        return `${trend.examName}: histórico com ${trend.entries.length} resultado(s).`;
    }
    const arrow = `${formatNumberBR(trend.first.value)} → ${formatNumberBR(trend.last.value)}`;
    const unit = trend.last.unit ? ` ${trend.last.unit}` : '';
    const verb = trend.direction === 'up' ? 'subiu' : trend.direction === 'down' ? 'caiu' : 'mudou';
    return `${trend.examName}: ${arrow}${unit} (${verb} ~${Math.abs(trend.pctChange)}%) entre ${formatDateBRShort(trend.first.date)} e ${formatDateBRShort(trend.last.date)}`;
}

const formatNumberBR = (value: number): string =>
    Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',');

const formatDateBRShort = (iso: string): string => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
};
