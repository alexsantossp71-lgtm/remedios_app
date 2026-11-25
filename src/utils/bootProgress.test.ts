import { describe, it, expect } from 'vitest';
import { BOOT_STEPS, BOOT_DONE_LABEL, BOOT_ANIMATION_MS, bootProgress, bootStepLabel } from './bootProgress';

describe('etapas de carregamento', () => {
    it('tem rótulos preenchidos e ids únicos', () => {
        const ids = BOOT_STEPS.map((step) => step.id);
        expect(ids.length).toBeGreaterThan(0);
        expect(new Set(ids).size).toBe(ids.length);
        for (const step of BOOT_STEPS) expect(step.label.trim().length).toBeGreaterThan(0);
        expect(BOOT_DONE_LABEL.trim().length).toBeGreaterThan(0);
    });
});

describe('bootProgress', () => {
    const TOTAL = BOOT_STEPS.length;

    it('começa em 0% antes de qualquer etapa concluir', () => {
        expect(bootProgress(0, 0)).toBe(0);
        expect(bootProgress(BOOT_ANIMATION_MS, 0)).toBe(0);
    });

    it('com todas as etapas prontas, sobe no ritmo da animação até 100%', () => {
        expect(bootProgress(0, TOTAL)).toBe(0);
        const midway = bootProgress(Math.round(BOOT_ANIMATION_MS / 2), TOTAL);
        expect(midway).toBeGreaterThan(0);
        expect(midway).toBeLessThan(100);
        expect(bootProgress(BOOT_ANIMATION_MS, TOTAL)).toBe(100);
        expect(bootProgress(BOOT_ANIMATION_MS * 10, TOTAL)).toBe(100);
        // Sem a última etapa, mesmo com tempo de sobra fica no teto real.
        expect(bootProgress(BOOT_ANIMATION_MS * 10, TOTAL - 1)).toBe(Math.floor(((TOTAL - 1) / TOTAL) * 100));
    });

    it('cresce com o tempo e nunca passa do teto real das etapas', () => {
        let previous = 0;
        for (let ms = 0; ms <= BOOT_ANIMATION_MS; ms += 100) {
            const value = bootProgress(ms, TOTAL);
            expect(value).toBeGreaterThanOrEqual(previous);
            expect(value).toBeLessThanOrEqual(100);
            previous = value;
        }
        expect(previous).toBe(100);
        // Com metade das etapas prontas, o teto real limita a exibição.
        expect(bootProgress(BOOT_ANIMATION_MS, Math.floor(TOTAL / 2))).toBe(Math.floor((Math.floor(TOTAL / 2) / TOTAL) * 100));
    });

    it('aceita valores fora do intervalo sem quebrar', () => {
        expect(bootProgress(-500, 0)).toBe(0);
        expect(bootProgress(-500, TOTAL)).toBe(0);
        expect(bootProgress(BOOT_ANIMATION_MS, TOTAL + 5)).toBe(100);
        expect(bootProgress(100, -1)).toBe(0);
    });

    it('retorna 100% direto quando não há etapas', () => {
        expect(bootProgress(0, 0, 0)).toBe(100);
    });
});

describe('bootStepLabel', () => {
    it('mostra a etapa em andamento e o rótulo final ao concluir', () => {
        expect(bootStepLabel(0)).toBe(BOOT_STEPS[0].label);
        expect(bootStepLabel(1)).toBe(BOOT_STEPS[1].label);
        expect(bootStepLabel(BOOT_STEPS.length)).toBe(BOOT_DONE_LABEL);
        expect(bootStepLabel(BOOT_STEPS.length + 3)).toBe(BOOT_DONE_LABEL);
    });

    it('aceita valores fora do intervalo sem quebrar', () => {
        expect(bootStepLabel(-2)).toBe(BOOT_STEPS[0].label);
        expect(bootStepLabel(0, 0)).toBe(BOOT_DONE_LABEL);
    });
});
