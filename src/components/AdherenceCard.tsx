
import React, { useEffect, useMemo, useState } from 'react';
import { Reminder } from '../types';
import { computeAdherence } from '../utils/adherence';
import {
    buildAdherenceReport,
    reportFingerprint,
    type AdherenceAnalysis,
    type AdherenceReport,
} from '../utils/adherenceInsights';
import { getCachedAnalysis, storeAnalysis } from '../utils/insightsCache';
import { AiError, analyzeAdherenceInsights } from '../services/nvidiaService';
import { useAiSettings } from '../services/settings';
import { ChartIcon, SparklesIcon, XIcon } from '../constants';
import { useEscapeToClose } from './formFields';

interface Props {
    reminders: Reminder[];
}

const AdherenceBar: React.FC<{ label: string; pct: number | null; taken: number; expected: number }> = ({
    label,
    pct,
    taken,
    expected,
}) => (
    <div>
        <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-semibold text-brand-gray-500 dark:text-brand-gray-400">{label}</span>
            <span className="text-sm font-bold text-brand-gray-800 dark:text-white">
                {pct === null ? '—' : `${pct}%`}
                <span className="ml-1.5 text-xs font-medium text-brand-gray-500 dark:text-brand-gray-400">
                    ({taken} de {expected} doses)
                </span>
            </span>
        </div>
        <div className="h-2.5 rounded-full bg-brand-gray-200 dark:bg-brand-gray-600 overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
            <div
                className={`h-full rounded-full transition-all ${
                    pct === null ? 'bg-transparent' : pct >= 80 ? 'bg-brand-green' : pct >= 50 ? 'bg-amber-500' : 'bg-brand-red'
                }`}
                style={{ width: `${pct ?? 0}%` }}
            />
        </div>
    </div>
);

type InsightsStatus = 'idle' | 'loading' | 'done' | 'error' | 'nokey';

/** Seção "Análise IA": transforma as estatísticas em texto útil em português. */
const AdherenceInsightsSection: React.FC<{ report: AdherenceReport; fingerprint: string }> = ({
    report,
    fingerprint,
}) => {
    const aiSettings = useAiSettings();
    const hasApiKey = Boolean(aiSettings.nvidiaApiKey.trim());

    // Initializers leem o cache do relatório ATUAL (o pai re-monta este
    // componente via key=fingerprint quando os dados mudam) — nada de
    // setState síncrono dentro de effect.
    const [status, setStatus] = useState<InsightsStatus>(() =>
        getCachedAnalysis(fingerprint) ? 'done' : 'idle'
    );
    const [analysis, setAnalysis] = useState<AdherenceAnalysis | null>(() => getCachedAnalysis(fingerprint));
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (status !== 'loading') return;
        let cancelled = false;
        analyzeAdherenceInsights(report)
            .then((result) => {
                if (cancelled) return;
                storeAnalysis(fingerprint, result);
                setAnalysis(result);
                setStatus('done');
            })
            .catch((err) => {
                if (cancelled) return;
                setStatus('error');
                setError(err instanceof AiError ? err.message : 'Não foi possível gerar a análise. Tente novamente.');
            });
        return () => {
            cancelled = true;
        };
    }, [status, fingerprint, report, attempt]);

    useEscapeToClose(() => setStatus('idle'));

    if (status === 'idle' && !analysis) {
        return (
            <button
                type="button"
                onClick={() => setStatus(hasApiKey ? 'loading' : 'nokey')}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-brand-blue border border-brand-gray-300 dark:border-brand-gray-600 rounded-lg py-2 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700 transition-colors"
                title="A IA lê suas estatísticas e aponta padrões nas doses perdidas"
            >
                <SparklesIcon className="w-4 h-4" />
                Análise IA da adesão
            </button>
        );
    }

    if (status === 'nokey') {
        return (
            <div className="rounded-lg border-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 py-3 px-3 text-center">
                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400">
                    A análise usa a chave da API NVIDIA configurada neste dispositivo.
                </p>
                <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="mt-1.5 text-xs font-semibold text-brand-blue hover:underline"
                >
                    Voltar
                </button>
            </div>
        );
    }

    if (status === 'loading') {
        return (
            <div className="py-2 text-center" role="status">
                <p className="text-xs font-semibold text-brand-blue">
                    <SparklesIcon className="w-4 h-4 inline mr-1 -mt-0.5" />
                    Analisando suas doses com a IA...
                </p>
                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mt-0.5">Pode levar alguns segundos.</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="rounded-lg bg-brand-gray-100 dark:bg-brand-gray-700 p-3 text-center">
                <p className="text-xs font-medium text-brand-red" role="alert">{error}</p>
                <div className="mt-2 flex justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setError(null);
                            setStatus('loading');
                            setAttempt((a) => a + 1);
                        }}
                        className="text-xs font-semibold text-brand-blue hover:underline"
                    >
                        Tentar de novo
                    </button>
                    <button type="button" onClick={() => setStatus('idle')} className="text-xs font-semibold text-brand-gray-500 hover:underline">
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    if (!analysis) return null;

    return (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 space-y-2 relative">
            <button
                type="button"
                onClick={() => setStatus('idle')}
                className="absolute top-2 right-2 text-brand-gray-400 hover:text-brand-gray-600 dark:hover:text-brand-gray-200"
                aria-label="Fechar análise"
            >
                <XIcon className="w-4 h-4" />
            </button>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5" />
                Análise IA
            </p>
            {analysis.summary && (
                <p className="text-sm text-brand-gray-700 dark:text-brand-gray-200">{analysis.summary}</p>
            )}
            {analysis.insights.map((insight, index) => (
                <div key={index} className="text-sm space-y-0.5 border-t border-blue-100 dark:border-blue-800/60 pt-2">
                    {insight.title && <p className="font-semibold text-brand-gray-800 dark:text-white">{insight.title}</p>}
                    {insight.detail && <p className="text-brand-gray-600 dark:text-brand-gray-300">{insight.detail}</p>}
                    {insight.suggestion && (
                        <p className="text-xs text-blue-700 dark:text-blue-300">Dica: {insight.suggestion}</p>
                    )}
                </div>
            ))}
            <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 border-t border-blue-100 dark:border-blue-800/60 pt-2">
                Análise educativa gerada por IA a partir do seu histórico — não substitui a orientação do seu médico.
            </p>
        </div>
    );
};

/** Relatório de adesão: % de doses tomadas nos últimos 7 e 30 dias + análise IA. */
const AdherenceCard: React.FC<Props> = ({ reminders }) => {
    const week = computeAdherence(reminders, 7);
    const month = computeAdherence(reminders, 30);
    // Relatório e fingerprint calculados uma vez por mudança do histórico;
    // o fingerprint também é a key da seção (dados mudaram → re-monta e
    // re-le o cache com a chave nova).
    const report = useMemo(() => buildAdherenceReport(reminders), [reminders]);
    const fingerprint = useMemo(() => reportFingerprint(report), [report]);

    if (week.expected === 0 && month.expected === 0) return null;

    return (
        <div className="mt-4 border-t border-brand-gray-200 dark:border-brand-gray-600 pt-4 space-y-3">
            <div className="flex items-center gap-2">
                <ChartIcon className="w-4 h-4 text-brand-blue" />
                <h3 className="text-sm font-semibold text-brand-gray-700 dark:text-brand-gray-300">Adesão às doses</h3>
            </div>
            <AdherenceBar label="Últimos 7 dias" pct={week.pct} taken={week.taken} expected={week.expected} />
            <AdherenceBar label="Últimos 30 dias" pct={month.pct} taken={month.taken} expected={month.expected} />
            {month.skipped > 0 && (
                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400">
                    No período, {month.skipped} dose(s) foi(ram) marcada(s) como pulada(s) por você.
                </p>
            )}
            <AdherenceInsightsSection key={fingerprint} report={report} fingerprint={fingerprint} />
        </div>
    );
};

export default AdherenceCard;
