
import React, { useState } from 'react';
import { Doctor } from '../types';
import { XIcon } from '../constants';

interface Props {
    onClose: () => void;
    onSave: (doctor: Omit<Doctor, 'id'>) => void;
    /** Médico em edição; `null`/ausente = novo cadastro. */
    editing?: Doctor | null;
}

const DoctorFormModal: React.FC<Props> = ({ onClose, onSave, editing }) => {
    const [name, setName] = useState(editing?.name ?? '');
    const [specialty, setSpecialty] = useState(editing?.specialty ?? '');
    const [crm, setCrm] = useState(editing?.crm ?? '');
    const [phone, setPhone] = useState(editing?.phone ?? '');
    const [clinic, setClinic] = useState(editing?.clinic ?? '');

    const handleSave = () => {
        if (!name.trim()) {
            alert('Por favor, informe o nome do médico.');
            return;
        }
        onSave({
            name: name.trim(),
            specialty: specialty.trim(),
            crm: crm.trim(),
            phone: phone.trim(),
            clinic: clinic.trim(),
        });
    };

    const inputClass = "mt-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm dark:bg-brand-gray-700 dark:border-brand-gray-600";
    const labelClass = "block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-brand-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-brand-gray-400 hover:text-brand-gray-600 dark:hover:text-brand-gray-200" aria-label="Fechar">
                    <XIcon className="w-6 h-6" />
                </button>

                <h3 className="text-lg font-medium leading-6 text-brand-gray-900 dark:text-white mb-4">
                    {editing ? 'Editar médico' : 'Novo médico'}
                </h3>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="doctor-name" className={labelClass}>Nome *</label>
                        <input
                            id="doctor-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={inputClass}
                            placeholder="Ex.: Ana Ribeiro"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label htmlFor="doctor-specialty" className={labelClass}>Especialidade</label>
                        <input
                            id="doctor-specialty"
                            type="text"
                            value={specialty}
                            onChange={(e) => setSpecialty(e.target.value)}
                            className={inputClass}
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
                            className={inputClass}
                            placeholder="Ex.: CRM-SP 123456"
                        />
                    </div>
                    <div>
                        <label htmlFor="doctor-phone" className={labelClass}>Telefone / WhatsApp</label>
                        <input
                            id="doctor-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={inputClass}
                            placeholder="Ex.: (11) 98888-7777"
                        />
                    </div>
                    <div>
                        <label htmlFor="doctor-clinic" className={labelClass}>Clínica / Endereço</label>
                        <input
                            id="doctor-clinic"
                            type="text"
                            value={clinic}
                            onChange={(e) => setClinic(e.target.value)}
                            className={inputClass}
                            placeholder="Ex.: Clínica Bem Viver — Av. Paulista, 1000"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-2">
                    <button onClick={onClose} className="px-4 py-2 bg-brand-gray-200 dark:bg-brand-gray-600 rounded-md hover:bg-brand-gray-300">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-brand-green text-white rounded-md hover:bg-green-600">Salvar</button>
                </div>
            </div>
        </div>
    );
};

export default DoctorFormModal;
