
import React, { useState } from 'react';
import { Reminder, Medication } from '../types';
import { XIcon, TrashIcon } from '../constants';
import { toDateInputValue } from '../utils/datetime';

interface Props {
    onClose: () => void;
    onSave: (reminder: Omit<Reminder, 'id' | 'history' | 'createdAt'>) => void;
    medications: Medication[];
    isLoadingMeds: boolean;
    medsError: string | null;
    /** Lembrete em edição; `null`/ausente = novo cadastro. */
    editing?: Reminder | null;
}

const AddReminderModal: React.FC<Props> = ({ onClose, onSave, medications, isLoadingMeds, medsError, editing }) => {
    const [step, setStep] = useState(1);
    const [medicationName, setMedicationName] = useState(editing?.medicationName ?? '');
    const [dosage, setDosage] = useState(editing?.dosage ?? '');
    const [instructions, setInstructions] = useState(editing?.instructions ?? '');
    // Data de hoje no fuso LOCAL (toISOString() é UTC e sugeriria ontem entre 21h e meia-noite).
    const [startDate, setStartDate] = useState(() => editing?.startDate ?? toDateInputValue(new Date()));
    
    const [durationType, setDurationType] = useState<'continuous' | 'days'>(editing?.duration.type ?? 'days');
    const [durationDays, setDurationDays] = useState(editing?.duration.days ?? 7);
    
    const [frequencyType, setFrequencyType] = useState<'daily' | 'interval'>(editing?.frequency.type ?? 'daily');
    const [frequencyDays, setFrequencyDays] = useState(editing?.frequency.days ?? 2);
    
    // Em edição os horários salvos são editados um a um (não dá para saber
    // se originalmente vieram de "N vezes ao dia").
    const [timingType, setTimingType] = useState<'count' | 'specific'>(editing ? 'specific' : 'count');
    const [timesPerDay, setTimesPerDay] = useState(1);
    const [firstDoseTime, setFirstDoseTime] = useState('08:00');
    const [specificTimes, setSpecificTimes] = useState<string[]>(editing?.times.length ? editing.times : ['08:00']);

    const calculateTimes = () => {
        if (timingType === 'specific') {
            return specificTimes.filter(t => t).sort();
        }
        const interval = Math.floor(24 / timesPerDay);
        const [startHour, startMinute] = firstDoseTime.split(':').map(Number);
        const times = [];
        for (let i = 0; i < timesPerDay; i++) {
            const hour = (startHour + i * interval) % 24;
            const time = `${String(hour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
            times.push(time);
        }
        return times.sort();
    };

    const handleAdd = () => {
        if (!medicationName) {
            alert('Por favor, selecione um medicamento.');
            return;
        }
        const times = calculateTimes();
        if (times.length === 0) {
            alert('Adicione pelo menos um horário de dose.');
            return;
        }
        onSave({
            medicationName,
            dosage: dosage.trim(),
            instructions: instructions.trim(),
            startDate,
            duration: {
                type: durationType,
                days: durationType === 'days' ? durationDays : 0,
            },
            frequency: {
                type: frequencyType,
                days: frequencyType === 'interval' ? frequencyDays : 1,
            },
            times,
        });
    };

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const renderStep1 = () => (
        <>
            <h3 className="mb-4 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Qual remédio e por quanto tempo?
            </h3>
            <div className="space-y-4">
                <div>
                    <label htmlFor="medication" className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">Medicamento</label>
                    <input
                        id="medication"
                        type="text"
                        value={medicationName}
                        onChange={(e) => setMedicationName(e.target.value)}
                        list="medication-list"
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-950/50"
                        placeholder={isLoadingMeds ? "Carregando..." : "Digite ou selecione um remédio"}
                        disabled={isLoadingMeds}
                    />
                    <datalist id="medication-list">
                        {medications.map((med, index) => <option key={index} value={med.name} />)}
                    </datalist>
                    {medsError && <p className="text-sm text-brand-red mt-1">{medsError}</p>}
                </div>
                <div>
                    <label htmlFor="dosage" className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">Dosagem por dose (opcional)</label>
                    <input
                        id="dosage"
                        type="text"
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-950/50"
                        placeholder="Ex.: 1 comprimido, 5 ml, 2 gotas"
                    />
                </div>
                <div>
                    <label htmlFor="instructions" className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">Instruções (opcional)</label>
                    <input
                        id="instructions"
                        type="text"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-950/50"
                        placeholder="Ex.: com alimentos, via oral, de manhã"
                    />
                </div>
                <div>
                    <label htmlFor="start-date" className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">Data de Início</label>
                    <input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-950/50"
                    />
                </div>
                <div>
                    <span className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">Duração do Tratamento</span>
                    <div className="mt-2 space-y-2">
                        <label className="flex items-center">
                            <input type="radio" name="duration" checked={durationType === 'continuous'} onChange={() => setDurationType('continuous')} className="focus:ring-brand-blue h-4 w-4 text-brand-blue border-brand-gray-300" />
                            <span className="ml-3 text-sm dark:text-brand-gray-200">Uso Contínuo</span>
                        </label>
                        <label className="flex items-center">
                            <input type="radio" name="duration" checked={durationType === 'days'} onChange={() => setDurationType('days')} className="focus:ring-brand-blue h-4 w-4 text-brand-blue border-brand-gray-300" />
                            <span className="ml-3 text-sm dark:text-brand-gray-200">Por um número de dias</span>
                        </label>
                        {durationType === 'days' && (
                            <input
                                type="number"
                                value={durationDays}
                                onChange={(e) => setDurationDays(parseInt(e.target.value))}
                                className="mt-1 ml-7 block w-1/3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-950/50"
                                min="1"
                            />
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <button onClick={handleNext} disabled={!medicationName} className="min-h-11 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:bg-brand-gray-400">Próximo</button>
            </div>
        </>
    );

    const renderStep2 = () => (
         <>
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                Com que frequência?
            </h3>
            <div className="space-y-4">
                <label className="flex items-center">
                    <input type="radio" name="frequency" checked={frequencyType === 'daily'} onChange={() => setFrequencyType('daily')} className="focus:ring-brand-blue h-4 w-4 text-brand-blue border-brand-gray-300" />
                    <span className="ml-3 text-sm dark:text-brand-gray-200">Todos os dias</span>
                </label>
                <label className="flex items-center">
                    <input type="radio" name="frequency" checked={frequencyType === 'interval'} onChange={() => setFrequencyType('interval')} className="focus:ring-brand-blue h-4 w-4 text-brand-blue border-brand-gray-300" />
                    <span className="ml-3 text-sm dark:text-brand-gray-200">A cada</span>
                </label>
                {frequencyType === 'interval' && (
                    <div className="flex items-center ml-7">
                        <input
                            type="number"
                            value={frequencyDays}
                            onChange={(e) => setFrequencyDays(parseInt(e.target.value))}
                            className="block w-1/4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-950/50"
                            min="2"
                        />
                        <span className="ml-2 text-sm dark:text-brand-gray-200">dias</span>
                    </div>
                )}
            </div>
            <div className="mt-6 flex justify-between">
                <button onClick={handleBack} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Voltar</button>
                <button onClick={handleNext} className="min-h-11 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800">Próximo</button>
            </div>
        </>
    );

    const renderStep3 = () => (
         <>
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                Quais os horários?
            </h3>
            <div className="space-y-4">
                <label className="flex items-center">
                    <input type="radio" name="timing" checked={timingType === 'count'} onChange={() => setTimingType('count')} className="focus:ring-brand-blue h-4 w-4 text-brand-blue border-brand-gray-300" />
                    <span className="ml-3 text-sm dark:text-brand-gray-200">Número de vezes ao dia</span>
                </label>
                 {timingType === 'count' && (
                    <div className="ml-7 space-y-2">
                        <div className="flex items-center">
                             <input type="number" value={timesPerDay} onChange={e => setTimesPerDay(Math.max(1, parseInt(e.target.value)))} className="block w-1/4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-950/50" min="1" max="24"/>
                            <span className="ml-2 text-sm dark:text-brand-gray-200">vez(es) ao dia</span>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">Hora da primeira dose</label>
                             <input type="time" value={firstDoseTime} onChange={e => setFirstDoseTime(e.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-950/50"/>
                        </div>
                    </div>
                 )}
                 <label className="flex items-center">
                    <input type="radio" name="timing" checked={timingType === 'specific'} onChange={() => setTimingType('specific')} className="focus:ring-brand-blue h-4 w-4 text-brand-blue border-brand-gray-300" />
                    <span className="ml-3 text-sm dark:text-brand-gray-200">Horários específicos</span>
                </label>
                {timingType === 'specific' && (
                    <div className="ml-7 space-y-2">
                        {specificTimes.map((time, index) => (
                            <div key={index} className="flex items-center">
                                <input type="time" value={time} onChange={e => {
                                    const newTimes = [...specificTimes];
                                    newTimes[index] = e.target.value;
                                    setSpecificTimes(newTimes);
                                }} className="block rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-950/50" />
                                {index > 0 && <button onClick={() => setSpecificTimes(specificTimes.filter((_, i) => i !== index))} className="ml-2 text-brand-red hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>}
                            </div>
                        ))}
                        <button onClick={() => setSpecificTimes([...specificTimes, ''])} className="text-sm text-brand-blue hover:underline">Adicionar horário</button>
                    </div>
                )}
            </div>
            <div className="mt-6 flex justify-between">
                <button onClick={handleBack} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Voltar</button>
                <button onClick={handleAdd} className="min-h-11 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800">{editing ? 'Salvar alterações' : 'Concluir'}</button>
            </div>
        </>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
            <div className="relative max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/70 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:max-h-[90dvh] sm:rounded-3xl sm:p-7" role="dialog" aria-modal="true" aria-label={editing ? "Editar medicamento" : "Novo medicamento"}>
                <button onClick={onClose} className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                    <XIcon className="w-6 h-6" />
                </button>
                
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>
        </div>
    );
};

export default AddReminderModal;
