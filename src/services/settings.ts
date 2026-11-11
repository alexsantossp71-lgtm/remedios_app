
import { useEffect, useMemo, useState } from 'react';
import { loadJson, saveJson, STORAGE_KEYS } from '../storage';

// ===== Configurações de IA (API NVIDIA) =====
// A chave nunca vai para o bundle do app: o usuário informa na tela de
// Configurações e ela fica salva apenas no localStorage deste dispositivo,
// sendo enviada somente para integrate.api.nvidia.com.

export interface AiSettings {
    /** Chave da API NVIDIA (build.nvidia.com, começa com "nvapi-"). Vazio = IA desativada. */
    nvidiaApiKey: string;
    /** Modelo com visão usado no OCR da carteirinha. */
    visionModel: string;
    /** Modelo de texto usado na lista online de medicamentos. */
    textModel: string;
}

export const DEFAULT_VISION_MODEL = 'meta/llama-3.2-90b-vision-instruct';
export const DEFAULT_TEXT_MODEL = 'meta/llama-3.3-70b-instruct';

const EVENT_NAME = 'ai-settings-changed';

const isPartialAiSettings = (value: unknown): boolean =>
    typeof value === 'object' && value !== null && !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).nvidiaApiKey === 'string';

/** Lê as configurações atuais, preenchendo os padrões para campos ausentes. */
export function readAiSettings(): AiSettings {
    const stored = loadJson<Partial<AiSettings>>(STORAGE_KEYS.settings, isPartialAiSettings) ?? {};
    return {
        nvidiaApiKey: stored.nvidiaApiKey ?? '',
        visionModel: stored.visionModel?.trim() || DEFAULT_VISION_MODEL,
        textModel: stored.textModel?.trim() || DEFAULT_TEXT_MODEL,
    };
}

export function saveAiSettings(next: AiSettings): void {
    saveJson(STORAGE_KEYS.settings, {
        nvidiaApiKey: next.nvidiaApiKey.trim(),
        visionModel: next.visionModel.trim() || DEFAULT_VISION_MODEL,
        textModel: next.textModel.trim() || DEFAULT_TEXT_MODEL,
    });
    window.dispatchEvent(new Event(EVENT_NAME));
}

/** Hook reativo: re-renderiza o componente quando as configurações mudam. */
export function useAiSettings(): AiSettings {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        const onChange = () => setVersion((v) => v + 1);
        window.addEventListener(EVENT_NAME, onChange);
        return () => window.removeEventListener(EVENT_NAME, onChange);
    }, []);
    // `version` serve de gatilho de re-leitura do localStorage.
    return useMemo(() => readAiSettings(), [version]);
}
