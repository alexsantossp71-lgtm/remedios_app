
import React, { useRef, useState } from 'react';
import { Doctor, Exam, ExamStatus, EXAM_CATEGORIES } from '../types';
import { AiError, scanExamRequest, ScannedExamRequest } from '../services/nvidiaService';
import { useAiSettings } from '../services/settings';
import { fileToCompressedDataUrl } from '../utils/image';
import { parseLocalDate, toDateInputValue } from '../utils/datetime';
import { CameraIcon } from '../constants';
import { FieldError, FormModalShell, FormSection, helperClass, inputClass, labelClass } from './formFields';

interface Props {
    onClose: () => void;
    onSave: (exam: Omit<Exam, 'id'>) => void;
    doctors: Doctor[];
    /** Exame em edição; `null`/ausente = novo cadastro. */
    editing?: Exam | null;
    /** Abre a tela de Configurações (mostrada quando a chave de IA não está definida). */
    onOpenSettings?: () => void;
}

const OTHER = '__other__';

type Errors = Partial<Record<'name' | 'date', string>>;
type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

const SCAN_ERROR_MESSAGE =
    'Não foi possível ler o pedido automaticamente. Preencha os campos manualmente ou tente outra foto com melhor luz e enquadramento.';

const statusOptions: { value: ExamStatus; label: string }[] = [
    { value: 'requested', label: 'Solicitado' },
    { value: 'scheduled', label: 'Agendado' },
    { value: 'done', label: 'Realizado' },
];

/** Rótulo do campo de data conforme a situação do exame. */
const dateLabelFor = (status: ExamStatus): string => {
    if (status === 'requested') return 'Data do pedido *';
    if (status === 'scheduled') return 'Data agendada *';
    return 'Data de realização *';
};

const ExamFormModal: React.FC<Props> = ({ onClose, onSave, doctors, editing, onOpenSettings }) => {
    const aiSettings = useAiSettings();
    const hasApiKey = Boolean(aiSettings.nvidiaApiKey.trim());

    const [name, setName] = useState(editing?.name ?? '');
    const [category, setCategory] = useState(editing?.category ?? '');
    const [status, setStatus] = useState<ExamStatus>(editing?.status ?? 'requested');
    const [date, setDate] = useState(editing?.date ?? toDateInputValue(new Date()));
    const [doctorId, setDoctorId] = useState(
        editing?.doctorId && doctors.some(d => d.id === editing.doctorId) ? editing.doctorId : OTHER
    );
    const [typedName, setTypedName] = useState(editing && !doctors.some(d => d.id === editing.doctorId) ? editing.doctorName : '');
    const [place, setPlace] = useState(editing?.place ?? '');
    const [results, setResults] = useState(editing?.results ?? '');
    const [errors, setErrors] = useState<Errors>({});

    // Scanner do pedido (foto -> OCR via modelo de visão da NVIDIA -> preenche os campos)
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
    const [scanError, setScanError] = useState<string | null>(null);

    const selectedDoctor = doctors.find(d => d.id === doctorId);
    const doctorName = selectedDoctor ? selectedDoctor.name : typedName;

    const validate = (): Errors => {
        const next: Errors = {};
        if (!name.trim()) next.name = 'Informe o nome do exame.';
        if (!parseLocalDate(date)) next.date = 'Informe uma data válida.';
        return next;
    };

    const clearError = (field: keyof Errors) =>
        setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));

    // ===== Scanner do pedido =====
    const applyScan = (fields: Partial<ScannedExamRequest>) => {
        if (fields.name) setName(fields.name);
        if (fields.category) setCategory(fields.category);
        if (fields.doctorName) {
            const match = doctors.find(d => d.name.toLowerCase() === fields.doctorName!.toLowerCase());
            if (match) setDoctorId(match.id);
            else {
                setDoctorId(OTHER);
                setTypedName(fields.doctorName);
            }
        }
        if (fields.place) setPlace(fields.place);
        if (fields.date) setDate(fields.date);
    };

    const runScan = async (dataUrl: string) => {
        setScanStatus('scanning');
        setScanError(null);
        try {
            const mimeMatch = /^data:([^;]+);/.exec(dataUrl);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
            const fields = await scanExamRequest(base64, mimeType);
            applyScan(fields);
            setScanStatus('success');
        } catch (error) {
            setScanStatus('error');
            setScanError(error instanceof AiError ? error.message : SCAN_ERROR_MESSAGE);
        }
    };

    const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = ''; // permite reescolher a mesma foto
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setScanStatus('error');
            setScanError('Escolha um arquivo de imagem (foto ou digitalização do pedido).');
            return;
        }
        fileToCompressedDataUrl(file)
            .then(dataUrl => {
                setPhoto(dataUrl);
                return runScan(dataUrl);
            })
            .catch(() => {
                setScanStatus('error');
                setScanError('Não foi possível abrir a imagem escolhida.');
            });
    };

    const clearPhoto = () => {
        setPhoto(null);
        setScanStatus('idle');
        setScanError(null);
    };

    const handleSave = () => {
        const nextErrors = validate();
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        onSave({
            name: name.trim(),
            category,
            status,
            date,
            doctorId: selectedDoctor ? selectedDoctor.id : '',
            doctorName: doctorName.trim(),
            place: place.trim(),
            results: results.trim(),
        });
    };

    return (
        <FormModalShell
            title={editing ? 'Editar exame' : 'Novo exame'}
            onClose={onClose}
            onSubmit={handleSave}
        >
            <FormSection title="Foto do pedido (opcional)">
                {hasApiKey ? (
                <>
                <input
                    ref={fileInputRef}
                    id="exam-photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="sr-only"
                />
                {!photo ? (
                    <>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={scanStatus === 'scanning'}
                        className="w-full flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 py-4 text-brand-gray-500 dark:text-brand-gray-400 hover:border-brand-blue hover:text-brand-blue transition-colors disabled:opacity-60"
                    >
                        <CameraIcon className="w-6 h-6" />
                        <span className="text-sm font-semibold">
                            {scanStatus === 'scanning' ? 'Enviando foto...' : 'Escanear pedido do exame com a câmera'}
                        </span>
                        <span className="text-xs">Tira foto (ou escolhe da galeria) e a IA preenche os campos</span>
                    </button>
                    {scanStatus === 'error' && scanError && (
                        <p className="text-xs font-medium text-brand-red" role="alert">{scanError}</p>
                    )}
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <img src={photo} alt="Foto do pedido de exame" className="w-20 h-14 object-cover rounded-md border border-brand-gray-300 dark:border-brand-gray-600" />
                        <div className="flex-1 text-sm">
                            {scanStatus === 'scanning' && <p className="text-brand-blue font-semibold" role="status">Lendo o pedido com IA...</p>}
                            {scanStatus === 'success' && <p className="text-green-700 dark:text-green-400 font-semibold" role="status">Campos preenchidos pela IA — confira antes de salvar.</p>}
                            {scanStatus === 'error' && <p className="text-brand-red font-medium" role="alert">{scanError}</p>}
                        </div>
                        <div className="flex flex-col gap-1">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs font-semibold text-brand-blue hover:underline"
                                disabled={scanStatus === 'scanning'}
                            >
                                Trocar
                            </button>
                            <button
                                type="button"
                                onClick={clearPhoto}
                                className="text-xs font-semibold text-brand-gray-400 hover:text-brand-red"
                                disabled={scanStatus === 'scanning'}
                            >
                                Remover
                            </button>
                        </div>
                    </div>
                )}
                <p className={helperClass}>
                    A foto é enviada à API da NVIDIA (modelo de visão definido nas Configurações) apenas para ler os dados do pedido. A chave fica salva somente neste dispositivo.
                </p>
                </>
                ) : (
                    <div className="rounded-lg border-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 py-4 px-3 text-center">
                        <CameraIcon className="w-6 h-6 mx-auto text-brand-gray-400" />
                        <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 mt-1.5">
                            Escanear o pedido do médico com a câmera e preencher os campos automaticamente com IA.
                        </p>
                        <button
                            type="button"
                            onClick={() => onOpenSettings?.()}
                            className="mt-2 text-sm font-semibold text-brand-blue hover:underline"
                        >
                            Configurar chave da API (NVIDIA)
                        </button>
                    </div>
                )}
            </FormSection>

            <FormSection title="Exame">
                <div>
                    <label htmlFor="exam-name" className={labelClass}>Nome do exame *</label>
                    <input
                        id="exam-name"
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); clearError('name'); }}
                        className={inputClass(Boolean(errors.name))}
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? 'exam-name-error' : undefined}
                        placeholder="Ex.: Hemograma completo, Glicemia em jejum"
                        autoFocus
                    />
                    <FieldError id="exam-name-error" message={errors.name} />
                </div>
                <div>
                    <label htmlFor="exam-category" className={labelClass}>Categoria</label>
                    <select
                        id="exam-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={inputClass()}
                    >
                        <option value="">Não classificado</option>
                        {EXAM_CATEGORIES.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <span className={labelClass}>Situação</span>
                    <div className="mt-1 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Situação do exame">
                        {statusOptions.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={status === option.value}
                                onClick={() => setStatus(option.value)}
                                className={`px-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                    status === option.value
                                        ? 'bg-brand-blue text-white shadow-sm'
                                        : 'bg-brand-gray-100 dark:bg-brand-gray-700 text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-600'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label htmlFor="exam-date" className={labelClass}>{dateLabelFor(status)}</label>
                    <input
                        id="exam-date"
                        type="date"
                        value={date}
                        onChange={(e) => { setDate(e.target.value); clearError('date'); }}
                        className={inputClass(Boolean(errors.date))}
                        aria-invalid={Boolean(errors.date)}
                        aria-describedby={errors.date ? 'exam-date-error' : undefined}
                    />
                    <FieldError id="exam-date-error" message={errors.date} />
                </div>
            </FormSection>

            <FormSection title="Origem">
                <div>
                    <label htmlFor="exam-doctor" className={labelClass}>Médico solicitante</label>
                    {doctors.length > 0 && (
                        <select
                            id="exam-doctor"
                            value={doctorId}
                            onChange={(e) => setDoctorId(e.target.value)}
                            className={inputClass()}
                        >
                            {doctors.map(doctor => (
                                <option key={doctor.id} value={doctor.id}>
                                    {doctor.name}{doctor.specialty ? ` — ${doctor.specialty}` : ''}
                                </option>
                            ))}
                            <option value={OTHER}>Outro médico (digitar nome)</option>
                        </select>
                    )}
                    {doctors.length === 0 && (
                        <p className={helperClass}>
                            Dica: cadastre médicos na aba "Médicos" para selecioná-los aqui.
                        </p>
                    )}
                    {(!selectedDoctor || doctors.length === 0) && (
                        <input
                            type="text"
                            value={typedName}
                            onChange={(e) => setTypedName(e.target.value)}
                            className={inputClass(Boolean(errors.name) && !doctorName.trim())}
                            placeholder="Ex.: Dr. Ana Ribeiro (cardiologista)"
                        />
                    )}
                </div>
                <div>
                    <label htmlFor="exam-place" className={labelClass}>Local</label>
                    <input
                        id="exam-place"
                        type="text"
                        value={place}
                        onChange={(e) => setPlace(e.target.value)}
                        className={inputClass()}
                        placeholder="Ex.: Laboratório Analisa, unidade Centro"
                    />
                </div>
            </FormSection>

            <FormSection title="Resultado">
                <div>
                    <label htmlFor="exam-results" className={labelClass}>Resultado / laudo</label>
                    <textarea
                        id="exam-results"
                        value={results}
                        onChange={(e) => setResults(e.target.value)}
                        className={inputClass()}
                        rows={3}
                        placeholder="Ex.: Glicemia 95 mg/dL (jejum) — dentro da faixa"
                    />
                    <p className={helperClass}>
                        Anote os valores encontrados quando o laudo sair (ou um resumo dele).
                    </p>
                </div>
            </FormSection>
        </FormModalShell>
    );
};

export default ExamFormModal;
