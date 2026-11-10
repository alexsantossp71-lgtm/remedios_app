
import React, { useState } from 'react';
import { HealthPlan } from '../types';
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
}

type Errors = Partial<Record<'operator' | 'planName' | 'cardNumber' | 'phone', string>>;

const HealthPlanFormModal: React.FC<Props> = ({ onClose, onSave, editing }) => {
    const [operator, setOperator] = useState(editing?.operator ?? '');
    const [planName, setPlanName] = useState(editing?.planName ?? '');
    const [cardNumber, setCardNumber] = useState(maskCardNumber(editing?.cardNumber ?? ''));
    const [holder, setHolder] = useState(editing?.holder ?? '');
    const [validity, setValidity] = useState(editing?.validity ?? '');
    const [phone, setPhone] = useState(maskPhone(editing?.phone ?? ''));
    const [coverage, setCoverage] = useState(editing?.coverage ?? '');
    const [errors, setErrors] = useState<Errors>({});

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
