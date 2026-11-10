
import React, { useState } from 'react';
import { Doctor } from '../types';
import {
    FieldError,
    FormModalShell,
    FormSection,
    inputClass,
    labelClass,
    maskPhone,
    phoneDigits,
} from './formFields';

interface Props {
    onClose: () => void;
    onSave: (doctor: Omit<Doctor, 'id'>) => void;
    /** Médico em edição; `null`/ausente = novo cadastro. */
    editing?: Doctor | null;
}

type Errors = Partial<Record<'name' | 'phone', string>>;

const DoctorFormModal: React.FC<Props> = ({ onClose, onSave, editing }) => {
    const [name, setName] = useState(editing?.name ?? '');
    const [specialty, setSpecialty] = useState(editing?.specialty ?? '');
    const [crm, setCrm] = useState(editing?.crm ?? '');
    const [phone, setPhone] = useState(maskPhone(editing?.phone ?? ''));
    const [clinic, setClinic] = useState(editing?.clinic ?? '');
    const [errors, setErrors] = useState<Errors>({});

    const validate = (): Errors => {
        const next: Errors = {};
        if (!name.trim()) next.name = 'Informe o nome do médico.';
        const digits = phoneDigits(phone);
        if (digits.length > 0 && digits.length < 10) {
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
            name: name.trim(),
            specialty: specialty.trim(),
            crm: crm.trim(),
            phone: phoneDigits(phone),
            clinic: clinic.trim(),
        });
    };

    return (
        <FormModalShell
            title={editing ? 'Editar médico' : 'Novo médico'}
            onClose={onClose}
            onSubmit={handleSave}
        >
            <FormSection title="Identificação">
                <div>
                    <label htmlFor="doctor-name" className={labelClass}>Nome *</label>
                    <input
                        id="doctor-name"
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); clearError('name'); }}
                        className={inputClass(Boolean(errors.name))}
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? 'doctor-name-error' : undefined}
                        placeholder="Ex.: Ana Ribeiro"
                        autoFocus
                    />
                    <FieldError id="doctor-name-error" message={errors.name} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="doctor-specialty" className={labelClass}>Especialidade</label>
                        <input
                            id="doctor-specialty"
                            type="text"
                            value={specialty}
                            onChange={(e) => setSpecialty(e.target.value)}
                            className={inputClass()}
                            placeholder="Ex.: Cardiologista"
                        />
                    </div>
                    <div>
                        <label htmlFor="doctor-crm" className={labelClass}>CRM</label>
                        <input
                            id="doctor-crm"
                            type="text"
                            value={crm}
                            onChange={(e) => setCrm(e.target.value)}
                            className={inputClass()}
                            placeholder="Ex.: CRM-SP 123456"
                        />
                    </div>
                </div>
            </FormSection>

            <FormSection title="Contato e local">
                <div>
                    <label htmlFor="doctor-phone" className={labelClass}>Telefone / WhatsApp</label>
                    <input
                        id="doctor-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(maskPhone(e.target.value)); clearError('phone'); }}
                        className={inputClass(Boolean(errors.phone))}
                        aria-invalid={Boolean(errors.phone)}
                        aria-describedby={errors.phone ? 'doctor-phone-error' : 'doctor-phone-help'}
                        placeholder="Ex.: (11) 98888-7777"
                        inputMode="tel"
                    />
                    {errors.phone ? (
                        <FieldError id="doctor-phone-error" message={errors.phone} />
                    ) : (
                        <p id="doctor-phone-help" className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mt-1">
                            Usado nos botões "Ligar" e "WhatsApp".
                        </p>
                    )}
                </div>
                <div>
                    <label htmlFor="doctor-clinic" className={labelClass}>Clínica / Endereço</label>
                    <input
                        id="doctor-clinic"
                        type="text"
                        value={clinic}
                        onChange={(e) => setClinic(e.target.value)}
                        className={inputClass()}
                        placeholder="Ex.: Clínica Bem Viver — Av. Paulista, 1000"
                    />
                </div>
            </FormSection>
        </FormModalShell>
    );
};

export default DoctorFormModal;
