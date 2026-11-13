
import React, { useEffect, useState } from 'react';
import { AiError, analyzeInteractions, type InteractionReport } from '../services/nvidiaService';
import { hasAiAccess, useAiSettings } from '../services/settings';
import { ShieldIcon, XIcon } from '../constants';
import { useEscapeToClose } from './formFields';

interface Props {
    /** Lembretes ativos (nome + dosagem) enviados à análise. */
    medications: Array<{ name: string; dosage?: string }>;
    onClose: () => void;
}

type Status = 'loading' | 'done' | 'error' | 'nokey';

const GENERIC_ERROR = 'Não foi possível concluir a análise. Tente novamente.';

const severityChip: Record<InteractionReport['interactions'][number]['severity'], { label: string; className: string }> = {
    alta: { label: 'Risco alto', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    moderada: { label: 'Risco moderado', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
    baixa: { label: 'Risco baixo', className: 'bg-brand-gray-200 text-brand-gray-700 dark:bg-brand-gray-600 dark:text-brand-gray-200' },
};

/** Análise educativa de interações/duplicidades; roda sozinha ao abrir. */
const InteractionsModal: React.FC<Props> = ({ medications, onClose }) => {
    const aiSettings = useAiSettings();
    const hasApiKey = hasAiAccess(aiSettings);

    // Estados iniciais cobrem os caminhos síncronos (carregando / sem chave);
    // o effect cuida só da busca assíncrona, sem setState direto no corpo.
    const [status, setStatus] = useState<Status>(hasApiKey ? 'loading' : 'nokey');
    const [report, setReport] = useState<InteractionReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEscapeToClose(onClose);

    useEffect(() => {
        if (!hasApiKey) return;
        let cancelled = false;
        analyzeInteractions(medications)
            .then((result) => {
                if (cancelled) return;
                setReport(result);
                setStatus('done');
            })
            .catch((err) => {
                if (cancelled) return;
                setStatus('error');
                setError(err instanceof AiError ? err.message : GENERIC_ERROR);
            });
        return () => {
            cancelled = true;
        };
    }, [hasApiKey, medications, attempt]);

    const noCombinations =
        status === 'done' && report && report.duplicates.length === 0 && report.interactions.length === 0;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="relative max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/70 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:max-h-[90dvh] sm:rounded-3xl sm:p-7">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    aria-label="Fechar"
                >
                    <XIcon className="w-6 h-6" />
                </button>
                <h3 className="text-lg font-medium leading-6 text-brand-gray-900 dark:text-white mb-1">
                    Análise de interações
                </h3>
                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mb-4">
                    Análise preliminar por IA — não é uma verificação farmacêutica definitiva. A ausência de alertas não garante que não existam interações.
                </p>

                {status === 'nokey' && (
                    <div className="rounded-lg border-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 py-6 px-3 text-center">
                        <ShieldIcon className="w-6 h-6 mx-auto text-brand-gray-400" />
                        <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 mt-1.5">
                            Este recurso está temporariamente indisponível. Tente novamente mais tarde.
                        </p>
                    </div>
                )}

                {status === 'loading' && (
                    <div className="py-8 text-center" role="status">
                        <p className="text-sm font-semibold text-brand-blue">Analisando {medications.length} medicamentos com a IA...</p>
                        <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mt-1">Pode levar alguns segundos.</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="rounded-lg bg-brand-gray-100 dark:bg-brand-gray-700 p-4 text-center">
                        <p className="text-sm font-medium text-brand-red" role="alert">{error}</p>
                        <button
                            type="button"
                            onClick={() => {
                                setStatus('loading');
                                setError(null);
                                setAttempt((a) => a + 1);
                            }}
                            className="mt-3 px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-600 text-sm font-semibold"
                        >
                            Tentar de novo
                        </button>
                    </div>
                )}

                {status === 'done' && report && (
                    <div className="space-y-4">
                        {report.summary && (
                            <p className="text-sm rounded-lg bg-brand-gray-100 dark:bg-brand-gray-700 p-3 text-brand-gray-700 dark:text-brand-gray-200">
                                {report.summary}
                            </p>
                        )}

                        {noCombinations && (
                            <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20 p-3 text-sm text-green-800 dark:text-green-300">
                                A IA não identificou alertas nesta lista. Isso não comprova que a combinação seja segura nem exclui interações. Confirme a lista completa com um farmacêutico ou médico.
                            </div>
                        )}

                        {report.duplicates.length > 0 && (
                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-gray-400 dark:text-brand-gray-500 mb-2">
                                    Duplicidade de princípio ativo
                                </h4>
                                <div className="space-y-2">
                                    {report.duplicates.map((group, index) => (
                                        <div key={index} className="rounded-lg bg-brand-gray-100 dark:bg-brand-gray-700 p-3 text-sm">
                                            <p className="font-bold text-brand-gray-900 dark:text-white">
                                                {group.activeIngredient}
                                            </p>
                                            <p className="text-brand-blue dark:text-blue-400 font-semibold mt-0.5">
                                                {group.medications.join(' + ')}
                                            </p>
                                            {group.note && (
                                                <p className="text-brand-gray-600 dark:text-brand-gray-300 mt-1">{group.note}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {report.interactions.length > 0 && (
                            <section>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-gray-400 dark:text-brand-gray-500 mb-2">
                                    Interações de atenção
                                </h4>
                                <div className="space-y-2">
                                    {report.interactions.map((alert, index) => {
                                        const chip = severityChip[alert.severity];
                                        return (
                                            <div key={index} className="rounded-lg bg-brand-gray-100 dark:bg-brand-gray-700 p-3 text-sm">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-bold text-brand-gray-900 dark:text-white">
                                                        {alert.medications.join(' + ')}
                                                    </p>
                                                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${chip.className}`}>
                                                        {chip.label}
                                                    </span>
                                                </div>
                                                <p className="text-brand-gray-600 dark:text-brand-gray-300 mt-1">{alert.description}</p>
                                                {alert.recommendation && (
                                                    <p className="text-brand-gray-700 dark:text-brand-gray-200 mt-1 font-medium">
                                                        O que fazer: {alert.recommendation}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 border-t border-brand-gray-200 dark:border-brand-gray-600 pt-3">
                            Análise preliminar gerada por IA a partir dos nomes cadastrados. Pode haver omissões ou confusão entre medicamentos de nomes semelhantes. Não altere, suspenda ou ajuste doses por causa deste resultado; confirme com médico ou farmacêutico.
                        </p>
                        <div className="text-xs text-brand-gray-500 dark:text-brand-gray-400">
                            <strong>Fontes e data de referência:</strong>
                            {report.sources.length ? (
                                <ul className="mt-1 list-disc pl-4">{report.sources.map((source, index) => <li key={`${source.name}-${index}`}>{source.name}{source.date ? ` — ${source.date}` : ' — data não informada'} <span className="italic">(informação declarada pela IA; não verificada independentemente)</span></li>)}</ul>
                            ) : <p className="mt-1">Nenhuma fonte clínica ou data de referência foi identificada nesta resposta. Não trate o resultado como confirmação farmacêutica.</p>}
                        </div>
                        <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 border-t border-brand-gray-200 dark:border-brand-gray-600 pt-3">
                            Não altere seu tratamento sem orientação profissional.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InteractionsModal;
