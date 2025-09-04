
import React, { useState } from 'react';
import { Reminder, Medication } from '../types';
// Fix: Import TrashIcon to resolve reference error.
import { XIcon, PillIcon, CalendarIcon, ClockIcon, TrashIcon } from '../constants';

interface Props {
    onClose: () => void;
    onAdd: (reminder: Omit<Reminder, 'id' | 'history'>) => void;
    medications: Medication[];
    isLoadingMeds: boolean;
    medsError: string | null;
}

const AddReminderModal: React.FC<Props> = ({ onClose, onAdd, medications, isLoadingMeds, medsError }) => {
    const [step, setStep] = useState(1);
    const [medicationName, setMedicationName] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [durationType, setDurationType] = useState<'continuous' | 'days'>('days');
    const [durationDays, setDurationDays] = useState(7);
    
    const [frequencyType, setFrequencyType] = useState<'daily' | 'interval'>('daily');
    const [frequencyDays, setFrequencyDays] = useState(2);
    
    const [timingType, setTimingType] = useState<'count' | 'specific'>('count');
    const [timesPerDay, setTimesPerDay] = useState(1);
    const [firstDoseTime, setFirstDoseTime] = useState('08:00');
    const [specificTimes, setSpecificTimes] = useState<string[]>(['08:00']);

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
        onAdd({
            medicationName,
            startDate,
            duration: {
                type: durationType,
                days: durationType === 'days' ? durationDays : 0,
            },
            frequency: {
                type: frequencyType,
                days: frequencyType === 'interval' ? frequencyDays : 1,
            },
            times: calculateTimes(),
        });
    };

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const renderStep1 = () => (
        <>
            <h3 className="text-lg font-medium leading-6 text-brand-gray-900 dark:text-white mb-4">
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
                        className="mt-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm dark:bg-brand-gray-700 dark:border-brand-gray-600"
                        placeholder={isLoadingMeds ? "Carregando..." : "Digite ou selecione um remédio"}
                        disabled={isLoadingMeds}
                    />
                    <datalist id="medication-list">
                        {medications.map((med, index) => <option key={index} value={med.name} />)}
                    </datalist>
                    {medsError && <p className="text-sm text-brand-red mt-1">{medsError}</p>}
                </div>
                <div>
                    <label htmlFor="start-date" className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">Data de Início</label>
                    <input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm dark:bg-brand-gray-700 dark:border-brand-gray-600"
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
                                className="mt-1 ml-7 block w-1/3 rounded-md border-brand-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm dark:bg-brand-gray-700 dark:border-brand-gray-600"
                                min="1"
                            />
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <button onClick={handleNext} disabled={!medicationName} className="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-600 disabled:bg-brand-gray-400">Próximo</button>
            </div>
        </>
    );

    const renderStep2 = () => (
         <>
            <h3 className="text-lg font-medium leading-6 text-brand-gray-900 dark:text-white mb-4">
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
                            className="block w-1/4 rounded-md border-brand-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm dark:bg-brand-gray-700 dark:border-brand-gray-600"
                            min="2"
                        />
                        <span className="ml-2 text-sm dark:text-brand-gray-200">dias</span>
                    </div>
                )}
            </div>
            <div className="mt-6 flex justify-between">
                <button onClick={handleBack} className="px-4 py-2 bg-brand-gray-200 dark:bg-brand-gray-600 rounded-md hover:bg-brand-gray-300">Voltar</button>
                <button onClick={handleNext} className="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-600">Próximo</button>
            </div>
        </>
    );

    const renderStep3 = () => (
         <>
            <h3 className="text-lg font-medium leading-6 text-brand-gray-900 dark:text-white mb-4">
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
                             <input type="number" value={timesPerDay} onChange={e => setTimesPerDay(Math.max(1, parseInt(e.target.value)))} className="block w-1/4 rounded-md border-brand-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm dark:bg-brand-gray-700 dark:border-brand-gray-600" min="1" max="24"/>
                            <span className="ml-2 text-sm dark:text-brand-gray-200">vez(es) ao dia</span>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">Hora da primeira dose</label>
                             <input type="time" value={firstDoseTime} onChange={e => setFirstDoseTime(e.target.value)} className="mt-1 block rounded-md border-brand-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm dark:bg-brand-gray-700 dark:border-brand-gray-600"/>
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
                                }} className="block rounded-md border-brand-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm dark:bg-brand-gray-700 dark:border-brand-gray-600" />
                                {index > 0 && <button onClick={() => setSpecificTimes(specificTimes.filter((_, i) => i !== index))} className="ml-2 text-brand-red hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>}
                            </div>
                        ))}
                        <button onClick={() => setSpecificTimes([...specificTimes, ''])} className="text-sm text-brand-blue hover:underline">Adicionar horário</button>
                    </div>
                )}
            </div>
            <div className="mt-6 flex justify-between">
                <button onClick={handleBack} className="px-4 py-2 bg-brand-gray-200 dark:bg-brand-gray-600 rounded-md hover:bg-brand-gray-300">Voltar</button>
                <button onClick={handleAdd} className="px-4 py-2 bg-brand-green text-white rounded-md hover:bg-green-600">Concluir</button>
            </div>
        </>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-brand-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-brand-gray-400 hover:text-brand-gray-600 dark:hover:text-brand-gray-200">
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
