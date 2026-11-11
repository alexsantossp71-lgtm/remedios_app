
import { describe, it, expect, beforeEach } from 'vitest';
import { guideCacheKey, getCachedGuide, storeGuide } from './bulaCache';
import type { MedicationGuide } from '../services/nvidiaService';

// Shim mínimo do localStorage (o ambiente de teste é Node, sem DOM).
class MemStorage {
    private data = new Map<string, string>();
    getItem(key: string): string | null {
        return this.data.has(key) ? (this.data.get(key) as string) : null;
    }
    setItem(key: string, value: string): void {
        this.data.set(key, String(value));
    }
    removeItem(key: string): void {
        this.data.delete(key);
    }
}

const installShim = (overrides: Record<string, string> = {}): void => {
    const shim = new MemStorage();
    for (const [key, value] of Object.entries(overrides)) shim.setItem(key, value);
    globalThis.localStorage = shim as unknown as Storage;
};

const guide = (whatFor = 'Para dores e febre.'): MedicationGuide => ({
    whatFor,
    howToUse: 'Tomar por via oral, com água.',
    commonSideEffects: ['Náusea', 'Sonolência'],
    warnings: ['Evite álcool'],
    note: 'Informações gerais; consulte a bula.',
});

describe('guideCacheKey', () => {
    it('normaliza maiúsculas e espaços', () => {
        expect(guideCacheKey(' Losartana ', ' 1 comprimido ')).toBe('losartana|1 comprimido|');
        expect(guideCacheKey('losartana', '1 comprimido')).toBe(guideCacheKey('LOSARTANA', '1 comprimido'));
    });

    it('difere quando a dosagem ou instruções mudam', () => {
        expect(guideCacheKey('Dipirona', '1 cp', 'em jejum')).not.toBe(guideCacheKey('Dipirona', '1 cp'));
    });
});

describe('cache de explicações', () => {
    beforeEach(() => installShim());

    it('retorna null quando não há nada salvo', () => {
        expect(getCachedGuide('inexistente')).toBeNull();
        expect(getCachedGuide('')).toBeNull();
    });

    it('salva e recupera uma explicação', () => {
        const key = guideCacheKey('Dipirona');
        storeGuide(key, guide());
        expect(getCachedGuide(key)?.whatFor).toBe('Para dores e febre.');
    });

    it('sobrescreve a mesma chave', () => {
        const key = guideCacheKey('Dipirona');
        storeGuide(key, guide('Primeira'));
        storeGuide(key, guide('Atualizada'));
        expect(getCachedGuide(key)?.whatFor).toBe('Atualizada');
    });

    it('descarta as entradas mais antigas acima do teto de 40', () => {
        for (let i = 0; i < 45; i++) storeGuide(`med-${i}`, guide(`Guia ${i}`));
        // Teto de 40: as 5 primeiras (med-0 a med-4) são descartadas.
        expect(getCachedGuide('med-0')).toBeNull();
        expect(getCachedGuide('med-4')).toBeNull();
        expect(getCachedGuide('med-5')?.whatFor).toBe('Guia 5');
        expect(getCachedGuide('med-44')?.whatFor).toBe('Guia 44');
    });

    it('ignora conteúdo corrompido no localStorage', () => {
        installShim({ aiMedicationGuides: '{json quebrado' });
        expect(getCachedGuide('qualquer')).toBeNull();
        // E a gravação seguinte recomeça limpa:
        storeGuide(guideCacheKey('Dipirona'), guide());
        expect(getCachedGuide(guideCacheKey('Dipirona'))).not.toBeNull();
    });

    it('não lança sem localStorage disponível', () => {
        // @ts-expect-error simula ambiente sem localStorage
        delete globalThis.localStorage;
        expect(getCachedGuide('x')).toBeNull();
        expect(() => storeGuide('x', guide())).not.toThrow();
        installShim(); // restaura para os próximos testes
    });
});
