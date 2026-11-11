
import { describe, it, expect } from 'vitest';
import { hasAiAccess, normalizeProxyUrl, effectiveProxyUrl, DEFAULT_PROXY_URL } from './settings';

describe('normalizeProxyUrl', () => {
    it('aceita URL raiz e acrescenta /v1', () => {
        expect(normalizeProxyUrl('https://remedios-ai-proxy.conta.workers.dev')).toBe(
            'https://remedios-ai-proxy.conta.workers.dev/v1'
        );
    });

    it('mantém /v1 já presente e remove barra final', () => {
        expect(normalizeProxyUrl('https://proxy.exemplo.com/v1/')).toBe('https://proxy.exemplo.com/v1');
        expect(normalizeProxyUrl('https://proxy.exemplo.com/v1')).toBe('https://proxy.exemplo.com/v1');
    });

    it('preserva caminhos intermediários e acrescenta /v1', () => {
        expect(normalizeProxyUrl('https://proxy.exemplo.com/api')).toBe('https://proxy.exemplo.com/api/v1');
    });

    it('ignora barra final antes de acrescentar /v1', () => {
        expect(normalizeProxyUrl('https://proxy.exemplo.com/')).toBe('https://proxy.exemplo.com/v1');
    });

    it('devolve vazio para URLs inválidas', () => {
        expect(normalizeProxyUrl('')).toBe('');
        expect(normalizeProxyUrl('   ')).toBe('');
        expect(normalizeProxyUrl('proxy.workers.dev')).toBe('');
        expect(normalizeProxyUrl('ftp://proxy.exemplo.com')).toBe('');
    });
});

describe('effectiveProxyUrl', () => {
    it('usa a URL por dispositivo quando informada', () => {
        expect(effectiveProxyUrl({ proxyUrl: 'https://meu-proxy.dev' })).toBe('https://meu-proxy.dev/v1');
    });

    it('cai no padrão do build quando o campo está vazio', () => {
        expect(effectiveProxyUrl({ proxyUrl: '' })).toBe(normalizeProxyUrl(DEFAULT_PROXY_URL));
    });
});

describe('hasAiAccess', () => {
    it('libera com proxy', () => {
        expect(hasAiAccess({ proxyUrl: 'https://meu-proxy.dev', nvidiaApiKey: '' })).toBe(true);
        expect(hasAiAccess({ proxyUrl: '', nvidiaApiKey: '' })).toBe(Boolean(DEFAULT_PROXY_URL));
    });

    it('libera com chave própria mesmo sem proxy', () => {
        expect(hasAiAccess({ proxyUrl: '', nvidiaApiKey: 'nvapi-xyz' })).toBe(true);
    });
});
