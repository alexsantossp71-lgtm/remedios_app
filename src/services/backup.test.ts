import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../storage';
import { applyBackup, buildBackup, decryptBackup, encryptBackup, parseBackup } from './backup';
import type { LabResult } from '../types';

const lab: LabResult = {
    id: 'lab-1',
    date: '2026-11-10',
    labName: 'Laboratório Central',
    values: [{
        examName: 'Glicemia',
        valueText: '95',
        numericValue: 95,
        unit: 'mg/dL',
        referenceLow: 70,
        referenceHigh: 99,
        referenceText: '70 - 99',
        flag: 'normal',
    }],
    notes: 'Resultado de exemplo',
    photo: 'data:image/jpeg;base64,laudo-foto-exemplo',
    createdAt: '2026-11-10T10:00:00.000Z',
};

let store: Map<string, string>;

beforeEach(() => {
    store = new Map();
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
        removeItem: (key: string) => { store.delete(key); },
        clear: () => store.clear(),
    });
});

afterEach(() => vi.unstubAllGlobals());

describe('backup de laudos laboratoriais', () => {
    it('inclui os laudos laboratoriais completos, inclusive foto e valores, na exportação', () => {
        store.set(STORAGE_KEYS.labs, JSON.stringify([lab]));
        expect(buildBackup().data.labs).toEqual([lab]);
    });

    it('valida e restaura os laudos completos, inclusive foto e valores, na importação', () => {
        const file = {
            app: 'remedio-na-hora',
            version: 1,
            exportedAt: '2026-11-13T10:00',
            data: { labs: [lab] },
        };
        const parsed = parseBackup(JSON.stringify(file));
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.data.labs).toEqual([lab]);
        applyBackup(parsed.data);
        expect(JSON.parse(store.get(STORAGE_KEYS.labs) ?? 'null')).toEqual([lab]);
    });

    it('preserva laudos existentes ao importar backup antigo sem a categoria labs', () => {
        store.set(STORAGE_KEYS.labs, JSON.stringify([lab]));
        const legacy = {
            app: 'remedio-na-hora',
            version: 1,
            exportedAt: '2026-11-01T10:00',
            data: { reminders: [] },
        };
        const parsed = parseBackup(JSON.stringify(legacy));
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        applyBackup(parsed.data);
        expect(JSON.parse(store.get(STORAGE_KEYS.labs) ?? 'null')).toEqual([lab]);
        expect(JSON.parse(store.get(STORAGE_KEYS.reminders) ?? 'null')).toEqual([]);
    });

    it('rejeita laudos com estrutura inválida sem aplicar parcialmente', () => {
        const invalid = {
            app: 'remedio-na-hora',
            version: 1,
            exportedAt: '2026-11-13T10:00',
            data: { reminders: [], labs: [{ id: 'sem-data' }] },
        };
        expect(parseBackup(JSON.stringify(invalid)).ok).toBe(false);
        expect(store.has(STORAGE_KEYS.reminders)).toBe(false);
    });
});


describe('backup protegido por senha', () => {
    it('criptografa e abre o backup com a senha correta', async () => {
        store.set(STORAGE_KEYS.reminders, JSON.stringify([]));
        const encrypted = await encryptBackup('senha-segura-123');
        expect(encrypted).not.toContain('"data"');
        const plaintext = await decryptBackup(encrypted, 'senha-segura-123');
        const parsed = parseBackup(plaintext);
        expect(parsed.ok).toBe(true);
    });

    it('recusa senha incorreta sem revelar o conteúdo', async () => {
        const encrypted = await encryptBackup('senha-segura-123');
        await expect(decryptBackup(encrypted, 'senha-errada')).rejects.toThrow('Confira a senha');
    });

    it('exige senha mínima para exportar', async () => {
        await expect(encryptBackup('123')).rejects.toThrow('pelo menos 8 caracteres');
    });
});
