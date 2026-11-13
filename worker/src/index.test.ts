import { describe, expect, it } from 'vitest';
import worker from './index';

const origin = 'https://alexsantossp71-lgtm.github.io';
const baseEnv = {
    ALLOWED_ORIGINS: origin,
    ALLOWED_MODELS: 'meta/llama-3.3-70b-instruct',
    NVIDIA_API_KEY: 'nvapi-test-key',
};

describe('autenticação do proxy', () => {
    it('falha fechada quando PROXY_TOKEN não está configurado no servidor', async () => {
        const request = new Request('https://proxy.example/v1/models', {
            headers: { Origin: origin },
        });
        const response = await worker.fetch(request, baseEnv);
        expect(response.status).toBe(503);
    });

    it('recusa chamada sem token ou com token incorreto', async () => {
        const env = { ...baseEnv, PROXY_TOKEN: 'token-correto' };
        const missing = await worker.fetch(new Request('https://proxy.example/v1/models', {
            headers: { Origin: origin },
        }), env);
        const invalid = await worker.fetch(new Request('https://proxy.example/v1/models', {
            headers: { Origin: origin, 'x-proxy-token': 'token-errado' },
        }), env);
        expect(missing.status).toBe(401);
        expect(invalid.status).toBe(401);
    });

    it('não trata CORS como autenticação e rejeita origem não cadastrada', async () => {
        const response = await worker.fetch(new Request('https://proxy.example/v1/models', {
            headers: { Origin: 'https://site-malicioso.example', 'x-proxy-token': 'token-correto' },
        }), { ...baseEnv, PROXY_TOKEN: 'token-correto' });
        expect(response.status).toBe(403);
    });

    it('não revela o estado do segredo NVIDIA no endpoint de saúde', async () => {
        const response = await worker.fetch(new Request('https://proxy.example/health'), {});
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true });
    });
});
