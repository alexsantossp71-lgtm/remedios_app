
import React, { useRef, useState } from 'react';
import { Reminder, ReminderStatus } from '../types';
import { AiError, identifyMedication } from '../services/nvidiaService';
import { hasAiAccess, useAiSettings } from '../services/settings';
import { fileToCompressedDataUrl } from '../utils/image';
import { guardianVerdict } from '../utils/medicationCheck';
import { CheckCircleIcon, CameraIcon, ShieldIcon, XCircleIcon, BellIcon, XIcon } from '../constants';

interface Props {
    reminder: Reminder;
    time: string;
    onAction: (reminderId: string, time: string, status: ReminderStatus) => void;
    /** Abre a tela de Configurações (exibida quando a chave de IA não está definida). */
    onOpenSettings?: () => void;
}

type GuardianState =
    | { kind: 'hidden' }
    | { kind: 'capture' }
    | { kind: 'checking' }
    | { kind: 'result'; detected: string; verdict: ReturnType<typeof guardianVerdict>; detail: string };

/** Guardião da dose: foto da embalagem conferida com o lembrete disparado. */
const GuardianCheck: React.FC<{
    reminder: Reminder;
    onOpenSettings?: () => void;
}> = ({ reminder, onOpenSettings }) => {
    const aiSettings = useAiSettings();
    const hasApiKey = hasAiAccess(aiSettings);
    const [state, setState] = useState<GuardianState>({ kind: 'hidden' });
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Escolha uma foto da caixa, cartela ou frasco do medicamento.');
            return;
        }
        setError(null);
        setState({ kind: 'checking' });
        try {
            const dataUrl = await fileToCompressedDataUrl(file);
            const mimeMatch = /^data:([^;]+);/.exec(dataUrl);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
            const result = await identifyMedication(base64, mimeType);
            const verdict = guardianVerdict(result.medication, reminder.medicationName, result.confidence);
            setState({ kind: 'result', detected: result.medication, verdict, detail: result.detail });
        } catch (err) {
            setState({ kind: 'capture' });
            setError(
                err instanceof AiError
                    ? err.message
                    : 'Não foi possível ler a embalagem agora. Confira manualmente o nome do medicamento.'
            );
        }
    };

    const reset = () => {
        setState({ kind: 'hidden' });
        setError(null);
    };

    if (state.kind === 'hidden') {
        return (
            <button
                onClick={() => setState({ kind: 'capture' })}
                className="w-full flex items-center justify-center text-sm font-semibold text-brand-blue py-2 rounded-lg hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700 transition-colors"
                title="Fotografa a caixa/cartela e a IA confere se é o medicamento desta dose"
            >
                <ShieldIcon className="w-4 h-4 mr-1.5" />
                Conferir embalagem (IA)
            </button>
        );
    }

    if (state.kind === 'capture' || state.kind === 'checking') {
        return (
            <div className="mt-1 rounded-lg bg-brand-gray-100 dark:bg-brand-gray-700 p-3">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-gray-500 dark:text-brand-gray-400 flex items-center gap-1.5">
                        <ShieldIcon className="w-3.5 h-3.5" />
                        Guardião da dose
                    </p>
                    <button onClick={reset} className="text-brand-gray-400 hover:text-brand-gray-600" aria-label="Fechar conferência">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="sr-only"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={state.kind === 'checking'}
                    className="w-full flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 py-4 text-brand-gray-500 dark:text-brand-gray-400 hover:border-brand-blue hover:text-brand-blue transition-colors disabled:opacity-60"
                >
                    <CameraIcon className="w-6 h-6" />
                    <span className="text-sm font-semibold">
                        {state.kind === 'checking' ? 'Lendo a embalagem...' : 'Fotografar caixa/cartela'}
                    </span>
                    <span className="text-xs">Deve aparecer o nome do medicamento</span>
                </button>
                {state.kind === 'checking' && (
                    <p className="mt-2 text-center text-xs text-brand-blue font-semibold" role="status">
                        A IA lê o nome impresso e compara com {reminder.medicationName}...
                    </p>
                )}
                {error && <p className="mt-2 text-xs font-medium text-brand-red" role="alert">{error}</p>}
                <p className="mt-2 text-xs text-brand-gray-500 dark:text-brand-gray-400">
                    A foto é enviada à NVIDIA apenas para leitura e não é salva no app.
                </p>
                {!hasApiKey && (
                    <p className="mt-1 text-center text-xs">
                        <button type="button" onClick={() => onOpenSettings?.()} className="font-semibold text-brand-blue hover:underline">
                            A conferência precisa da IA configurada (proxy ou chave) — configurar
                        </button>
                    </p>
                )}
            </div>
        );
    }

    const { verdict, detected, detail } = state;

    return (
        <div
            className={`mt-1 rounded-lg p-3 border-2 ${
                verdict.kind === 'match'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : verdict.kind === 'mismatch'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
            }`}
            role="alert"
        >
            <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-gray-500 dark:text-brand-gray-400 flex items-center gap-1.5">
                    <ShieldIcon className="w-3.5 h-3.5" />
                    Guardião da dose
                </p>
                <button onClick={reset} className="text-brand-gray-400 hover:text-brand-gray-600" aria-label="Fechar conferência">
                    <XIcon className="w-4 h-4" />
                </button>
            </div>
            {verdict.kind === 'match' && (
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    Parece correto: {detected || reminder.medicationName}. Confirme a dose com segurança.
                </p>
            )}
            {verdict.kind === 'mismatch' && (
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    Atenção: a embalagem parece ser de {detected}, mas a dose de agora é {verdict.expected}. Confira antes de tomar!
                </p>
            )}
            {verdict.kind === 'unsure' && (
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    Não consegui ler o nome com segurança{detail ? ` (${detail})` : ''}. Confira manualmente se a embalagem é de {verdict.expected}.
                </p>
            )}
            <p className="mt-1.5 text-xs text-brand-gray-500 dark:text-brand-gray-400">
                Leitura por IA do nome impresso — remédios combinados podem conter o mesmo princípio ativo. Em caso de dúvida, confira a bula.
            </p>
        </div>
    );
};

const NotificationModal: React.FC<Props> = ({ reminder, time, onAction, onOpenSettings }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-brand-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center transform transition-all animate-slide-up">
                <BellIcon className="w-16 h-16 text-brand-yellow mx-auto mb-4 animate-pulse" />

                <h2 className="text-2xl font-bold text-brand-gray-900 dark:text-white">Hora do Remédio!</h2>
                
                <p className="text-brand-gray-600 dark:text-brand-gray-300 mt-2">
                    Está na hora de tomar seu medicamento:
                </p>

                <div className="my-6 p-4 bg-brand-gray-100 dark:bg-brand-gray-700 rounded-lg">
                    <p className="text-xl font-semibold text-brand-blue">{reminder.medicationName}</p>
                    <p className="text-3xl font-bold text-brand-gray-800 dark:text-white mt-1">{time}</p>
                    {(reminder.dosage || reminder.instructions) && (
                        <div className="mt-3 pt-3 border-t border-brand-gray-200 dark:border-brand-gray-600">
                            {reminder.dosage && (
                                <p className="text-sm font-semibold text-brand-gray-800 dark:text-white">{reminder.dosage}</p>
                            )}
                            {reminder.instructions && (
                                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mt-0.5">{reminder.instructions}</p>
                            )}
                        </div>
                    )}
                </div>

                <GuardianCheck reminder={reminder} onOpenSettings={onOpenSettings} />
                
                <div className="flex flex-col space-y-3 mt-3">
                    <button
                        onClick={() => onAction(reminder.id, time, ReminderStatus.TAKEN)}
                        className="w-full flex items-center justify-center bg-brand-green text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-green-600 transition-transform transform hover:scale-105"
                    >
                        <CheckCircleIcon className="w-6 h-6 mr-2" />
                        Confirmar que tomei
                    </button>
                    <button
                        onClick={() => onAction(reminder.id, time, ReminderStatus.SKIPPED)}
                        className="w-full flex items-center justify-center bg-brand-red text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-red-600 transition-transform transform hover:scale-105"
                    >
                        <XCircleIcon className="w-6 h-6 mr-2" />
                        Ignorar dose
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }

                @keyframes slide-up {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default NotificationModal;
