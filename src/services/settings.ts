
import { useEffect, useMemo, useState } from 'react';
import { loadJson, saveJson, STORAGE_KEYS } from '../storage';

// ===== Configurações de IA (API NVIDIA + proxy opcional) =====
// A chave nunca vai para o bundle do app: o usuário informa na tela de
// Configurações e ela fica salva apenas no localStorage deste dispositivo,
// sendo enviada somente para integrate.api.nvidia.com.
// Alternativa sem chave por usuário: um proxy Cloudflare Worker (pasta
// worker/ do repositório) mantém a chave no servidor; o app só precisa da
// URL pública dele, que pode vir do build (VITE_DEFAULT_PROXY_URL) ou ser
// informada por dispositivo nas Configurações.

export interface AiSettings {
    /** Chave da API NVIDIA (build.nvidia.com, começa com "nvapi-"). Vazio = não usa chave direta. */
    nvidiaApiKey: string;
    /** URL do proxy de IA (Cloudflare Worker). Vazio = usa a URL padrão do build, se houver. */
    proxyUrl: string;
    /** Token opcional do proxy (enviado no cabeçalho x-proxy-token quando o Worker define PROXY_TOKEN). */
    proxyToken: string;
    /** Modelo com visão usado no OCR da carteirinha. */
    visionModel: string;
    /** Modelo de texto usado na lista online de medicamentos. */
    textModel: string;
}

export const DEFAULT_VISION_MODEL = 'meta/llama-3.2-90b-vision-instruct';
export const DEFAULT_TEXT_MODEL = 'meta/llama-3.3-70b-instruct';

/** URL do proxy embutida em tempo de build (ex.: https://remedios-ai-proxy.<conta>.workers.dev). */
export const DEFAULT_PROXY_URL: string =
    typeof import.meta !== 'undefined'
        ? ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_DEFAULT_PROXY_URL ?? '').trim()
        : '';

const EVENT_NAME = 'ai-settings-changed';

const isPartialAiSettings = (value: unknown): boolean =>
    typeof value === 'object' && value !== null && !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).nvidiaApiKey === 'string';

/** Lê string de forma defensiva (localStorage pode ter valores corrompidos). */
const safeString = (value: unknown): string =>
    typeof value === 'string' ? value.trim() : '';

/**
 * Normaliza a URL do proxy para "<origem>/v1": aceita com/sem "/v1" e barra
 * final. Sem protocolo http(s) devolve '' (URL inválida).
 */
export function normalizeProxyUrl(raw: string): string {
    const value = raw.trim().replace(/\/+$/, '');
    if (!/^https?:\/\/.+/i.test(value)) return '';
    return /\/v1$/i.test(value) ? value : `${value}/v1`;
}

/** Proxy efetivo desta configuração: o informado por dispositivo ou o do build. */
export function effectiveProxyUrl(settings: Pick<AiSettings, 'proxyUrl'>): string {
    return normalizeProxyUrl(settings.proxyUrl || DEFAULT_PROXY_URL);
}

/**
 * Há acesso à IA? Basta o proxy (novo padrão sem chave) OU uma chave própria.
 * Usado por todos os recursos de IA para decidir entre executar e mostrar
 * a chamada para configurar.
 */
export function hasAiAccess(settings: Pick<AiSettings, 'proxyUrl' | 'nvidiaApiKey'>): boolean {
    return Boolean(settings.nvidiaApiKey.trim() || effectiveProxyUrl(settings));
}

/** Lê as configurações atuais, preenchendo os padrões para campos ausentes. */
export function readAiSettings(): AiSettings {
    const stored = loadJson<Partial<AiSettings>>(STORAGE_KEYS.settings, isPartialAiSettings) ?? {};
    return {
        nvidiaApiKey: safeString(stored.nvidiaApiKey),
        proxyUrl: safeString(stored.proxyUrl),
        proxyToken: safeString(stored.proxyToken),
        visionModel: safeString(stored.visionModel) || DEFAULT_VISION_MODEL,
        textModel: safeString(stored.textModel) || DEFAULT_TEXT_MODEL,
    };
}

export function saveAiSettings(next: AiSettings): void {
    saveJson(STORAGE_KEYS.settings, {
        nvidiaApiKey: next.nvidiaApiKey.trim(),
        proxyUrl: next.proxyUrl.trim(),
        proxyToken: next.proxyToken.trim(),
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
    // `version` serve de gatilho de re-leitura do localStorage (invalidação
    // manual por contador de eventos — deliberadamente não usado no cálculo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => readAiSettings(), [version]);
}
