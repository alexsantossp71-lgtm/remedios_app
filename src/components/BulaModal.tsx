
import React, { useEffect, useState } from 'react';
import { AiError, explainMedication, type MedicationGuide } from '../services/nvidiaService';
import { hasAiAccess, useAiSettings } from '../services/settings';
import { getCachedGuide, guideCacheKey, storeGuide } from '../utils/bulaCache';
import { Reminder } from '../types';
import { InfoIcon, XIcon } from '../constants';
import { useEscapeToClose } from './formFields';

interface Props {
    /** Lembrete cujo medicamento será explicado (nome + dosagem + instruções). */
    reminder: Reminder;
    onClose: () => void;
    
}

type Status = 'loading' | 'done' | 'error' | 'nokey';

const GENERIC_ERROR = 'Não foi possível obter a explicação. Tente novamente.';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section>
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-gray-400 dark:text-brand-gray-500 mb-1.5">
            {title}
        </h4>
        {children}
    </section>
);

/** Explicação do medicamento ("bula simplificada") com cache no localStorage. */
const BulaModal: React.FC<Props> = ({ reminder, onClose }) => {
    const aiSettings = useAiSettings();
    const hasApiKey = hasAiAccess(aiSettings);

    // Cache verificado nos initializers: os estados iniciais já cobrem os
    // caminhos síncronos (em cache / sem chave / carregando) e o effect fica
    // só com a busca assíncrona, sem setState direto no corpo.
    const cacheKey = guideCacheKey(reminder.medicationName, reminder.dosage, reminder.instructions);
    const [guide, setGuide] = useState<MedicationGuide | null>(() => getCachedGuide(cacheKey));
    const [status, setStatus] = useState<Status>(() =>
        getCachedGuide(cacheKey) ? 'done' : hasApiKey ? 'loading' : 'nokey'
    );
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEscapeToClose(onClose);

    useEffect(() => {
        // Já veio do cache (guide preenchido) ou não há chave: nada a buscar.
        if (guide || !hasApiKey) return;
        let cancelled = false;
        explainMedication(reminder.medicationName, reminder.dosage, reminder.instructions)
            .then((result) => {
                if (cancelled) return;
                storeGuide(cacheKey, result);
                setGuide(result);
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
    }, [cacheKey, guide, hasApiKey, reminder, attempt]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-brand-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 relative max-h-[92vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-brand-gray-400 hover:text-brand-gray-600 dark:hover:text-brand-gray-200"
                    aria-label="Fechar"
                >
                    <XIcon className="w-6 h-6" />
                </button>
                <h3 className="text-lg font-medium leading-6 text-brand-gray-900 dark:text-white mb-1 pr-8">
                    Sobre {reminder.medicationName}
                </h3>
                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mb-4">
                    Explicação simples gerada automaticamente e salva neste dispositivo para evitar repetir a consulta.
                </p>

                {status === 'loading' && (
                    <div className="py-8 text-center" role="status">
                        <InfoIcon className="w-6 h-6 mx-auto text-brand-blue" />
                        <p className="text-sm font-semibold text-brand-blue mt-2">Consultando a IA...</p>
                        <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mt-1">
                            A primeira consulta deste remédio pode levar alguns segundos.
                        </p>
                    </div>
                )}

                {status === 'nokey' && (
                    <div className="rounded-lg border-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 py-6 px-3 text-center">
                        <InfoIcon className="w-6 h-6 mx-auto text-brand-gray-400" />
                        <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 mt-1.5">
                            Este recurso está temporariamente indisponível. Tente novamente mais tarde.
                        </p>
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

                {status === 'done' && guide && (
                    <div className="space-y-4 text-sm">
                        {guide.whatFor && (
                            <Section title="Para que serve">
                                <p className="text-brand-gray-700 dark:text-brand-gray-200">{guide.whatFor}</p>
                            </Section>
                        )}
                        {guide.howToUse && (
                            <Section title="Como tomar">
                                <p className="text-brand-gray-700 dark:text-brand-gray-200">{guide.howToUse}</p>
                            </Section>
                        )}
                        {guide.commonSideEffects.length > 0 && (
                            <Section title="Efeitos comuns">
                                <ul className="list-disc list-inside space-y-0.5 text-brand-gray-700 dark:text-brand-gray-200">
                                    {guide.commonSideEffects.map((item, index) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            </Section>
                        )}
                        {guide.warnings.length > 0 && (
                            <Section title="Atenção">
                                <ul className="list-disc list-inside space-y-0.5 text-brand-gray-700 dark:text-brand-gray-200">
                                    {guide.warnings.map((item, index) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            </Section>
                        )}
                        {guide.note && (
                            <p className="text-brand-gray-600 dark:text-brand-gray-300 italic">{guide.note}</p>
                        )}
                        <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 border-t border-brand-gray-200 dark:border-brand-gray-600 pt-3">
                            Informações gerais geradas por IA — consulte sempre a bula do fabricante e, em caso de dúvida,
                            seu médico ou farmacêutico.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulaModal;
