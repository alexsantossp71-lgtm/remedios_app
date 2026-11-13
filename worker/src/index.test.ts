import { describe, expect, it } from 'vitest';
import worker from './index';

const origin = 'https://alexsantossp71-lgtm.github.io';
const baseEnv = {
    ALLOWED_ORIGINS: origin,
    ALLOWED_MODELS: 'meta/llama-3.3-70b-instruct',
    NVIDIA_API_KEY: 'nvapi-test-key',
};

describe('acesso ao proxy', () => {
    it('aceita chamadas do app sem segredo compartilhado no navegador', async () => {
        const request = new Request('https://proxy.example/v1/chat/completions', {
            method: 'POST',
            headers: { Origin: origin, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'not-allowed', messages: [], stream: false }),
        });
        const response = await worker.fetch(request, baseEnv);
        // Sem token, o pedido chega à validação da allowlist (403), não à autenticação (401).
        expect(response.status).toBe(403);
    });

    it('rejeita origem não cadastrada', async () => {
        const response = await worker.fetch(new Request('https://proxy.example/v1/models', {
            headers: { Origin: 'https://site-malicioso.example' },
        }), baseEnv);
        expect(response.status).toBe(403);
    });

    it('não revela o estado do segredo NVIDIA no endpoint de saúde', async () => {
        const response = await worker.fetch(new Request('https://proxy.example/health'), {});
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true });
    });
});
