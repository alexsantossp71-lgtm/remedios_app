
import type { MedicationGuide } from '../services/nvidiaService';
import { loadJson, saveJson, STORAGE_KEYS } from '../storage';

// ===== Cache das explicações de medicamento ("bula simplificada") =====
// Evita repetir a chamada à API da NVIDIA para o mesmo medicamento no mesmo
// dispositivo. Chave = nome + dosagem + instruções (minúsculas) e o teto de
// 40 entradas descarta as mais antigas para não crescer sem fim.

const MAX_ENTRIES = 40;

/** Chave do cache: ignora maiúsculas/espaços extras (" Losartana " == "losartana"). */
export function guideCacheKey(medicationName: string, dosage?: string, instructions?: string): string {
    return [medicationName, dosage ?? '', instructions ?? '']
        .map((part) => part.trim().toLowerCase())
        .join('|');
}

type GuideMap = Record<string, MedicationGuide>;

const isGuideMap = (value: unknown): boolean =>
    typeof value === 'object' && value !== null && !Array.isArray(value) &&
    Object.values(value as Record<string, unknown>).every(
        (guide) =>
            typeof guide === 'object' && guide !== null && !Array.isArray(guide) &&
            typeof (guide as Record<string, unknown>).whatFor === 'string'
    );

/** Devolve a explicação em cache para a chave; `null` quando não há. */
export function getCachedGuide(key: string): MedicationGuide | null {
    if (!key) return null;
    const map = loadJson<GuideMap>(STORAGE_KEYS.guides, isGuideMap);
    return map && map[key] ? map[key] : null;
}

/** Salva/atualiza a explicação, descartando as mais antigas acima do teto. */
export function storeGuide(key: string, guide: MedicationGuide): void {
    if (!key) return;
    const map = loadJson<GuideMap>(STORAGE_KEYS.guides, isGuideMap) ?? {};
    map[key] = guide;
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) {
        for (const oldKey of keys.slice(0, keys.length - MAX_ENTRIES)) delete map[oldKey];
    }
    saveJson(STORAGE_KEYS.guides, map);
}
