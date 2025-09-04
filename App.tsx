
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Reminder, ReminderStatus, Medication } from './types';
import { getMedications } from './services/geminiService';
import AddReminderModal from './components/AddReminderModal';
import Calendar from './components/Calendar';
import ReminderList from './components/ReminderList';
import NotificationModal from './components/NotificationModal';
import { PlusIcon, PillIcon } from './constants';

const ALARM_SOUND_B64 = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTSEUAAAAMAEduaXgtbGFtZSAzLjk5LjUAAAAAAAAAAAAAAD43eAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/x/EQoA8ADhyQREAMU3bW3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//-";
const App: React.FC = () => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [isLoadingMeds, setIsLoadingMeds] = useState(true);
    const [medsError, setMedsError] = useState<string | null>(null);

    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [notification, setNotification] = useState<{ reminder: Reminder; time: string } | null>(null);

    const audioRef = useRef<HTMLAudioElement>(null);
    // Fix: Use 'number' for setTimeout return type in browser environment instead of 'NodeJS.Timeout'.
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const storedReminders = localStorage.getItem('medicationReminders');
        if (storedReminders) {
            setReminders(JSON.parse(storedReminders));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('medicationReminders', JSON.stringify(reminders));
    }, [reminders]);

    useEffect(() => {
        const fetchMedications = async () => {
            try {
                const meds = await getMedications();
                setMedications(meds);
            } catch (error) {
                console.error("Failed to fetch medications:", error);
                setMedsError("Não foi possível carregar a lista de medicamentos. Verifique sua chave de API e conexão.");
                setMedications([{ name: 'Dipirona' }, { name: 'Paracetamol' }, { name: 'Ibuprofeno' }, { name: 'Amoxicilina' }]); // Fallback
            } finally {
                setIsLoadingMeds(false);
            }
        };

        fetchMedications();
    }, []);
    
    const getNextAlarm = useCallback(() => {
        const now = new Date();
        let nextAlarmTime: Date | null = null;
        let nextAlarmReminder: { reminder: Reminder; time: string } | null = null;

        reminders.forEach(reminder => {
            const startDate = new Date(reminder.startDate);
            startDate.setHours(0, 0, 0, 0);

            // Check if reminder is currently active
            if (reminder.duration.type === 'days') {
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + reminder.duration.days);
                if (now > endDate) return;
            }

            // Calculate scheduled times for today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays >= 0) {
                 if (reminder.frequency.type === 'daily' || (reminder.frequency.type === 'interval' && diffDays % reminder.frequency.days === 0)) {
                    reminder.times.forEach(time => {
                        const [hour, minute] = time.split(':').map(Number);
                        const alarmDateTime = new Date();
                        alarmDateTime.setHours(hour, minute, 0, 0);

                        const historyKey = `${alarmDateTime.getFullYear()}-${String(alarmDateTime.getMonth() + 1).padStart(2, '0')}-${String(alarmDateTime.getDate()).padStart(2, '0')}`;
                        const dayHistory = reminder.history[historyKey] || {};

                        if (alarmDateTime > now && !dayHistory[time] && (!nextAlarmTime || alarmDateTime < nextAlarmTime)) {
                            nextAlarmTime = alarmDateTime;
                            nextAlarmReminder = { reminder, time };
                        }
                    });
                }
            }
        });
        
        return { nextAlarmTime, nextAlarmReminder };
    }, [reminders]);


    const scheduleNextAlarm = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        const { nextAlarmTime, nextAlarmReminder } = getNextAlarm();

        if (nextAlarmTime && nextAlarmReminder) {
            const timeToAlarm = nextAlarmTime.getTime() - Date.now();
            if (timeToAlarm > 0) {
                 timeoutRef.current = window.setTimeout(() => {
                    setNotification(nextAlarmReminder);
                    if(audioRef.current) {
                        audioRef.current.play().catch(e => console.error("Error playing sound:", e));
                    }
                    scheduleNextAlarm(); 
                }, timeToAlarm);
            }
        }
    }, [getNextAlarm]);

    useEffect(() => {
        scheduleNextAlarm();
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [reminders, scheduleNextAlarm]);

    const handleAddReminder = (newReminder: Omit<Reminder, 'id' | 'history'>) => {
        setReminders(prev => [...prev, { ...newReminder, id: Date.now().toString(), history: {} }]);
        setAddModalOpen(false);
    };

    const handleDeleteReminder = (id: string) => {
        setReminders(prev => prev.filter(r => r.id !== id));
    };

    const handleNotificationAction = (reminderId: string, time: string, status: ReminderStatus) => {
        setReminders(prev => prev.map(r => {
            if (r.id === reminderId) {
                const today = new Date();
                const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                const newHistory = { ...r.history };
                if (!newHistory[key]) {
                    newHistory[key] = {};
                }
                newHistory[key][time] = status;
                return { ...r, history: newHistory };
            }
            return r;
        }));
        if(audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setNotification(null);
    };

    return (
        <div className="min-h-screen bg-brand-gray-100 text-brand-gray-800 dark:bg-brand-gray-900 dark:text-brand-gray-200 font-sans">
            <header className="bg-white dark:bg-brand-gray-800 shadow-md">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <PillIcon className="w-8 h-8 text-brand-blue" />
                        <h1 className="text-2xl font-bold text-brand-blue">Remédio na Hora</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-brand-gray-800 p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Calendário de Doses</h2>
                    </div>
                    <Calendar reminders={reminders} />
                </div>
                
                <div className="lg:col-span-1 bg-white dark:bg-brand-gray-800 p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Meus Lembretes</h2>
                         <button
                            onClick={() => setAddModalOpen(true)}
                            className="flex items-center bg-brand-blue text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200"
                            aria-label="Adicionar novo lembrete"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Adicionar
                        </button>
                    </div>
                    <ReminderList reminders={reminders} onDelete={handleDeleteReminder} />
                </div>
            </main>
            
            {isAddModalOpen && (
                <AddReminderModal
                    onClose={() => setAddModalOpen(false)}
                    onAdd={handleAddReminder}
                    medications={medications}
                    isLoadingMeds={isLoadingMeds}
                    medsError={medsError}
                />
            )}
            
            {notification && (
                <NotificationModal
                    reminder={notification.reminder}
                    time={notification.time}
                    onAction={handleNotificationAction}
                />
            )}
            <audio ref={audioRef} src={ALARM_SOUND_B64} loop />
        </div>
    );
};

export default App;
