import { useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../storage';

export interface AiSettings {
    nvidiaApiKey: string;
    proxyUrl: string;
    proxyToken: string;
    visionModel: string;
    textModel: string;
}

export const DEFAULT_VISION_MODEL = 'meta/llama-3.2-90b-vision-instruct';
export const DEFAULT_TEXT_MODEL = 'meta/llama-3.3-70b-instruct';
export const DEFAULT_PROXY_URL = 'https://remedios-ai-proxy.alexsantossp71.workers.dev';

const EVENT_NAME = 'ai-settings-changed';

export function normalizeProxyUrl(raw: string): string {
    const value = raw.trim().replace(/\/+$/, '');
    if (!/^https?:\/\/.+/i.test(value)) return '';
    return /\/v1$/i.test(value) ? value : value + '/v1';
}

export function effectiveProxyUrl(_settings?: Pick<AiSettings, 'proxyUrl'>): string {
    return normalizeProxyUrl(DEFAULT_PROXY_URL);
}

export function hasAiAccess(_settings?: Pick<AiSettings, 'proxyUrl' | 'nvidiaApiKey'>): boolean {
    return Boolean(effectiveProxyUrl());
}

export function readAiSettings(): AiSettings {
    // Apaga configurações antigas que continham token/chave no navegador.
    try { localStorage.removeItem(STORAGE_KEYS.settings); } catch { /* armazenamento indisponível */ }
    return {
        nvidiaApiKey: '',
        proxyUrl: DEFAULT_PROXY_URL,
        proxyToken: '',
        visionModel: DEFAULT_VISION_MODEL,
        textModel: DEFAULT_TEXT_MODEL,
    };
}

// Compatibilidade com chamadas antigas; nenhum segredo é persistido no navegador.
export function saveAiSettings(_next: AiSettings): void {
    window.dispatchEvent(new Event(EVENT_NAME));
}

export function useAiSettings(): AiSettings {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        const onChange = () => setVersion((v) => v + 1);
        window.addEventListener(EVENT_NAME, onChange);
        return () => window.removeEventListener(EVENT_NAME, onChange);
    }, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => readAiSettings(), [version]);
}
