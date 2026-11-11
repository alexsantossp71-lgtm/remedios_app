
// Guardião da dose: compara o medicamento que a IA leu na embalagem
// fotografada com o medicamento do lembrete disparado. A decisão final é
// sempre do usuário — aqui só produzimos um veredito claro para a interface.

export interface MedicationIdResult {
    /** Nome lido na embalagem ('' quando ilegível). */
    medication: string;
    confidence: 'alta' | 'media' | 'baixa';
    detail: string;
}

export type GuardianVerdictKind = 'match' | 'mismatch' | 'unsure';

export interface GuardianVerdict {
    kind: GuardianVerdictKind;
    detected: string;
    expected: string;
}

/** Minúsculas, sem acentos e sem pontuação; só letras/números/espaços. */
export function normalizeMedicationName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Confere se o nome lido na embalagem corresponde ao esperado:
 * - um contém o outro ("Dipirona 500mg" vs "dipirona");
 * - ou compartilham uma palavra significativa (≥ 4 letras).
 * Evita falso positivo com palavras genéricas ("comprimido", "mg").
 */
export function medicationMatches(detected: string, expected: string): boolean {
    const a = normalizeMedicationName(detected);
    const b = normalizeMedicationName(expected);
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;

    const generic = new Set(['comprimido', 'comprimidos', 'comprim', 'drageia', 'capsula', 'capsulas', 'mg', 'ml', 'mcg', 'g', 'gotas', 'suspendivel', 'solucao', 'uso', 'oral', 'orais']);
    const tokensA = a.split(' ').filter((t) => t.length >= 4 && !generic.has(t));
    const tokensB = b.split(' ').filter((t) => t.length >= 4 && !generic.has(t));
    return tokensA.some((token) => tokensB.includes(token));
}

/**
 * Veredito para a interface. Confiância "baixa" ou nome ilegível → 'unsure'
 * (a IA pode errar; o usuário confere manualmente).
 */
export function guardianVerdict(
    detectedMedication: string,
    expectedMedication: string,
    confidence: MedicationIdResult['confidence']
): GuardianVerdict {
    const detected = detectedMedication.trim();
    if (!detected || confidence === 'baixa') {
        return { kind: 'unsure', detected, expected: expectedMedication };
    }
    return medicationMatches(detected, expectedMedication)
        ? { kind: 'match', detected, expected: expectedMedication }
        : { kind: 'mismatch', detected, expected: expectedMedication };
}

/**
 * Normaliza a resposta da IA de identificação; nunca lança.
 * confidence fora das opções vira 'baixa'.
 */
export function sanitizeMedicationId(value: unknown): MedicationIdResult {
    const record = (
        typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}
    ) as Record<string, unknown>;
    const raw = record.confidence;
    const confidence: MedicationIdResult['confidence'] =
        raw === 'alta' ? 'alta' : raw === 'media' || raw === 'média' ? 'media' : 'baixa';
    return {
        medication: typeof record.medication === 'string' ? record.medication.trim().slice(0, 120) : '',
        confidence,
        detail: typeof record.detail === 'string' ? record.detail.trim().slice(0, 200) : '',
    };
}
