
import React, { useMemo, useRef, useState } from 'react';
import { AiError, parsePrescriptionText, scanPrescription } from '../services/nvidiaService';
import { fileToCompressedDataUrl } from '../utils/image';
import { toDateInputValue } from '../utils/datetime';
import { describeDraft, draftsFromPrescription, type PrescriptionEntry, type ReminderDraft } from '../utils/prescription';
import { CameraIcon, FileTextIcon, XIcon } from '../constants';
import { helperClass, inputClass, labelClass, useEscapeToClose } from './formFields';

interface Props {
    onClose: () => void;
    /** Recebe os lembretes confirmados pelo usuário e fecha o modal no App. */
    onImport: (drafts: ReminderDraft[]) => void;
}

const GENERIC_ERROR =
    'Não foi possível ler a receita. Tente novamente ou cadastre o lembrete manualmente.';

type Mode = 'photo' | 'text';
type Status = 'idle' | 'loading' | 'error';

/** Prévia dos medicamentos reconhecidos; o usuário marca quais viram lembretes. */
const PrescriptionImportModal: React.FC<Props> = ({ onClose, onImport }) => {

    const [mode, setMode] = useState<Mode>('photo');
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [entries, setEntries] = useState<PrescriptionEntry[] | null>(null);
    const [checked, setChecked] = useState<boolean[]>([]);
    // Início padrão (hoje, fuso local); a data escrita na receita, quando
    // válida, prevalece para cada medicamento.
    const [startDate, setStartDate] = useState(() => toDateInputValue(new Date()));

    const fileInputRef = useRef<HTMLInputElement>(null);
    useEscapeToClose(onClose);

    const drafts = useMemo(
        () => draftsFromPrescription(entries ?? [], startDate),
        [entries, startDate]
    );
    const selectedCount = drafts.filter((_, index) => checked[index]).length;

    const resetScan = () => {
        setStatus('idle');
        setError(null);
        setEntries(null);
        setChecked([]);
    };

    const switchMode = (next: Mode) => {
        setMode(next);
        resetScan();
    };

    const applyEntries = (list: PrescriptionEntry[]) => {
        setEntries(list);
        setChecked(list.map(() => true));
        setStatus('idle');
        setError(null);
    };

    const runScan = async (dataUrl: string) => {
        setStatus('loading');
        setError(null);
        try {
            const mimeMatch = /^data:([^;]+);/.exec(dataUrl);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
            applyEntries(await scanPrescription(base64, mimeType));
        } catch (err) {
            setStatus('error');
            setError(err instanceof AiError ? err.message : GENERIC_ERROR);
        }
    };

    const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = ''; // permite reescolher a mesma foto
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setStatus('error');
            setError('Escolha um arquivo de imagem (foto ou digitalização da receita).');
            return;
        }
        setStatus('loading');
        fileToCompressedDataUrl(file)
            .then((dataUrl) => {
                setPhoto(dataUrl);
                return runScan(dataUrl);
            })
            .catch(() => {
                setStatus('error');
                setError('Não foi possível abrir a imagem escolhida.');
            });
    };

    const clearPhoto = () => {
        setPhoto(null);
        resetScan();
    };

    const handleParseText = async () => {
        setStatus('loading');
        setError(null);
        try {
            applyEntries(await parsePrescriptionText(text));
        } catch (err) {
            setStatus('error');
            setError(err instanceof AiError ? err.message : GENERIC_ERROR);
        }
    };

    const toggle = (index: number) =>
        setChecked((prev) => prev.map((value, i) => (i === index ? !value : value)));

    const handleAdd = () => {
        const selected = drafts.filter((_, index) => checked[index]);
        if (selected.length > 0) onImport(selected);
    };

    const modeButtonClass = (active: boolean): string =>
        `flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
            active
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-brand-gray-500 dark:text-brand-gray-300 hover:text-brand-gray-700 dark:hover:text-brand-gray-100'
        }`;

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
                <h3 className="text-lg font-medium leading-6 text-brand-gray-900 dark:text-white mb-1">
                    Importar receita com IA
                </h3>
                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mb-4">
                    Fotografe ou cole a receita para identificar os medicamentos e revisar os lembretes antes de adicioná-los.
                </p>

                {entries ? (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-green-700 dark:text-green-400" role="status">
                                {entries.length} medicamento(s) reconhecido(s)
                            </p>
                            <button
                                type="button"
                                onClick={resetScan}
                                className="text-xs font-semibold text-brand-blue hover:underline"
                            >
                                Ler outra receita
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="prescription-start" className={labelClass}>
                                    Início do tratamento
                                </label>
                                <input
                                    id="prescription-start"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={inputClass()}
                                />
                                <p className={helperClass}>
                                    Usado quando a receita não traz data de início. Confira cada item antes de adicionar.
                                </p>
                            </div>
                            {drafts.map((draft, index) => (
                                <label
                                    key={`${draft.medicationName}-${index}`}
                                    className="flex items-start gap-3 rounded-lg bg-brand-gray-100 dark:bg-brand-gray-700 p-3 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked[index] ?? false}
                                        onChange={() => toggle(index)}
                                        className="mt-1 h-4 w-4 rounded border-brand-gray-300 text-brand-blue focus:ring-brand-blue"
                                    />
                                    <span className="flex-1 text-sm">
                                        <span className="block font-bold text-brand-gray-900 dark:text-white">
                                            {draft.medicationName}
                                        </span>
                                        {draft.dosage && (
                                            <span className="block font-semibold text-brand-blue dark:text-blue-400">
                                                {draft.dosage}
                                            </span>
                                        )}
                                        {draft.instructions && (
                                            <span className="block text-xs text-brand-gray-500 dark:text-brand-gray-400">
                                                {draft.instructions}
                                            </span>
                                        )}
                                        <span className="block text-xs text-brand-gray-500 dark:text-gray-400 mt-1">
                                            {describeDraft(draft)}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end space-x-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-brand-gray-200 dark:bg-brand-gray-600 rounded-md hover:bg-brand-gray-300 dark:hover:bg-brand-gray-500">
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleAdd}
                                disabled={selectedCount === 0}
                                className="px-4 py-2 bg-brand-green text-white rounded-md hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                Adicionar {selectedCount} lembrete{selectedCount === 1 ? '' : 's'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="inline-flex w-full bg-brand-gray-100 dark:bg-brand-gray-700 rounded-lg p-1 mb-4" role="tablist" aria-label="Origem da receita">
                            <button type="button" role="tab" aria-selected={mode === 'photo'} onClick={() => switchMode('photo')} className={modeButtonClass(mode === 'photo')}>
                                <CameraIcon className="w-4 h-4" />
                                Foto
                            </button>
                            <button type="button" role="tab" aria-selected={mode === 'text'} onClick={() => switchMode('text')} className={modeButtonClass(mode === 'text')}>
                                <FileTextIcon className="w-4 h-4" />
                                Colar texto
                            </button>
                        </div>

                        {mode === 'photo' ? (
                            <>
                                <input
                                    ref={fileInputRef}
                                    id="prescription-photo"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handlePhotoSelect}
                                    className="sr-only"
                                />
                                {!photo ? (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={status === 'loading'}
                                        className="w-full flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 py-8 text-brand-gray-500 dark:text-brand-gray-400 hover:border-brand-blue hover:text-brand-blue transition-colors disabled:opacity-60"
                                    >
                                        <CameraIcon className="w-7 h-7" />
                                        <span className="text-sm font-semibold">
                                            {status === 'loading' ? 'Lendo a receita com IA...' : 'Fotografar a receita'}
                                        </span>
                                        <span className="text-xs">Tira foto (ou escolhe da galeria) e a IA extrai os remédios</span>
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <img src={photo} alt="Foto da receita" className="w-20 h-14 object-cover rounded-md border border-brand-gray-300 dark:border-brand-gray-600" />
                                        <div className="flex-1 text-sm">
                                            {status === 'loading' && <p className="text-brand-blue font-semibold" role="status">Lendo a receita com IA...</p>}
                                            {status === 'error' && <p className="text-brand-red font-medium" role="alert">{error}</p>}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={status === 'loading'} className="text-xs font-semibold text-brand-blue hover:underline">
                                                Trocar
                                            </button>
                                            <button type="button" onClick={clearPhoto} disabled={status === 'loading'} className="text-xs font-semibold text-brand-gray-400 hover:text-brand-red">
                                                Remover
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {status === 'error' && !photo && error && (
                                    <p className="mt-2 text-xs font-medium text-brand-red" role="alert">{error}</p>
                                )}
                            </>
                        ) : (
                            <>
                                <label htmlFor="prescription-text" className={labelClass}>
                                    Texto da receita
                                </label>
                                <textarea
                                    id="prescription-text"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    className={inputClass(Boolean(status === 'error' && error))}
                                    rows={6}
                                    placeholder={'Ex.:\nDipirona 500mg — 1 comprimido de 8/8h por 5 dias\nLosartana 50mg — 1 comprimido pela manhã, uso contínuo'}
                                    disabled={status === 'loading'}
                                />
                                {status === 'error' && error && (
                                    <p className="text-xs font-medium text-brand-red" role="alert">{error}</p>
                                )}
                                <button
                                    type="button"
                                    onClick={handleParseText}
                                    disabled={status === 'loading' || !text.trim()}
                                    className="mt-3 w-full px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {status === 'loading' ? 'Interpretando com IA...' : 'Interpretar texto com IA'}
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PrescriptionImportModal;
