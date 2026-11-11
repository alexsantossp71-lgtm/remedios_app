
import type { AdherenceAnalysis } from './adherenceInsights';
import { loadJson, saveJson, STORAGE_KEYS } from '../storage';

// ===== Cache das análises de adesão geradas por IA =====
// Chave = fingerprint do relatório (muda quando o histórico muda), então o
// cache nunca exibe análise de dados antigos. Teto de 12 entradas descarta
// as mais antigas para não crescer sem fim.

const MAX_ENTRIES = 12;

type InsightMap = Record<string, AdherenceAnalysis>;

const isInsightMap = (value: unknown): boolean =>
    typeof value === 'object' && value !== null && !Array.isArray(value) &&
    Object.values(value as Record<string, unknown>).every(
        (analysis) =>
            typeof analysis === 'object' && analysis !== null && !Array.isArray(analysis) &&
            typeof (analysis as Record<string, unknown>).summary === 'string'
    );

/** Devolve a análise em cache para o fingerprint; `null` quando não há. */
export function getCachedAnalysis(fingerprint: string): AdherenceAnalysis | null {
    if (!fingerprint) return null;
    const map = loadJson<InsightMap>(STORAGE_KEYS.adherenceInsights, isInsightMap);
    return map && map[fingerprint] ? map[fingerprint] : null;
}

/** Salva/atualiza a análise, descartando as mais antigas acima do teto. */
export function storeAnalysis(fingerprint: string, analysis: AdherenceAnalysis): void {
    if (!fingerprint) return;
    const map = loadJson<InsightMap>(STORAGE_KEYS.adherenceInsights, isInsightMap) ?? {};
    map[fingerprint] = analysis;
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) {
        for (const oldKey of keys.slice(0, keys.length - MAX_ENTRIES)) delete map[oldKey];
    }
    saveJson(STORAGE_KEYS.adherenceInsights, map);
}
