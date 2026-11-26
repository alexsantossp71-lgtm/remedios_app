
import React, { useEffect, useRef, useState } from 'react';
import { PillIcon } from '../constants';
import { bootProgress, bootStepLabel } from '../utils/bootProgress';

// Carregamento inicial do app: roda em TODA abertura (novo usuário ou não).
// Mostra a porcentagem (0-100%) subindo, limitada por checagens reais de
// boot (armazenamento, service worker, fontes). Ao chegar em 100%, chama
// onDone e o App decide a próxima tela (splash para novos, doses para quem
// já usa). Quem prefere menos movimento pula direto para a próxima tela.

/** Uma checagem real por etapa de BOOT_STEPS, na mesma ordem. */
const BOOT_CHECKS: Array<() => Promise<void>> = [
    // 1. Armazenamento local responde (mesmo bloqueado, o app abre em memória).
    async () => {
        try {
            if (typeof localStorage === 'undefined') return;
            localStorage.setItem('__boot_probe__', '1');
            localStorage.removeItem('__boot_probe__');
        } catch { /* segue em memória */ }
    },
    // 2. Service worker (modo offline) já registrado ou registrável.
    async () => {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
        await navigator.serviceWorker.getRegistration();
    },
    // 3. Fontes prontas: evita trocar de fonte depois do primeiro render.
    async () => {
        if (typeof document === 'undefined') return;
        await document.fonts?.ready;
    },
];

/** Tempo máximo (ms) esperando cada checagem antes de seguir adiante. */
const BOOT_CHECK_TIMEOUT_MS = 1200;
/** Rede de segurança: conclui tudo mesmo que alguma checagem trave. */
const BOOT_FORCE_DONE_MS = 4000;

const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Corre a checagem com limite de tempo e nunca rejeita. */
const withTimeout = (check: () => Promise<void>, ms: number): Promise<void> =>
    Promise.race([
        check().catch(() => undefined),
        new Promise<void>((resolve) => { window.setTimeout(resolve, ms); }),
    ]);

interface Props {
    /** Chamado uma única vez, quando o carregamento termina. */
    onDone: () => void;
}

const BootLoader: React.FC<Props> = ({ onDone }) => {
    const [stepsDone, setStepsDone] = useState(0);
    const [progress, setProgress] = useState(0);
    const [skipped] = useState(prefersReducedMotion);
    const stepsDoneRef = useRef(0);
    const startedAtRef = useRef(0);
    const doneRef = useRef(false);

    // Redução de movimento: nada de animação, entrega a tela direto.
    useEffect(() => {
        if (skipped && !doneRef.current) {
            doneRef.current = true;
            onDone();
        }
    }, [skipped, onDone]);

    useEffect(() => {
        if (skipped) return undefined;
        startedAtRef.current = Date.now();
        let cancelled = false;
        let raf = 0;
        const completeStep = (count: number) => {
            if (!cancelled && stepsDoneRef.current < count) {
                stepsDoneRef.current = count;
                setStepsDone(count);
            }
        };
        const runChecks = async () => {
            for (let index = 0; index < BOOT_CHECKS.length; index++) {
                await withTimeout(BOOT_CHECKS[index], BOOT_CHECK_TIMEOUT_MS);
                completeStep(index + 1);
            }
        };
        const force = window.setTimeout(() => completeStep(BOOT_CHECKS.length), BOOT_FORCE_DONE_MS);
        const tick = () => {
            if (cancelled || doneRef.current) return;
            const value = bootProgress(Date.now() - startedAtRef.current, stepsDoneRef.current);
            setProgress(value);
            if (value >= 100) {
                cancelled = true;
                window.cancelAnimationFrame(raf);
                window.clearTimeout(force);
                doneRef.current = true;
                onDone();
                return;
            }
            raf = window.requestAnimationFrame(tick);
        };
        void runChecks();
        raf = window.requestAnimationFrame(tick);
        return () => {
            cancelled = true;
            window.cancelAnimationFrame(raf);
            window.clearTimeout(force);
        };
    }, [skipped, onDone]);

    return (
        <div className="flex min-h-dvh flex-col bg-gradient-to-b from-teal-800 via-teal-700 to-teal-600 px-4 text-white">
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 shadow-inner">
                    <PillIcon className="h-8 w-8 text-white" />
                </span>
                <h1 className="mt-4 text-2xl font-extrabold leading-tight">Remédios na Hora</h1>
                <p className="text-xs text-teal-100">Sua rotina de cuidado, organizada</p>

                <p className="mt-10 text-5xl font-extrabold tabular-nums" aria-hidden="true">{progress}%</p>
                <div
                    role="progressbar"
                    aria-label="Carregando o app"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    className="mt-4 h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-white/20"
                >
                    <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
                </div>
                <p aria-live="polite" className="mt-3 h-5 text-sm font-semibold text-teal-100">
                    {bootStepLabel(stepsDone)}
                </p>
            </div>
        </div>
    );
};

export default BootLoader;
