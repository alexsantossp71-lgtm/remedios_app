
// Progresso do carregamento inicial mostrado no splash (0-100%).
// A porcentagem avança suave com o tempo (curva ease-out: sobe rápido no
// começo e desacelera perto do fim), mas é limitada pelo teto real das
// etapas de inicialização concluídas — só chega a 100 quando tudo terminar.

export interface BootStep {
    /** Identificador estável da etapa (usado em testes e na checagem real). */
    id: string;
    /** Texto mostrado ao usuário enquanto a etapa está em andamento. */
    label: string;
}

/** Etapas reais do carregamento, na ordem em que são verificadas. */
export const BOOT_STEPS: BootStep[] = [
    { id: 'storage', label: 'Abrindo o armazenamento…' },
    { id: 'offline', label: 'Preparando o modo offline…' },
    { id: 'dados', label: 'Carregando suas informações…' },
];

/** Texto exibido quando todas as etapas terminaram. */
export const BOOT_DONE_LABEL = 'Tudo pronto!';

/** Duração alvo da animação (ms) quando todas as checagens respondem rápido. */
export const BOOT_ANIMATION_MS = 1800;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Ease-out cúbico (0-1): início rápido, chegada suave. */
const easeOutCubic = (t: number): number => 1 - (1 - clamp(t, 0, 1)) ** 3;

/**
 * Porcentagem exibida (0-100):
 * - cresce com o tempo decorrido, para o número ser visível subindo;
 * - nunca ultrapassa o teto real (etapas concluídas / total);
 * - com todas as etapas concluídas o teto abre para 100, mas a porcentagem
 *   continua subindo no ritmo da animação (duração mínima visível).
 */
export function bootProgress(elapsedMs: number, stepsDone: number, totalSteps: number = BOOT_STEPS.length): number {
    if (totalSteps <= 0) return 100;
    if (stepsDone < 0) return 0;
    const ceiling = stepsDone >= totalSteps ? 100 : Math.floor((stepsDone / totalSteps) * 100);
    if (ceiling === 0) return 0;
    const timeShare = Math.round(easeOutCubic(elapsedMs / BOOT_ANIMATION_MS) * 100);
    return clamp(timeShare, 0, ceiling);
}

/** Rótulo da etapa em andamento (ou o final, quando tudo já concluiu). */
export function bootStepLabel(stepsDone: number, totalSteps: number = BOOT_STEPS.length): string {
    if (totalSteps <= 0 || stepsDone >= totalSteps) return BOOT_DONE_LABEL;
    const index = clamp(Math.floor(stepsDone), 0, BOOT_STEPS.length - 1);
    return BOOT_STEPS[index].label;
}
