
import React, { useEffect, useState } from 'react';
import { AiError, suggestSchedule } from '../services/nvidiaService';
import { hasAiAccess, useAiSettings } from '../services/settings';
import type { Reminder } from '../types';
import type { ScheduleAdvice, ScheduleAdvisorMed, ScheduleSuggestion } from '../utils/scheduleAdvisor';
import { ShieldIcon, SparklesIcon, XIcon } from '../constants';
import { useEscapeToClose } from './formFields';

interface Props {
    /** Lembretes ativos — os horários desses serão reorganizados pela IA. */
    reminders: Reminder[];
    /** Aplica os horários escolhidos (um item por lembrete selecionado). */
    onApply: (updates: Array<{ id: string; times: string[] }>) => void;
    onClose: () => void;
}

type Status = 'loading' | 'done' | 'error' | 'nokey';

const GENERIC_ERROR = 'Não foi possível concluir a análise. Tente novamente.';

/** Converte os lembretes do app para o formato que o modelo recebe. */
const toAdvisorMeds = (reminders: Reminder[]): ScheduleAdvisorMed[] =>
    reminders.map((reminder) => ({
        id: reminder.id,
        name: reminder.medicationName,
        dosage: reminder.dosage ?? '',
        instructions: reminder.instructions ?? '',
        times: reminder.times.filter(Boolean),
        frequencyDays: (reminder.frequency?.days ?? 1) > 1 ? reminder.frequency.days : 1,
        continuous: reminder.duration?.type === 'continuous',
    }));

const TimeChip: React.FC<{ time: string }> = ({ time }) => (
    <span className="inline-flex px-2 py-0.5 rounded-md text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
        {time}
    </span>
);

/**
 * Agendamento inteligente (IA): sugere novos horários respeitando jejum,
 * intervalos e a rotina de sono; o usuário revisa, marca e aplica por lembrete.
 */
const ScheduleAdvisorModal: React.FC<Props> = ({ reminders, onApply, onClose }) => {
    const aiSettings = useAiSettings();
    const canUseAi = hasAiAccess(aiSettings);

    // Estados iniciais cobrem os caminhos síncronos (sem IA / carregando);
    // o effect cuida só da busca assíncrona, sem setState direto no corpo.
    const [status, setStatus] = useState<Status>(canUseAi ? 'loading' : 'nokey');
    const [advice, setAdvice] = useState<ScheduleAdvice | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [checked, setChecked] = useState<boolean[]>([]);

    useEscapeToClose(onClose);

    const meds = toAdvisorMeds(reminders);

    useEffect(() => {
        if (!canUseAi) return;
        let cancelled = false;
        suggestSchedule(meds)
            .then((result) => {
                if (cancelled) return;
                setAdvice(result);
                setChecked(result.suggestions.map((s) => s.changed));
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
        // `meds` deriva de `reminders`, que não muda com o modal aberto.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canUseAi, attempt]);

    const selectedIds = advice
        ? advice.suggestions.filter((s) => s.changed && checked[advice.suggestions.indexOf(s)]).map((s) => s.medicationId)
        : [];
    const selectedCount = selectedIds.length;
    const hasSuggestions = Boolean(advice && advice.suggestions.length > 0);
    const hasChanges = Boolean(advice && advice.suggestions.some((s) => s.changed));

    const toggle = (globalIndex: number) =>
        setChecked((prev) => prev.map((value, i) => (i === globalIndex ? !value : value)));

    const applySelected = () => {
        if (!advice || selectedCount === 0) return;
        const updates = advice.suggestions
            .filter((s) => selectedIds.includes(s.medicationId))
            .map((s) => ({ id: s.medicationId, times: s.suggestedTimes }));
        const details = updates.map((update) => {
            const suggestion = advice.suggestions.find((item) => item.medicationId === update.id)!;
            return `${suggestion.medicationName}: ${suggestion.changes.map((change) => `${change.from} → ${change.to}`).join(', ')}`;
        }).join(String.fromCharCode(10));
        const confirmed = window.confirm(
            `Você está prestes a alterar somente os horários dos lembretes selecionados:${String.fromCharCode(10)}${String.fromCharCode(10)}${details}${String.fromCharCode(10)}${String.fromCharCode(10)}Compare cada sugestão com a receita. A IA pode errar; não altere dose, frequência ou duração prescrita. Deseja aplicar?`
        );
        if (!confirmed) return;
        onApply(updates);
        onClose();
    };

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
                    Otimizar horários com IA
                </h3>
                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mb-4">
                    A IA só propõe opções de horário. Não altera dose, frequência ou duração prescrita. A sugestão não substitui orientação médica ou farmacêutica.
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
                        <p className="text-sm font-semibold text-brand-blue">
                            Analisando {meds.length} lembrete{meds.length === 1 ? '' : 's'} com a IA...
                        </p>
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

                {status === 'done' && advice && (
                    <div className="space-y-4">
                        {advice.summary && (
                            <p className="text-sm rounded-lg bg-brand-gray-100 dark:bg-brand-gray-700 p-3 text-brand-gray-700 dark:text-brand-gray-200">
                                {advice.summary}
                            </p>
                        )}

                        {!hasSuggestions && (
                            <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20 p-3 text-sm text-green-800 dark:text-green-300">
                                Nenhuma mudança foi sugerida — seus horários já parecem bem distribuídos.
                            </div>
                        )}

                        {advice.suggestions.map((suggestion: ScheduleSuggestion) => {
                            const globalIndex = advice.suggestions.indexOf(suggestion);
                            const isChecked = Boolean(checked[globalIndex]);
                            return (
                                <label
                                    key={suggestion.medicationId}
                                    className={`block rounded-lg bg-brand-gray-100 dark:bg-brand-gray-700 p-3 text-sm ${
                                        suggestion.changed ? 'cursor-pointer' : 'opacity-80'
                                    }`}
                                >
                                    <span className="flex items-start gap-3">
                                        {suggestion.changed ? (
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggle(globalIndex)}
                                                className="mt-1 h-4 w-4 rounded border-brand-gray-300 text-brand-blue focus:ring-brand-blue"
                                            />
                                        ) : (
                                            <SparklesIcon className="w-4 h-4 mt-1 flex-shrink-0 text-brand-gray-400" />
                                        )}
                                        <span className="flex-1">
                                            <span className="block font-bold text-brand-gray-900 dark:text-white">
                                                {suggestion.medicationName}
                                            </span>
                                            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                {suggestion.suggestedTimes.map((time, i) => (
                                                    <TimeChip key={`${time}-${i}`} time={time} />
                                                ))}
                                            </span>
                                            {suggestion.changed && suggestion.changes.length > 0 && (
                                                <span className="mt-1 block text-xs text-brand-gray-500 dark:text-brand-gray-400">
                                                    Mudanças:{' '}
                                                    {suggestion.changes.map((change, i) => (
                                                        <span key={i} className="whitespace-nowrap">
                                                            {change.from} →{' '}
                                                            <span className="font-semibold text-green-700 dark:text-green-400">
                                                                {change.to}
                                                            </span>
                                                            {i < suggestion.changes.length - 1 ? ', ' : ''}
                                                        </span>
                                                    ))}
                                                </span>
                                            )}
                                            {!suggestion.changed && (
                                                <span className="mt-1 block text-xs text-brand-gray-500 dark:text-brand-gray-400">
                                                    Horários mantidos — a rotina atual já está boa.
                                                </span>
                                            )}
                                            {suggestion.reason && (
                                                <span className="mt-1.5 block text-brand-gray-600 dark:text-brand-gray-300">
                                                    {suggestion.reason}
                                                </span>
                                            )}
                                            {suggestion.warnings.map((warning, i) => (
                                                <span
                                                    key={i}
                                                    className="mt-1.5 block text-xs font-medium text-amber-700 dark:text-amber-400"
                                                >
                                                    Atenção: {warning}
                                                </span>
                                            ))}
                                        </span>
                                    </span>
                                </label>
                            );
                        })}

                        {hasChanges && (
                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={applySelected}
                                    disabled={selectedCount === 0}
                                    className="w-full px-4 py-2 bg-brand-green text-white rounded-md hover:bg-green-600 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    Aplicar {selectedCount} horário{selectedCount === 1 ? '' : 's'} sugerido
                                    {selectedCount === 1 ? '' : 's'}
                                </button>
                                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400">
                                    O lembrete passa a tocar nos novos horários; o histórico de doses anteriores é
                                    preservado. Você pode ajustar tudo depois em cada lembrete.
                                </p>
                            </div>
                        )}

                        <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 border-t border-brand-gray-200 dark:border-brand-gray-600 pt-3">
                            Sugestões geradas por IA apenas para revisão, com base nos dados cadastrados. Nenhuma fonte clínica externa foi consultada nesta sugestão. Não alteram dose, frequência ou duração. Se a receita tiver horários fixos ou se o intervalo prescrito não estiver claro, mantenha a prescrição e consulte seu médico ou farmacêutico.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScheduleAdvisorModal;
