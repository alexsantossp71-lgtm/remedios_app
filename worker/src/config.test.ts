
import { describe, it, expect } from 'vitest';
import {
    constantTimeEquals,
    isModelAllowed,
    isOriginAllowed,
    parseConfig,
    UPSTREAM_BASE,
} from './config';

describe('parseConfig', () => {
    it('usa os padrões quando as variáveis estão ausentes', () => {
        const cfg = parseConfig({});
        expect(cfg.windowMs).toBe(5 * 60_000);
        expect(cfg.windowMax).toBe(30);
        expect(cfg.dayMax).toBe(200);
        expect(cfg.allowedOrigins).toEqual([]);
        expect(cfg.allowedModels).toBe('*');
        expect(cfg.requiresToken).toBe(false);
    });

    it('lê as listas separadas por vírgula', () => {
        const cfg = parseConfig({
            ALLOWED_ORIGINS: 'https://a.github.io, https://b.github.io ,',
            ALLOWED_MODELS: 'meta/llama-3.3-70b-instruct, meta/llama-3.2-90b-vision-instruct',
        });
        expect(cfg.allowedOrigins).toEqual(['https://a.github.io', 'https://b.github.io']);
        expect(cfg.allowedModels).toEqual(['meta/llama-3.3-70b-instruct', 'meta/llama-3.2-90b-vision-instruct']);
    });

    it("'*' libera todos os modelos", () => {
        expect(parseConfig({ ALLOWED_MODELS: '*' }).allowedModels).toBe('*');
    });

    it('lê os limites de rate-limit e exige token quando PROXY_TOKEN existe', () => {
        const cfg = parseConfig({
            RATE_LIMIT_WINDOW_MS: '60000',
            RATE_LIMIT_MAX: '10',
            RATE_LIMIT_DAY_MAX: '50',
            PROXY_TOKEN: 'segredo',
        });
        expect(cfg.windowMs).toBe(60_000);
        expect(cfg.windowMax).toBe(10);
        expect(cfg.dayMax).toBe(50);
        expect(cfg.requiresToken).toBe(true);
    });

    it('valores inválidos caem no padrão', () => {
        const cfg = parseConfig({ RATE_LIMIT_MAX: 'abc', RATE_LIMIT_DAY_MAX: '-5' });
        expect(cfg.windowMax).toBe(30);
        expect(cfg.dayMax).toBe(200);
    });
});

describe('isOriginAllowed', () => {
    it('aceita apenas origens cadastradas exatamente', () => {
        expect(isOriginAllowed('https://a.github.io', ['https://a.github.io'])).toBe(true);
        expect(isOriginAllowed('https://a.github.io.evil.com', ['https://a.github.io'])).toBe(false);
        expect(isOriginAllowed('http://a.github.io', ['https://a.github.io'])).toBe(false);
        expect(isOriginAllowed('', ['https://a.github.io'])).toBe(false);
    });
});

describe('isModelAllowed', () => {
    it('libera tudo quando a allowlist é *', () => {
        expect(isModelAllowed('qualquer/modelo', '*')).toBe(true);
    });

    it('só libera modelos da lista', () => {
        const allowed = ['meta/llama-3.3-70b-instruct'];
        expect(isModelAllowed('meta/llama-3.3-70b-instruct', allowed)).toBe(true);
        expect(isModelAllowed('openai/gpt-4o', allowed)).toBe(false);
        expect(isModelAllowed('', allowed)).toBe(false);
        expect(isModelAllowed('   ', allowed)).toBe(false);
    });
});

describe('constantTimeEquals', () => {
    it('compara strings iguais e diferentes', () => {
        expect(constantTimeEquals('abc', 'abc')).toBe(true);
        expect(constantTimeEquals('abc', 'abd')).toBe(false);
        expect(constantTimeEquals('abc', 'abcd')).toBe(false);
        expect(constantTimeEquals('', '')).toBe(true);
    });
});

describe('UPSTREAM_BASE', () => {
    it('aponta para a API oficial da NVIDIA', () => {
        expect(UPSTREAM_BASE).toBe('https://integrate.api.nvidia.com/v1');
    });
});
