
import React, { useRef, useState } from 'react';
import { LabValue } from '../types';
import { AiError, extractLabValues } from '../services/nvidiaService';
import { hasAiAccess, useAiSettings } from '../services/settings';
import { compressDataUrl, fileToCompressedDataUrl } from '../utils/image';
import { flagOf, parseNumericValue, parseReferenceText } from '../utils/labResults';
import { toDateInputValue } from '../utils/datetime';
import { CameraIcon, PlusIcon, TrashIcon, XIcon } from '../constants';
import { useEscapeToClose, helperClass, inputClass, labelClass } from './formFields';

interface Props {
    onClose: () => void;
    onSave: (lab: { date: string; labName: string; photo: string; values: LabValue[]; notes: string }) => void;
}

/** Anexo: máx. 900px e qualidade 0.72 — mesmo padrão dos exames (~80 KB). */
const ATTACHMENT_MAX_DIM = 900;
const ATTACHMENT_QUALITY = 0.72;

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

interface DraftRow {
    examName: string;
    valueText: string;
    unit: string;
    referenceText: string;
}

const emptyRow = (): DraftRow => ({ examName: '', valueText: '', unit: '', referenceText: '' });

/** Converte uma linha do formulário no valor estruturado (parse local). */
function toLabValue(row: DraftRow): LabValue | null {
    const examName = row.examName.trim();
    if (!examName) return null;
    const valueText = row.valueText.trim();
    const numericValue = valueText ? parseNumericValue(valueText) : null;
    const referenceText = row.referenceText.trim();
    const { low, high } = parseReferenceText(referenceText);
    return {
        examName: examName.slice(0, 120),
        valueText,
        numericValue,
        unit: row.unit.trim().slice(0, 30),
        referenceLow: low,
        referenceHigh: high,
        referenceText,
        flag: flagOf(numericValue, low, high),
    };
}

const flagBadge = (flag: LabValue['flag']): { label: string; className: string } | null => {
    if (flag === 'high') return { label: 'Acima da faixa', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
    if (flag === 'low') return { label: 'Abaixo da faixa', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
    if (flag === 'normal') return { label: 'Na faixa', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
    return null;
};

/**
 * Registro de laudo: foto lida pela IA (ou preenchimento manual) e tabela
 * editável de valores. Comparação com a faixa é feita no app, nunca pela IA.
 */
const LabFormModal: React.FC<Props> = ({ onClose, onSave }) => {
    const aiSettings = useAiSettings();
    const hasApiKey = hasAiAccess(aiSettings);

    const [date, setDate] = useState(() => toDateInputValue(new Date()));
    const [labName, setLabName] = useState('');
    const [notes, setNotes] = useState('');
    const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
    const [photo, setPhoto] = useState<string | null>(null);
    const [attachment, setAttachment] = useState('');
    const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
    const [scanError, setScanError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    useEscapeToClose(onClose);

    const applyScan = (scanned: { labName: string; examDate: string; values: LabValue[] }) => {
        if (scanned.labName) setLabName(scanned.labName);
        if (scanned.examDate) setDate(scanned.examDate);
        const scannedRows: DraftRow[] = scanned.values.map((value) => ({
            examName: value.examName,
            valueText: value.valueText,
            unit: value.unit,
            referenceText: value.referenceText,
        }));
        setRows(scannedRows.length > 0 ? scannedRows : [emptyRow()]);
    };

    const runScan = async (dataUrl: string) => {
        setScanStatus('scanning');
        setScanError(null);
        try {
            const mimeMatch = /^data:([^;]+);/.exec(dataUrl);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
            applyScan(await extractLabValues(base64, mimeType));
            setScanStatus('success');
        } catch (error) {
            setScanStatus('error');
            setScanError(
                error instanceof AiError
                    ? error.message
                    : 'Não foi possível ler o laudo automaticamente. Preencha os campos manualmente ou tente outra foto.'
            );
        }
    };

    const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setScanStatus('error');
            setScanError('Escolha um arquivo de imagem (foto ou digitalização do laudo).');
            return;
        }
        setScanStatus('scanning');
        fileToCompressedDataUrl(file)
            .then((dataUrl) => {
                setPhoto(dataUrl);
                compressDataUrl(dataUrl, ATTACHMENT_MAX_DIM, ATTACHMENT_QUALITY)
                    .then(setAttachment)
                    .catch(() => setAttachment(dataUrl));
                return runScan(dataUrl);
            })
            .catch(() => {
                setScanStatus('error');
                setScanError('Não foi possível abrir a imagem escolhida.');
            });
    };

    const clearPhoto = () => {
        setPhoto(null);
        setAttachment('');
        setScanStatus('idle');
        setScanError(null);
    };

    const updateRow = (index: number, patch: Partial<DraftRow>) =>
        setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

    const removeRow = (index: number) =>
        setRows((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((_, i) => i !== index)));

    const addRow = () => setRows((prev) => [...prev, emptyRow()]);

    const handleSave = () => {
        const values = rows.map(toLabValue).filter((value): value is LabValue => value !== null);
        if (!values.length) {
            setScanStatus('error');
            setScanError('Informe pelo menos um valor com o nome do exame.');
            return;
        }
        onSave({
            date,
            labName: labName.trim(),
            photo: attachment,
            values,
            notes: notes.trim(),
        });
    };

    const scanning = scanStatus === 'scanning';

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
            <div className="relative max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/70 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:max-h-[90dvh] sm:rounded-3xl sm:p-7" role="dialog" aria-modal="true" aria-label="Registrar laudo">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-brand-gray-400 hover:text-brand-gray-600 dark:hover:text-brand-gray-200"
                    aria-label="Fechar"
                >
                    <XIcon className="w-6 h-6" />
                </button>
                <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1 pr-8">
                    Registrar laudo
                </h3>
                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mb-4">
                    A foto é usada para ler os dados do laudo. Confira os valores reconhecidos antes de salvar.
                </p>

                {/* Foto do laudo */}
                {hasApiKey ? (
                    <section className="mb-4">
                        <input
                            ref={fileInputRef}
                            id="lab-photo"
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
                                disabled={scanning}
                                className="w-full flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 py-5 text-brand-gray-500 dark:text-brand-gray-400 hover:border-brand-blue hover:text-brand-blue transition-colors disabled:opacity-60"
                            >
                                <CameraIcon className="w-6 h-6" />
                                <span className="text-sm font-semibold">
                                    {scanning ? 'Lendo o laudo com IA...' : 'Fotografar o laudo'}
                                </span>
                                <span className="text-xs">A IA extrai os valores e as faixas de referência</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <img src={photo} alt="Foto do laudo" className="w-20 h-14 object-cover rounded-md border border-brand-gray-300 dark:border-brand-gray-600" />
                                <div className="flex-1 text-sm">
                                    {scanning && <p className="text-brand-blue font-semibold" role="status">Lendo o laudo com IA...</p>}
                                    {scanStatus === 'success' && <p className="text-green-700 dark:text-green-400 font-semibold" role="status">Valores preenchidos pela IA — confira cada linha antes de salvar.</p>}
                                    {scanStatus === 'error' && <p className="text-brand-red font-medium" role="alert">{scanError}</p>}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={scanning} className="text-xs font-semibold text-brand-blue hover:underline">
                                        Trocar
                                    </button>
                                    <button type="button" onClick={clearPhoto} disabled={scanning} className="text-xs font-semibold text-brand-gray-400 hover:text-brand-red">
                                        Remover
                                    </button>
                                </div>
                            </div>
                        )}
                        {scanStatus === 'error' && !photo && scanError && (
                            <p className="mt-2 text-xs font-medium text-brand-red" role="alert">{scanError}</p>
                        )}
                    </section>
                ) : (
                    <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mb-4 rounded-lg border-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 p-3">
                        A leitura automática está temporariamente indisponível. Você pode preencher os valores manualmente.
                    </p>
                )}

                {/* Dados do laudo */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label htmlFor="lab-date" className={labelClass}>Data do laudo *</label>
                        <input
                            id="lab-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={inputClass()}
                        />
                    </div>
                    <div>
                        <label htmlFor="lab-name" className={labelClass}>Laboratório</label>
                        <input
                            id="lab-name"
                            type="text"
                            value={labName}
                            onChange={(e) => setLabName(e.target.value)}
                            className={inputClass()}
                            placeholder="Ex.: Laboratório Analisa"
                        />
                    </div>
                </div>

                {/* Tabela editável de valores */}
                <section className="mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-gray-400 dark:text-brand-gray-500 mb-2">
                        Valores do laudo
                    </h4>
                    <div className="space-y-3">
                        {rows.map((row, index) => {
                            const value = toLabValue(row);
                            const badge = value ? flagBadge(value.flag) : null;
                            return (
                                <div key={index} className="rounded-lg bg-brand-gray-100 dark:bg-brand-gray-700 p-3 relative">
                                    <button
                                        type="button"
                                        onClick={() => removeRow(index)}
                                        className="absolute top-2 right-2 text-brand-gray-400 hover:text-brand-red"
                                        aria-label={`Remover valor ${row.examName || index + 1}`}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                    <div className="grid grid-cols-2 gap-2 pr-6">
                                        <input
                                            type="text"
                                            value={row.examName}
                                            onChange={(e) => updateRow(index, { examName: e.target.value })}
                                            className={`${inputClass()} col-span-2`}
                                            placeholder="Exame (ex.: Glicemia)"
                                            aria-label="Nome do exame"
                                        />
                                        <input
                                            type="text"
                                            value={row.valueText}
                                            onChange={(e) => updateRow(index, { valueText: e.target.value })}
                                            className={inputClass()}
                                            placeholder="Valor (ex.: 95)"
                                            aria-label="Valor medido"
                                        />
                                        <input
                                            type="text"
                                            value={row.unit}
                                            onChange={(e) => updateRow(index, { unit: e.target.value })}
                                            className={inputClass()}
                                            placeholder="Unidade (mg/dL)"
                                            aria-label="Unidade"
                                        />
                                        <input
                                            type="text"
                                            value={row.referenceText}
                                            onChange={(e) => updateRow(index, { referenceText: e.target.value })}
                                            className={`${inputClass()} col-span-2`}
                                            placeholder="Faixa de referência (ex.: 70 - 99)"
                                            aria-label="Faixa de referência"
                                        />
                                    </div>
                                    {badge && (
                                        <p className={`mt-2 inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                                            {badge.label}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        onClick={addRow}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-blue border border-dashed border-brand-gray-300 dark:border-brand-gray-600 rounded-lg py-2 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Adicionar valor manualmente
                    </button>
                    <p className={helperClass}>
                        A comparação com a faixa é calculada pelo app a partir da faixa que você informar — é organizacional, não um diagnóstico.
                    </p>
                </section>

                <div className="mb-4">
                    <label htmlFor="lab-notes" className={labelClass}>Observações</label>
                    <textarea
                        id="lab-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className={inputClass()}
                        rows={2}
                        placeholder="Ex.: coleta em jejum de 12 horas"
                    />
                </div>

                <div className="flex justify-end space-x-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="min-h-11 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
                    >
                        Salvar laudo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LabFormModal;
