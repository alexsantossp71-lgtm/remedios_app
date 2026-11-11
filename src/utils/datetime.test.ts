
import { describe, it, expect } from 'vitest';
import {
    parseLocalDate,
    parseLocalDateTime,
    toDateKey,
    toDateTimeInputValue,
    formatDateBR,
    formatDateTimeBR,
    formatWeekdayBR,
    describeReminderOffset,
} from './datetime';

describe('parseLocalDate', () => {
    it('interpreta YYYY-MM-DD como data LOCAL (componentes do dia exatos)', () => {
        const date = parseLocalDate('2026-11-11');
        expect(date).not.toBeNull();
        // Estes componentes locais são invariantes de fuso: um new Date('2026-11-11')
        // (UTC) devolveria getDate() = 10 em fusos negativos (America/Sao_Paulo).
        expect(date!.getFullYear()).toBe(2026);
        expect(date!.getMonth()).toBe(10); // novembro
        expect(date!.getDate()).toBe(11);
    });

    it('equivale à mesma meia-noite local que new Date(ano, mês, dia)', () => {
        expect(parseLocalDate('2024-02-29')!.getTime()).toBe(new Date(2024, 1, 29).getTime());
    });

    it('rejeita formatos inválidos e datas impossíveis', () => {
        expect(parseLocalDate('')).toBeNull();
        expect(parseLocalDate('11/11/2026')).toBeNull();
        expect(parseLocalDate('2026-11-11T10:00')).toBeNull();
        expect(parseLocalDate('2026-13-40')).toBeNull();
        expect(parseLocalDate('2026-02-30')).toBeNull();
    });
});

describe('parseLocalDateTime', () => {
    it('interpreta ISO local preservando hora e minutos', () => {
        const date = parseLocalDateTime('2026-11-11T14:05');
        expect(date).not.toBeNull();
        expect(date!.getFullYear()).toBe(2026);
        expect(date!.getMonth()).toBe(10);
        expect(date!.getDate()).toBe(11);
        expect(date!.getHours()).toBe(14);
        expect(date!.getMinutes()).toBe(5);
    });

    it('rejeita valores inválidos', () => {
        expect(parseLocalDateTime('não é data')).toBeNull();
        expect(parseLocalDateTime('')).toBeNull();
    });
});

describe('toDateKey / toDateTimeInputValue', () => {
    it('formata no fuso local com zero à esquerda', () => {
        expect(toDateKey(new Date(2026, 10, 5))).toBe('2026-11-05');
        expect(toDateTimeInputValue(new Date(2026, 10, 5, 7, 5))).toBe('2026-11-05T07:05');
    });

    it('é inverso de parseLocalDate', () => {
        expect(toDateKey(parseLocalDate('2026-03-07')!)).toBe('2026-03-07');
    });
});

describe('formatDateBR / formatDateTimeBR', () => {
    it('formata datas e horas em pt-BR', () => {
        expect(formatDateBR('2026-11-11')).toBe('11/11/2026');
        expect(formatDateTimeBR('2026-11-11T14:05')).toBe('11/11/2026 às 14:05');
    });

    it('aceita date-only e devolve o original quando inválido', () => {
        expect(formatDateBR('')).toBe('');
    });
});

describe('formatWeekdayBR', () => {
    it('devolve o dia da semana abreviado', () => {
        // 11/11/2026 é uma quarta-feira.
        expect(formatWeekdayBR('2026-11-11T10:00').startsWith('qua')).toBe(true);
    });

    it('devolve vazio quando inválido', () => {
        expect(formatWeekdayBR('xyz')).toBe('');
    });
});

describe('describeReminderOffset', () => {
    it('descreve os offsets padrão', () => {
        expect(describeReminderOffset(1440)).toBe('1 dia antes');
        expect(describeReminderOffset(60)).toBe('1 hora antes');
        expect(describeReminderOffset(0)).toBe('Sem lembrete');
    });

    it('descreve offsets arbitrários em horas e minutos', () => {
        expect(describeReminderOffset(90)).toBe('1 h e 30 min antes');
        expect(describeReminderOffset(15)).toBe('15 min antes');
    });
});
