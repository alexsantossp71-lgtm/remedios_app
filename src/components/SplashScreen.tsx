
import React, { useEffect, useRef, useState } from 'react';
import { PillIcon, ShieldIcon, ClockIcon, CheckCircleIcon, SparklesIcon } from '../constants';
import { bootProgress, bootStepLabel } from '../utils/bootProgress';

// Splash/Landing de primeiro uso: abre com um carregamento que mostra a
// porcentagem (0-100%) subindo, limitado por checagens reais de inicialização;
// depois mostra o carousel com 3 telas do app (mini-mockups em CSS),
// depoimento curto, selos de confiança e os botões Demo e Entrar.

const OfflineBadgeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 20h.01" />
        <path d="M8.5 16.4a5 5 0 0 1 7 0" />
        <path d="M5 12.9a10 10 0 0 1 3-1.9" />
        <path d="M19 12.9a10 10 0 0 0-3.5-2.1" />
        <path d="M2 8.8a15 15 0 0 1 4-2.4" />
        <path d="M22 8.8a15 15 0 0 0-4.5-2.6" />
        <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
);

/** Mini-mockup em CSS de uma tela real do app (sem imagens externas). */
const ScreenMockup: React.FC<{ kind: 'doses' | 'saude' | 'ia' }> = ({ kind }) => {
    if (kind === 'doses') {
        return (
            <div className="w-full rounded-2xl border border-teal-100 bg-white p-4 text-left shadow-sm dark:border-brand-gray-500 dark:bg-brand-gray-500">
                <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">Doses de hoje</p>
                <div className="mt-3 rounded-xl bg-teal-800 p-3 text-white">
                    <p className="text-[11px] font-semibold text-teal-100">Próxima dose</p>
                    <p className="text-lg font-extrabold">Omeprazol · 07:00</p>
                </div>
                <div className="mt-2 space-y-2">
                    {[['Losartana · 08:00', true], ['Paracetamol · 09:00', true]].map(([label, done]) => (
                        <div key={label as string} className="flex items-center justify-between rounded-lg border border-teal-50 bg-teal-50/60 px-3 py-2 dark:border-brand-gray-400 dark:bg-brand-gray-400/40">
                            <span className="text-xs font-semibold text-brand-gray-700 dark:text-white">{label}</span>
                            <CheckCircleIcon className={`h-4 w-4 ${done ? 'text-teal-600' : 'text-brand-gray-300'}`} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (kind === 'saude') {
        return (
            <div className="w-full rounded-2xl border border-teal-100 bg-white p-4 text-left shadow-sm dark:border-brand-gray-500 dark:bg-brand-gray-500">
                <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">Minha Saúde</p>
                <div className="mt-3 space-y-2">
                    <div className="rounded-lg border border-teal-50 bg-teal-50/60 p-3 dark:border-brand-gray-400 dark:bg-brand-gray-400/40">
                        <p className="text-xs font-bold text-brand-gray-700 dark:text-white">Cardiologia · 10:30</p>
                        <p className="text-[11px] text-brand-gray-500 dark:text-teal-100">Levar lista de medicamentos</p>
                    </div>
                    <div className="rounded-lg border border-teal-50 bg-teal-50/60 p-3 dark:border-brand-gray-400 dark:bg-brand-gray-400/40">
                        <p className="text-xs font-bold text-brand-gray-700 dark:text-white">Exames de sangue</p>
                        <p className="text-[11px] text-brand-gray-500 dark:text-teal-100">Resultado guardado com foto</p>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="w-full rounded-2xl border border-teal-100 bg-white p-4 text-left shadow-sm dark:border-brand-gray-500 dark:bg-brand-gray-500">
            <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">Ajuda inteligente</p>
            <div className="mt-3 space-y-2">
                <div className="rounded-lg border border-teal-50 bg-teal-50/60 p-3 dark:border-brand-gray-400 dark:bg-brand-gray-400/40">
                    <p className="text-xs font-bold text-brand-gray-700 dark:text-white">Receita → lembretes</p>
                    <p className="text-[11px] text-brand-gray-500 dark:text-teal-100">Foto da receita cria os horários</p>
                </div>
                <div className="rounded-lg border border-teal-50 bg-teal-50/60 p-3 dark:border-brand-gray-400 dark:bg-brand-gray-400/40">
                    <p className="text-xs font-bold text-brand-gray-700 dark:text-white">Interações e bula simples</p>
                    <p className="text-[11px] text-brand-gray-500 dark:text-teal-100">Explica em português claro</p>
                </div>
            </div>
        </div>
    );
};

const SLIDES: Array<{ kind: 'doses' | 'saude' | 'ia'; title: string; text: string }> = [
    { kind: 'doses', title: 'Nada de dose esquecida', text: 'O app avisa na hora certa e marca o que você já tomou.' },
    { kind: 'saude', title: 'Sua saúde num só lugar', text: 'Consultas, médicos, exames e laudos organizados com foto.' },
    { kind: 'ia', title: 'Ajuda que entende você', text: 'Leia a receita, confira interações e explique a bula em português claro.' },
];

interface Props {
    onStart: () => void;
    onDemo: () => void;
}

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

const SplashScreen: React.FC<Props> = ({ onStart, onDemo }) => {
    const [slide, setSlide] = useState(0);
    const [paused, setPaused] = useState(false);

    // Carregamento com porcentagem: a animação avança suave com o tempo, mas
    // só chega a 100% quando as checagens reais terminarem. Quem prefere menos
    // movimento (prefers-reduced-motion) pula direto para a landing.
    const [ready, setReady] = useState(() => prefersReducedMotion());
    const [stepsDone, setStepsDone] = useState(0);
    const [progress, setProgress] = useState(0);
    const stepsDoneRef = useRef(0);
    const startedAtRef = useRef(0);

    useEffect(() => {
        if (ready) return undefined;
        startedAtRef.current = Date.now();
        let cancelled = false;
        const completeStep = (count: number) => {
            if (cancelled || stepsDoneRef.current >= count) return;
            stepsDoneRef.current = count;
            setStepsDone(count);
        };
        const runChecks = async () => {
            for (let index = 0; index < BOOT_CHECKS.length; index++) {
                await withTimeout(BOOT_CHECKS[index], BOOT_CHECK_TIMEOUT_MS);
                completeStep(index + 1);
            }
        };
        void runChecks();
        const force = window.setTimeout(() => completeStep(BOOT_CHECKS.length), BOOT_FORCE_DONE_MS);
        return () => {
            cancelled = true;
            window.clearTimeout(force);
        };
    }, [ready]);

    useEffect(() => {
        if (ready) return undefined;
        let raf = 0;
        let cancelled = false;
        const tick = () => {
            if (cancelled) return;
            const value = bootProgress(Date.now() - startedAtRef.current, stepsDoneRef.current);
            setProgress(value);
            if (value >= 100) {
                setReady(true);
                return;
            }
            raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);
        return () => {
            cancelled = true;
            window.cancelAnimationFrame(raf);
        };
    }, [ready]);

    useEffect(() => {
        if (paused || !ready) return undefined;
        const timer = window.setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4500);
        return () => window.clearInterval(timer);
    }, [paused, ready]);

    const current = SLIDES[slide];

    if (!ready) {
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
    }

    return (
        <div className="flex min-h-dvh flex-col bg-gradient-to-b from-teal-800 via-teal-700 to-teal-600 px-4 pb-6 pt-10 text-white">
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 shadow-inner">
                        <PillIcon className="h-6 w-6 text-white" />
                    </span>
                    <div>
                        <h1 className="text-xl font-extrabold leading-tight">Remédios na Hora</h1>
                        <p className="text-xs text-teal-100">Sua rotina de cuidado, organizada</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setSlide((s) => (s + 1) % SLIDES.length)}
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                    className="mt-8 flex flex-1 flex-col items-center text-left focus:outline-none"
                    aria-label={`Tela ${slide + 1} de ${SLIDES.length}: ${current.title}. Toque para ver a próxima.`}
                >
                    <ScreenMockup kind={current.kind} />
                    <div className="mt-5 w-full">
                        <h2 className="text-xl font-extrabold">{current.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-teal-50/90">{current.text}</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2" role="tablist" aria-label="Telas da apresentação">
                        {SLIDES.map((item, index) => (
                            <span
                                key={item.title}
                                role="tab"
                                aria-selected={index === slide}
                                className={`h-2 rounded-full transition-all ${index === slide ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
                            />
                        ))}
                    </div>
                </button>

                <figure className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4">
                    <blockquote className="text-sm italic leading-6 text-teal-50">
                        “Em dia com os remédios da minha mãe sem depender de ninguém.”
                    </blockquote>
                    <figcaption className="mt-1 text-xs font-semibold text-teal-100">— Dona Ceci, cuida do marido há 3 anos</figcaption>
                </figure>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                        <OfflineBadgeIcon className="h-4 w-4" /> Funciona offline
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                        <ShieldIcon className="h-4 w-4" /> Seus dados ficam no seu celular
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                        <ClockIcon className="h-4 w-4" /> Experimente em 30s
                    </span>
                </div>

                <div className="mt-6 space-y-3">
                    <button
                        onClick={onDemo}
                        aria-label="Experimentar a demonstração: 30 segundos, sem cadastro"
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 py-3.5 text-sm font-bold text-white shadow transition hover:bg-white/20"
                    >
                        <SparklesIcon className="h-5 w-5" /> Demo
                    </button>
                    <button
                        onClick={onStart}
                        aria-label="Entrar e configurar o app"
                        className="w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-extrabold text-teal-800 shadow-lg transition hover:bg-teal-50"
                    >
                        Entrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
