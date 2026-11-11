
import { describe, it, expect } from 'vitest';
import { maskPhone, phoneDigits, maskCardNumber } from './masks';

describe('maskPhone', () => {
    it('formata celular com 11 dígitos', () => {
        expect(maskPhone('11988887777')).toBe('(11) 98888-7777');
    });

    it('formata fixo com 10 dígitos', () => {
        expect(maskPhone('1133333333')).toBe('(11) 3333-3333');
    });

    it('formata parcialmente enquanto o usuário digita', () => {
        expect(maskPhone('11')).toBe('11');
        expect(maskPhone('119')).toBe('(11) 9');
        expect(maskPhone('11988')).toBe('(11) 988');
    });

    it('ignora caracteres não numéricos e limita a 11 dígitos', () => {
        expect(maskPhone('(11) 98888-7777x9')).toBe('(11) 98888-7777');
        expect(maskPhone('abc')).toBe('');
    });
});

describe('phoneDigits', () => {
    it('extrai apenas os dígitos', () => {
        expect(phoneDigits('(11) 98888-7777')).toBe('11988887777');
        expect(phoneDigits('')).toBe('');
    });
});

describe('maskCardNumber', () => {
    it('agrupa dígitos de 4 em 4', () => {
        expect(maskCardNumber('1234567812345678')).toBe('1234 5678 1234 5678');
    });

    it('formata parcialmente', () => {
        expect(maskCardNumber('123')).toBe('123');
        expect(maskCardNumber('12345678')).toBe('1234 5678');
    });

    it('limita a 20 dígitos', () => {
        expect(maskCardNumber('123456789012345678901234')).toBe('1234 5678 9012 3456 7890');
    });

    it('descarta não numéricos', () => {
        expect(maskCardNumber('12a34')).toBe('1234');
        expect(maskCardNumber('---')).toBe('');
    });
});
