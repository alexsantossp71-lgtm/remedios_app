
import React, { useRef, useState } from 'react';
import { HealthPlan } from '../types';
import { AiError, scanHealthCard, ScannedHealthCard } from '../services/nvidiaService';
import { hasAiAccess, useAiSettings } from '../services/settings';
import { fileToCompressedDataUrl } from '../utils/image';
import { CameraIcon } from '../constants';
import {
    FieldError,
    FormModalShell,
    FormSection,
    helperClass,
    inputClass,
    labelClass,
    maskCardNumber,
    maskPhone,
    phoneDigits,
} from './formFields';

interface Props {
    onClose: () => void;
    onSave: (plan: Omit<HealthPlan, 'id'>) => void;
    /** Plano em edição; `null`/ausente = novo cadastro. */
    editing?: HealthPlan | null;
    /** Abre a tela de Configurações (mostrada quando a chave de IA não está definida). */
    onOpenSettings?: () => void;
}

type Errors = Partial<Record<'operator' | 'planName' | 'cardNumber' | 'phone', string>>;
type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

const SCAN_ERROR_MESSAGE =
    'Não foi possível ler a carteirinha automaticamente. Preencha os campos manualmente ou tente outra foto com melhor luz e enquadramento.';

const HealthPlanFormModal: React.FC<Props> = ({ onClose, onSave, editing }) => {
    const aiSettings = useAiSettings();
    const hasApiKey = hasAiAccess(aiSettings);
    const [operator, setOperator] = useState(editing?.operator ?? '');
    const [planName, setPlanName] = useState(editing?.planName ?? '');
    const [cardNumber, setCardNumber] = useState(maskCardNumber(editing?.cardNumber ?? ''));
    const [holder, setHolder] = useState(editing?.holder ?? '');
    const [validity, setValidity] = useState(editing?.validity ?? '');
    const [phone, setPhone] = useState(maskPhone(editing?.phone ?? ''));
    const [coverage, setCoverage] = useState(editing?.coverage ?? '');
    const [errors, setErrors] = useState<Errors>({});

    // Leitura automática da carteirinha para preencher os dados do plano.
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
    const [scanError, setScanError] = useState<string | null>(null);

    const validate = (): Errors => {
        const next: Errors = {};
        if (!operator.trim()) next.operator = 'Informe a operadora (ou "SUS").';
        if (!planName.trim()) next.planName = 'Informe o nome do plano.';
        const cardDigits = cardNumber.replace(/\D/g, '');
        if (cardDigits.length > 0 && cardDigits.length < 4) {
            next.cardNumber = 'O número da carteirinha deve ter pelo menos 4 dígitos.';
        }
        const telDigits = phoneDigits(phone);
        if (telDigits.length > 0 && telDigits.length < 10) {
            next.phone = 'Informe DDD + número (10 ou 11 dígitos).';
        }
        return next;
    };

    const clearError = (field: keyof Errors) =>
        setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));

    // ===== Scanner da carteirinha =====
    const applyScan = (fields: Partial<ScannedHealthCard>) => {
        if (fields.operator) setOperator(fields.operator);
        if (fields.planName) setPlanName(fields.planName);
        if (fields.cardNumber) setCardNumber(maskCardNumber(fields.cardNumber));
        if (fields.holder) setHolder(fields.holder);
        if (fields.validity) setValidity(fields.validity);
        if (fields.phone) setPhone(maskPhone(fields.phone));
        if (fields.coverage) setCoverage(fields.coverage);
    };

    const runScan = async (dataUrl: string) => {
        setScanStatus('scanning');
        setScanError(null);
        try {
            const mimeMatch = /^data:([^;]+);/.exec(dataUrl);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
            const fields = await scanHealthCard(base64, mimeType);
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
            setScanError('Escolha um arquivo de imagem (foto ou digitalização da carteirinha).');
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
            operator: operator.trim(),
            planName: planName.trim(),
            cardNumber: cardNumber.replace(/\D/g, ''),
            holder: holder.trim(),
            validity,
            phone: phoneDigits(phone),
            coverage: coverage.trim(),
        });
    };

    return (
        <FormModalShell
            title={editing ? 'Editar plano de saúde' : 'Novo plano de saúde'}
            onClose={onClose}
            onSubmit={handleSave}
        >
            <FormSection title="Foto da carteirinha (opcional)">
                {hasApiKey ? (
                <>
                <input
                    ref={fileInputRef}
                    id="plan-photo"
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
                            {scanStatus === 'scanning' ? 'Enviando foto...' : 'Escanear carteirinha com a câmera'}
                        </span>
                        <span className="text-xs">Tira foto (ou escolhe da galeria) e a IA preenche os campos</span>
                    </button>
                    {scanStatus === 'error' && scanError && (
                        <p className="text-xs font-medium text-brand-red" role="alert">{scanError}</p>
                    )}
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <img src={photo} alt="Foto da carteirinha" className="w-20 h-14 object-cover rounded-md border border-brand-gray-300 dark:border-brand-gray-600" />
                        <div className="flex-1 text-sm">
                            {scanStatus === 'scanning' && <p className="text-brand-blue font-semibold" role="status">Lendo a carteirinha com IA...</p>}
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
                    A foto é usada para identificar os dados da carteirinha e preencher o cadastro. Confira as informações antes de salvar.
                </p>
                </>
                ) : (
                    <div className="rounded-lg border-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 py-4 px-3 text-center">
                        <CameraIcon className="w-6 h-6 mx-auto text-brand-gray-400" />
                        <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 mt-1.5">
                            Escanear com a câmera e preencher os campos automaticamente com IA.
                        </p>
                        <button
                            type="button"
                            onClick={() => onOpenSettings?.()}
                            className="mt-2 text-sm font-semibold text-brand-blue hover:underline"
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}
            </FormSection>

            <FormSection title="Carteirinha">
                <div>
                    <label htmlFor="plan-operator" className={labelClass}>Operadora *</label>
                    <input
                        id="plan-operator"
                        type="text"
                        value={operator}
                        onChange={(e) => { setOperator(e.target.value); clearError('operator'); }}
                        className={inputClass(Boolean(errors.operator))}
                        aria-invalid={Boolean(errors.operator)}
                        aria-describedby={errors.operator ? 'plan-operator-error' : undefined}
                        placeholder="Ex.: Unimed, Bradesco Saúde ou SUS"
                        autoFocus
                    />
                    <FieldError id="plan-operator-error" message={errors.operator} />
                </div>
                <div>
                    <label htmlFor="plan-name" className={labelClass}>Nome do plano *</label>
                    <input
                        id="plan-name"
                        type="text"
                        value={planName}
                        onChange={(e) => { setPlanName(e.target.value); clearError('planName'); }}
                        className={inputClass(Boolean(errors.planName))}
                        aria-invalid={Boolean(errors.planName)}
                        aria-describedby={errors.planName ? 'plan-name-error' : undefined}
                        placeholder="Ex.: Nacional Plus / Cartão SUS"
                    />
                    <FieldError id="plan-name-error" message={errors.planName} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="plan-card" className={labelClass}>Nº da carteirinha</label>
                        <input
                            id="plan-card"
                            type="text"
                            inputMode="numeric"
                            value={cardNumber}
                            onChange={(e) => { setCardNumber(maskCardNumber(e.target.value)); clearError('cardNumber'); }}
                            className={inputClass(Boolean(errors.cardNumber))}
                            aria-invalid={Boolean(errors.cardNumber)}
                            aria-describedby={errors.cardNumber ? 'plan-card-error' : 'plan-card-help'}
                            placeholder="0000 0000 0000"
                        />
                        {errors.cardNumber ? (
                            <FieldError id="plan-card-error" message={errors.cardNumber} />
                        ) : (
                            <p id="plan-card-help" className={helperClass}>Somente números, agrupados automaticamente.</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="plan-holder" className={labelClass}>Titular</label>
                        <input
                            id="plan-holder"
                            type="text"
                            value={holder}
                            onChange={(e) => setHolder(e.target.value)}
                            className={inputClass()}
                            placeholder="Ex.: Alexandre Santos"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="plan-validity" className={labelClass}>Validade</label>
                    <input
                        id="plan-validity"
                        type="date"
                        value={validity}
                        onChange={(e) => setValidity(e.target.value)}
                        className={inputClass()}
                    />
                </div>
            </FormSection>

            <FormSection title="Contato e cobertura">
                <div>
                    <label htmlFor="plan-phone" className={labelClass}>Telefone / SAC da operadora</label>
                    <input
                        id="plan-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(maskPhone(e.target.value)); clearError('phone'); }}
                        className={inputClass(Boolean(errors.phone))}
                        aria-invalid={Boolean(errors.phone)}
                        aria-describedby={errors.phone ? 'plan-phone-error' : undefined}
                        placeholder="Ex.: (11) 4002-8922"
                    />
                    <FieldError id="plan-phone-error" message={errors.phone} />
                </div>
                <div>
                    <label htmlFor="plan-coverage" className={labelClass}>Cobertura / observações</label>
                    <textarea
                        id="plan-coverage"
                        value={coverage}
                        onChange={(e) => setCoverage(e.target.value)}
                        className={inputClass()}
                        rows={2}
                        placeholder="Ex.: Rede credenciada em São Paulo; autorização prévia para exames..."
                    />
                </div>
            </FormSection>
        </FormModalShell>
    );
};

export default HealthPlanFormModal;
