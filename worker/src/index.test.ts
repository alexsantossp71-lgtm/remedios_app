import { describe, expect, it } from 'vitest';
import worker from './index';

const origin = 'https://alexsantossp71-lgtm.github.io';
const baseEnv = {
    ALLOWED_ORIGINS: origin,
    ALLOWED_MODELS: 'meta/llama-3.3-70b-instruct',
    NVIDIA_API_KEY: 'nvapi-test-key',
    POLLINATIONS_API_KEY: 'sk_test_pollinations',
    POLLINATIONS_ALLOWED_MODELS: 'google/gemini-3.8-flash',
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

    it('exige secret próprio para habilitar Pollinations', async () => {
        const response = await worker.fetch(new Request('https://proxy.example/v1/pollinations/models', {
            headers: { Origin: origin },
        }), { ALLOWED_ORIGINS: origin, NVIDIA_API_KEY: 'nvapi-test-key' });
        expect(response.status).toBe(503);
        expect((await response.json() as { error: { message: string } }).error.message).toContain('POLLINATIONS_API_KEY');
    });

    it('rejeita modelo Pollinations fora da allowlist sem chamar o provedor', async () => {
        const response = await worker.fetch(new Request('https://proxy.example/v1/pollinations/chat/completions', {
            method: 'POST',
            headers: { Origin: origin, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'modelo/desconhecido', messages: [], stream: false }),
        }), baseEnv);
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


describe('limite independente do diagnóstico NVIDIA', () => {
    it('permite testar mais de 30 chamadas sintéticas sem consumir a cota normal', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.endsWith('/models')) {
                return new Response(JSON.stringify({ data: [{ id: 'meta/llama-3.3-70b-instruct' }] }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            return new Response(JSON.stringify({ choices: [{ message: { content: 'teste sintético' } }] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        };
        try {
            const responses = await Promise.all(Array.from({ length: 31 }, () => worker.fetch(
                new Request('https://proxy.example/v1/diagnostics/chat/completions', {
                    method: 'POST',
                    headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.77' },
                    body: JSON.stringify({ model: 'meta/llama-3.3-70b-instruct', task: 'interactions' }),
                }),
                baseEnv,
            )));
            expect(responses.every((response) => response.status === 200)).toBe(true);

            // As chamadas de diagnóstico não podem consumir a cota das rotas normais.
            const normalResponse = await worker.fetch(
                new Request('https://proxy.example/v1/chat/completions', {
                    method: 'POST',
                    headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.77' },
                    body: JSON.stringify({ model: 'meta/llama-3.3-70b-instruct', messages: [{ role: 'user', content: 'teste' }], stream: false }),
                }),
                baseEnv,
            );
            expect(normalResponse.status).toBe(200);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('mantém o limite normal de 30 chamadas para o proxy do aplicativo', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async () => new Response(JSON.stringify({
            choices: [{ message: { content: 'teste sintético' } }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        try {
            const responses = await Promise.all(Array.from({ length: 31 }, () => worker.fetch(
                new Request('https://proxy.example/v1/chat/completions', {
                    method: 'POST',
                    headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.78' },
                    body: JSON.stringify({ model: 'meta/llama-3.3-70b-instruct', messages: [{ role: 'user', content: 'teste' }], stream: false }),
                }),
                baseEnv,
            )));
            expect(responses.filter((response) => response.status === 200)).toHaveLength(30);
            expect(responses.filter((response) => response.status === 429)).toHaveLength(1);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

});
