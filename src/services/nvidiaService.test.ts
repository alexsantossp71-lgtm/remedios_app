
import { describe, it, expect } from 'vitest';
import { AiError, extractJson } from './nvidiaService';

describe('extractJson', () => {
    it('extrai JSON puro', () => {
        expect(extractJson('{"a":1}')).toEqual({ a: 1 });
        expect(extractJson('{}')).toEqual({});
    });

    it('extrai JSON de blocos de código markdown', () => {
        expect(extractJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
        expect(extractJson('```\n{"a": 1}\n```')).toEqual({ a: 1 });
    });

    it('extrai JSON com texto ao redor (respostas conversacionais)', () => {
        expect(extractJson('Claro! Aqui estão os dados: {"nome":"Dipirona"} — qualquer dúvida me avise.')).toEqual({
            nome: 'Dipirona',
        });
    });

    it('suporta objetos aninhados e arrays', () => {
        const text = '{"exames":[{"nome":"Hemograma","data":"2026-11-11"}],"total":1}';
        expect(extractJson(text)).toEqual({ exames: [{ nome: 'Hemograma', data: '2026-11-11' }], total: 1 });
    });

    it('usa o primeiro { e o último } (campos com chaves no conteúdo)', () => {
        expect(extractJson('{"a":"}","b":"{"}')).toEqual({ a: '}', b: '{' });
    });

    it('lança AiError sem mensagem legível quando não há JSON', () => {
        expect(() => extractJson('lorem ipsum sem objeto')).toThrow(AiError);
    });

    it('lança AiError para JSON malformado', () => {
        expect(() => extractJson('{"a":1')).toThrow(AiError);
        expect(() => extractJson('{a:1}')).toThrow(AiError);
    });
});
