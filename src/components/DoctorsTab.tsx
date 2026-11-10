
import React from 'react';
import { Doctor } from '../types';
import { TrashIcon, PencilIcon, PhoneIcon, MessageCircleIcon, MapPinIcon, StethoscopeIcon } from '../constants';

interface Props {
    doctors: Doctor[];
    onEdit: (doctor: Doctor) => void;
    onDelete: (id: string) => void;
}

/** Remove tudo que não é dígito e garante DDI 55 para números brasileiros. */
const phoneToDigits = (phone: string, withCountryCode: boolean): string => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return '';
    if (withCountryCode && digits.length <= 11) return `55${digits}`; // celular/fixo BR sem DDI
    return digits;
};

const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
    return (first + last).toUpperCase();
};

const DoctorCard: React.FC<{ doctor: Doctor; onEdit: () => void; onDelete: () => void }> = ({ doctor, onEdit, onDelete }) => (
    <div className="bg-brand-gray-100 dark:bg-brand-gray-700 p-4 rounded-lg shadow-sm relative">
        <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-11 h-11 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold">
                {getInitials(doctor.name)}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg text-brand-gray-900 dark:text-white break-words pr-12">{doctor.name}</h4>
                <p className="text-sm text-brand-gray-600 dark:text-brand-gray-300">
                    {doctor.specialty || 'Especialidade não informada'}
                    {doctor.crm && <span className="text-brand-gray-400 dark:text-brand-gray-400"> · CRM {doctor.crm}</span>}
                </p>
                {doctor.clinic && (
                    <div className="flex items-start text-sm text-brand-gray-600 dark:text-brand-gray-300 mt-1">
                        <MapPinIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="break-words">{doctor.clinic}</span>
                    </div>
                )}
                {doctor.phone && (
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        <a
                            href={`tel:+${phoneToDigits(doctor.phone, true)}`}
                            className="flex items-center bg-brand-blue text-white text-sm font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
                            aria-label={`Ligar para ${doctor.name}`}
                        >
                            <PhoneIcon className="w-4 h-4 mr-1.5" />
                            Ligar
                        </a>
                        <a
                            href={`https://wa.me/${phoneToDigits(doctor.phone, true)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center bg-brand-green text-white text-sm font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:bg-green-600 transition-colors"
                            aria-label={`Enviar WhatsApp para ${doctor.name}`}
                        >
                            <MessageCircleIcon className="w-4 h-4 mr-1.5" />
                            WhatsApp
                        </a>
                    </div>
                )}
            </div>
        </div>
        <div className="absolute top-2 right-2 flex space-x-1">
            <button
                onClick={onEdit}
                className="p-1 text-brand-gray-400 hover:text-brand-blue dark:hover:text-brand-blue transition-colors"
                aria-label={`Editar médico ${doctor.name}`}
            >
                <PencilIcon className="w-5 h-5" />
            </button>
            <button
                onClick={onDelete}
                className="p-1 text-brand-gray-400 hover:text-brand-red dark:hover:text-brand-red transition-colors"
                aria-label={`Deletar médico ${doctor.name}`}
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
    </div>
);

const DoctorsTab: React.FC<Props> = ({ doctors, onEdit, onDelete }) => {
    if (doctors.length === 0) {
        return (
            <div className="text-center py-10 text-brand-gray-500">
                <StethoscopeIcon className="w-12 h-12 mx-auto mb-2" />
                <p>Nenhum médico cadastrado.</p>
                <p className="text-sm">Clique em "Adicionar" para cadastrar e vincular às consultas.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {doctors.map(doctor => (
                <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    onEdit={() => onEdit(doctor)}
                    onDelete={() => onDelete(doctor.id)}
                />
            ))}
        </div>
    );
};

export default DoctorsTab;
