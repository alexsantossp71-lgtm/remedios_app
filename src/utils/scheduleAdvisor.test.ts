
import { describe, it, expect } from 'vitest';
import {
    buildScheduleDataBlock,
    cleanAdvisorTime,
    diffTimes,
    minGapMinutes,
    sanitizeScheduleAdvice,
    timeToMinutes,
    type ScheduleAdvisorMed,
} from './scheduleAdvisor';

const med = (overrides: Partial<ScheduleAdvisorMed> = {}): ScheduleAdvisorMed => ({
    id: 'med-1',
    name: 'Losartana',
    dosage: '1 comprimido',
    instructions: '',
    times: ['08:00', '23:00'],
    frequencyDays: 1,
    continuous: true,
    ...overrides,
});

describe('cleanAdvisorTime', () => {
    it('normaliza HH:MM e aceita 1 dígito na hora', () => {
        expect(cleanAdvisorTime('7:30')).toBe('07:30');
        expect(cleanAdvisorTime(' 23:05 ')).toBe('23:05');
    });

    it('rejeita horários inválidos e tipos errados', () => {
        expect(cleanAdvisorTime('24:00')).toBe('');
        expect(cleanAdvisorTime('07:60')).toBe('');
        expect(cleanAdvisorTime('manhã')).toBe('');
        expect(cleanAdvisorTime(7)).toBe('');
        expect(cleanAdvisorTime(null)).toBe('');
    });
});

describe('timeToMinutes e minGapMinutes', () => {
    it('converte horário em minutos', () => {
        expect(timeToMinutes('08:00')).toBe(480);
        expect(timeToMinutes('23:59')).toBe(23 * 60 + 59);
        expect(timeToMinutes('xx')).toBe(null);
    });

    it('menor intervalo considera a virada da meia-noite (esquema 8/8h)', () => {
        // 22:00 → 06:00 → 14:00: lacunas 8h, 8h e 8h (22:00 → 06:00 do dia seguinte)
        expect(minGapMinutes(['22:00', '06:00', '14:00'])).toBe(480);
    });

    it('menor intervalo entre doses normais', () => {
        expect(minGapMinutes(['08:00', '23:00'])).toBe(8 * 60 + 60);
        expect(minGapMinutes(['08:00'])).toBe(null);
        expect(minGapMinutes([])).toBe(null);
    });

    it('detecta intervalo apertado', () => {
        expect(minGapMinutes(['07:30', '08:15'])).toBe(45);
    });
});

describe('diffTimes', () => {
    it('aponta apenas as posições que mudaram (ordem irrelevante)', () => {
        expect(diffTimes(['08:00', '23:00'], ['08:00', '21:30'])).toEqual([{ from: '23:00', to: '21:30' }]);
        expect(diffTimes(['23:00', '08:00'], ['07:30', '21:30'])).toEqual([
            { from: '08:00', to: '07:30' },
            { from: '23:00', to: '21:30' },
        ]);
    });

    it('sem mudanças devolve lista vazia', () => {
        expect(diffTimes(['08:00', '23:00'], ['23:00', '08:00'])).toEqual([]);
    });
});

describe('sanitizeScheduleAdvice', () => {
    it('mantém sugestões válidas e calcula changed/changes', () => {
        const result = sanitizeScheduleAdvice(
            {
                summary: 'Reorganizei para a noite ficar mais leve.',
                suggestions: [
                    {
                        medicationId: 'med-1',
                        medicationName: 'Losartana',
                        suggestedTimes: ['08:00', '21:30'],
                        reason: 'A dose das 23h passa para 21h30.',
                        warnings: [],
                    },
                ],
            },
            [med()]
        );
        expect(result.summary).toBe('Reorganizei para a noite ficar mais leve.');
        expect(result.suggestions).toHaveLength(1);
        const suggestion = result.suggestions[0];
        expect(suggestion.medicationId).toBe('med-1');
        expect(suggestion.suggestedTimes).toEqual(['08:00', '21:30']);
        expect(suggestion.changed).toBe(true);
        expect(suggestion.changes).toEqual([{ from: '23:00', to: '21:30' }]);
        expect(suggestion.minGapMinutes).toBe(630); // 10h30 (08:00→21:30 e virada da meia-noite)
        expect(suggestion.warnings).toEqual([]);
    });

    it('marca como sem mudança quando os horários são os mesmos (ordem trocada incluída)', () => {
        const result = sanitizeScheduleAdvice(
            { suggestions: [{ medicationId: 'med-1', suggestedTimes: ['23:00', '08:00'] }] },
            [med()]
        );
        expect(result.suggestions[0].changed).toBe(false);
        expect(result.suggestions[0].changes).toEqual([]);
    });

    it('descarta sugestões sem id/nome conhecido (IA não cria medicamentos)', () => {
        const result = sanitizeScheduleAdvice(
            {
                suggestions: [
                    { medicationId: 'desconhecido', suggestedTimes: ['09:00'] },
                    { medicationName: 'Medicamento Inexistente', suggestedTimes: ['09:00'] },
                    { suggestedTimes: ['09:00'] },
                ],
            },
            [med()]
        );
        expect(result.suggestions).toHaveLength(0);
    });

    it('faz fallback por nome normalizado quando o id não bate', () => {
        const result = sanitizeScheduleAdvice(
            { suggestions: [{ medicationId: '', medicationName: '  losartana ', suggestedTimes: ['09:00', '21:00'] }] },
            [med()]
        );
        expect(result.suggestions).toHaveLength(1);
        expect(result.suggestions[0].medicationId).toBe('med-1');
    });

    it('limpa horários inválidos, repetidos e ordena', () => {
        const result = sanitizeScheduleAdvice(
            { suggestions: [{ medicationId: 'med-1', suggestedTimes: ['21:30', 'abc', '21:30', '09:00', '25:00'] }] },
            [med()]
        );
        expect(result.suggestions[0].suggestedTimes).toEqual(['09:00', '21:30']);
    });

    it('avisa quando a IA muda a quantidade de doses', () => {
        const result = sanitizeScheduleAdvice(
            { suggestions: [{ medicationId: 'med-1', suggestedTimes: ['08:00'] }] },
            [med()]
        );
        expect(result.suggestions[0].warnings[0]).toContain('1 dose(s)');
        expect(result.suggestions[0].warnings[0]).toContain('2');
    });

    it('avisa quando o intervalo sugerido é menor que 1 hora', () => {
        const result = sanitizeScheduleAdvice(
            { suggestions: [{ medicationId: 'med-1', suggestedTimes: ['08:00', '08:30', '23:00'] }] },
            [med()]
        );
        expect(result.suggestions[0].warnings.join(' ')).toContain('Intervalo mínimo');
    });

    it('nunca lança com entradas estranhas', () => {
        expect(() => sanitizeScheduleAdvice(null, [med()])).not.toThrow();
        expect(() => sanitizeScheduleAdvice('texto', [med()])).not.toThrow();
        expect(() => sanitizeScheduleAdvice({ suggestions: ['x', 5, {}] }, [med()])).not.toThrow();
        const empty = sanitizeScheduleAdvice(null, [med()]);
        expect(empty).toEqual({ summary: '', suggestions: [] });
    });

    it('sem horários válidos a sugestão é descartada', () => {
        const result = sanitizeScheduleAdvice(
            { suggestions: [{ medicationId: 'med-1', suggestedTimes: [] }] },
            [med()]
        );
        expect(result.suggestions).toHaveLength(0);
    });
});

describe('buildScheduleDataBlock', () => {
    it('inclui id, nome, dosagem, instruções, frequência e horários', () => {
        const block = buildScheduleDataBlock([
            med(),
            med({
                id: 'med-2',
                name: 'Omeprazol',
                dosage: '',
                instructions: 'em jejum, 30 min antes do café',
                times: ['07:00'],
                frequencyDays: 2,
                continuous: false,
            }),
        ]);
        expect(block).toContain('[med-1] | Losartana | 1 comprimido');
        expect(block).toContain('todos os dias');
        expect(block).toContain('uso contínuo');
        expect(block).toContain('horários atuais: 08:00, 23:00');
        expect(block).toContain('[med-2] | Omeprazol | dosagem não informada');
        expect(block).toContain('instruções: em jejum, 30 min antes do café');
        expect(block).toContain('a cada 2 dias');
        expect(block).toContain('por prazo determinado');
        expect(block).toContain('horários atuais: 07:00');
    });

    it('lida com lembrete sem horários', () => {
        const block = buildScheduleDataBlock([med({ times: [] })]);
        expect(block).toContain('horários atuais: nenhum');
    });
});
