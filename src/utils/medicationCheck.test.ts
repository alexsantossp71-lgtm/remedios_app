
import { describe, it, expect } from 'vitest';
import {
    guardianVerdict,
    medicationMatches,
    normalizeMedicationName,
    sanitizeMedicationId,
} from './medicationCheck';

describe('normalizeMedicationName', () => {
    it('minúsculas, sem acentos e sem pontuação', () => {
        expect(normalizeMedicationName('Dipirona 500mg!')).toBe('dipirona 500mg');
        expect(normalizeMedicationName('  Losartana-Potássica  ')).toBe('losartana potassica');
        expect(normalizeMedicationName('Ad., Cloridrato')).toBe('ad cloridrato');
    });
});

describe('medicationMatches', () => {
    it('um nome contém o outro (caixa com dosagem vs lembrete simples)', () => {
        expect(medicationMatches('Dipirona 500mg comprimidos', 'Dipirona')).toBe(true);
        expect(medicationMatches('dipirona', 'Dipirona Sódica 500mg')).toBe(true);
    });

    it('palavra em comum (genérico vs marca com nome composto)', () => {
        expect(medicationMatches('Cloridrato de Metformina 850mg', 'Metformina')).toBe(true);
        expect(medicationMatches('Losartana Potássica', 'Losartana')).toBe(true);
    });

    it('medicamentos diferentes não combinam', () => {
        expect(medicationMatches('Losartana 50mg', 'Dipirona')).toBe(false);
        expect(medicationMatches('Omeprazol', 'Dipirona')).toBe(false);
    });

    it('palavras genéricas não geram falso positivo', () => {
        expect(medicationMatches('Comprimido revestido', 'Comprimido oral')).toBe(false);
        expect(medicationMatches('MG Lab', 'Mg 500')).toBe(false);
    });

    it('nomes vazios não combinam', () => {
        expect(medicationMatches('', 'Dipirona')).toBe(false);
        expect(medicationMatches('Dipirona', '')).toBe(false);
    });
});

describe('guardianVerdict', () => {
    it('embalagem igual ao lembrete → match', () => {
        const verdict = guardianVerdict('Dipirona 500mg', 'Dipirona', 'alta');
        expect(verdict.kind).toBe('match');
        expect(verdict.detected).toBe('Dipirona 500mg');
    });

    it('embalagem diferente do lembrete → mismatch (alerta de erro de medicação)', () => {
        expect(guardianVerdict('Losartana', 'Dipirona', 'alta').kind).toBe('mismatch');
    });

    it('leitura insegura → unsure (usuário confere manualmente)', () => {
        expect(guardianVerdict('', 'Dipirona', 'alta').kind).toBe('unsure');
        expect(guardianVerdict('Dipirona', 'Dipirona', 'baixa').kind).toBe('unsure');
        expect(guardianVerdict('Losartana', 'Dipirona', 'baixa').kind).toBe('unsure');
    });
});

describe('sanitizeMedicationId', () => {
    it('normaliza a resposta válida da IA', () => {
        expect(
            sanitizeMedicationId({ medication: ' Dipirona ', confidence: 'alta', detail: 'nome legível' })
        ).toEqual({ medication: 'Dipirona', confidence: 'alta', detail: 'nome legível' });
    });

    it('aceita "média" com acento e vira media', () => {
        expect(sanitizeMedicationId({ medication: 'X', confidence: 'média' }).confidence).toBe('media');
    });

    it('nunca lança: lixo vira leitura ilegível', () => {
        expect(sanitizeMedicationId('lixo')).toEqual({ medication: '', confidence: 'baixa', detail: '' });
        expect(sanitizeMedicationId(null)).toEqual({ medication: '', confidence: 'baixa', detail: '' });
        expect(sanitizeMedicationId({ medication: 42, confidence: 'desconhecida' })).toEqual({
            medication: '',
            confidence: 'baixa',
            detail: '',
        });
    });
});
