
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Reminder, ReminderStatus, Medication, Doctor, Appointment, HealthPlan, Exam } from './types';
import { getMedications, AiError } from './services/nvidiaService';
import { useAiSettings } from './services/settings';
import { FALLBACK_MEDICATIONS } from './data/medications';
import { STORAGE_KEYS, generateId, isAppointmentArray, isDoctorArray, isExamArray, isHealthPlanArray, isReminderArray, loadJson, saveJson } from './storage';
import { parseLocalDateTime } from './utils/datetime';
import AddReminderModal from './components/AddReminderModal';
import Calendar from './components/Calendar';
import ReminderList from './components/ReminderList';
import NotificationModal from './components/NotificationModal';
import DoctorsTab from './components/DoctorsTab';
import DoctorFormModal from './components/DoctorFormModal';
import AppointmentsTab from './components/AppointmentsTab';
import AppointmentFormModal from './components/AppointmentFormModal';
import AppointmentNotificationModal from './components/AppointmentNotificationModal';
import HealthPlansTab from './components/HealthPlansTab';
import HealthPlanFormModal from './components/HealthPlanFormModal';
import ExamsTab from './components/ExamsTab';
import ExamFormModal from './components/ExamFormModal';
import SettingsModal from './components/SettingsModal';
import { GearIcon, PlusIcon, PillIcon, StethoscopeIcon } from './constants';

type MainTab = 'meds' | 'health';
type HealthTab = 'appointments' | 'doctors' | 'plans' | 'exams';

const subTabClass = (active: boolean): string =>
    `px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
        active
            ? 'bg-white dark:bg-brand-gray-500 text-brand-blue shadow-sm'
            : 'text-brand-gray-500 dark:text-brand-gray-300 hover:text-brand-gray-700 dark:hover:text-brand-gray-100'
    }`;

const NavButton: React.FC<{ active: boolean; onClick: () => void; label: string; icon: React.ReactNode }> = ({ active, onClick, label, icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            active
                ? 'bg-white dark:bg-brand-gray-600 text-brand-blue shadow'
                : 'text-brand-gray-500 dark:text-brand-gray-400 hover:text-brand-gray-700 dark:hover:text-brand-gray-200'
        }`}
    >
        {icon}
        {label}
    </button>
);

const ALARM_SOUND_B64 = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTSEUAAAAMAEduaXgtbGFtZSAzLjk5LjUAAAAAAAAAAAAAAD43eAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/x/EQoA8ADhyQREAMU3bW3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//3W3//-";
const App: React.FC = () => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [isLoadingMeds, setIsLoadingMeds] = useState(true);
    const [medsError, setMedsError] = useState<string | null>(null);

    // Cadastros de "Minha Saúde"
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [plans, setPlans] = useState<HealthPlan[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);

    // Navegação por abas
    const [mainTab, setMainTab] = useState<MainTab>('meds');
    const [healthTab, setHealthTab] = useState<HealthTab>('appointments');

    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [notification, setNotification] = useState<{ reminder: Reminder; time: string } | null>(null);
    const [doctorModal, setDoctorModal] = useState<{ open: boolean; editing: Doctor | null }>({ open: false, editing: null });
    const [appointmentModal, setAppointmentModal] = useState<{ open: boolean; editing: Appointment | null }>({ open: false, editing: null });
    const [planModal, setPlanModal] = useState<{ open: boolean; editing: HealthPlan | null }>({ open: false, editing: null });
    const [examModal, setExamModal] = useState<{ open: boolean; editing: Exam | null }>({ open: false, editing: null });
    const [appointmentNotification, setAppointmentNotification] = useState<{ appointment: Appointment; offsetMinutes: number } | null>(null);
    const [isSettingsOpen, setSettingsOpen] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    const timeoutRef = useRef<number | null>(null);
    const appointmentTimeoutRef = useRef<number | null>(null);

    // Configurações de IA: re-renderiza (e rebusca a lista de medicamentos)
    // quando a chave/modelos são alterados nas Configurações.
    const aiSettings = useAiSettings();

    // Carrega os dados do localStorage com validação: conteúdos corrompidos
    // são ignorados com aviso no console em vez de quebrar o app.
    useEffect(() => {
        const storedReminders = loadJson<Reminder[]>(STORAGE_KEYS.reminders, isReminderArray);
        if (storedReminders) setReminders(storedReminders);

        const storedDoctors = loadJson<Doctor[]>(STORAGE_KEYS.doctors, isDoctorArray);
        if (storedDoctors) setDoctors(storedDoctors);

        const storedAppointments = loadJson<Appointment[]>(STORAGE_KEYS.appointments, isAppointmentArray);
        if (storedAppointments) setAppointments(storedAppointments);

        const storedPlans = loadJson<HealthPlan[]>(STORAGE_KEYS.plans, isHealthPlanArray);
        if (storedPlans) setPlans(storedPlans);

        const storedExams = loadJson<Exam[]>(STORAGE_KEYS.exams, isExamArray);
        if (storedExams) setExams(storedExams);
    }, []);

    useEffect(() => {
        saveJson(STORAGE_KEYS.reminders, reminders);
    }, [reminders]);

    useEffect(() => {
        saveJson(STORAGE_KEYS.doctors, doctors);
    }, [doctors]);

    useEffect(() => {
        saveJson(STORAGE_KEYS.appointments, appointments);
    }, [appointments]);

    useEffect(() => {
        saveJson(STORAGE_KEYS.plans, plans);
    }, [plans]);

    useEffect(() => {
        saveJson(STORAGE_KEYS.exams, exams);
    }, [exams]);

    useEffect(() => {
        const fetchMedications = async () => {
            try {
                const meds = await getMedications();
                setMedications(meds);
            } catch (error) {
                console.error("Failed to fetch medications:", error);
                const missingKey = error instanceof AiError && error.message.includes('Configure a chave');
                setMedsError(missingKey
                    ? "Lista de medicamentos offline em uso. Para a lista completa, configure sua chave da API NVIDIA no botão \"IA\" no topo."
                    : "Lista online indisponível — usando lista offline de medicamentos comuns.");
                setMedications(FALLBACK_MEDICATIONS);
            } finally {
                setIsLoadingMeds(false);
            }
        };

        fetchMedications();
    }, [aiSettings.nvidiaApiKey, aiSettings.textModel]);
    
    const getNextAlarm = useCallback((): {
        nextAlarmTime: Date | null;
        nextAlarmReminder: { reminder: Reminder; time: string } | null;
    } => {
        const now = new Date();
        let nextAlarmTime: Date | null = null;
        let nextAlarmReminder: { reminder: Reminder; time: string } | null = null;

        // Compara sem deixar o TypeScript fazer narrowing indevido de
        // `nextAlarmTime` (atribuído dentro de callbacks).
        const isEarlier = (candidate: Date) =>
            nextAlarmTime === null || candidate.getTime() < nextAlarmTime.getTime();

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

                        if (alarmDateTime > now && !dayHistory[time] && isEarlier(alarmDateTime)) {
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

    // ===== Alarmes de consulta (mesmo mecanismo de setTimeout dos remédios) =====
    const getNextAppointmentAlarm = useCallback((): { time: Date; appointment: Appointment; offset: number } | null => {
        const now = Date.now();
        const candidates = appointments.flatMap(appointment => {
            if (appointment.reminderOffset <= 0) return [];
            if (appointment.notifiedOffsets.includes(appointment.reminderOffset)) return [];
            const apptTime = parseLocalDateTime(appointment.dateTime);
            if (!apptTime || apptTime.getTime() <= now) return [];

            const triggerMs = apptTime.getTime() - appointment.reminderOffset * 60_000;
            // Se o horário do lembrete passou com o app fechado, dispara assim que
            // abrir — mas apenas quando a consulta foi criada ANTES desse horário
            // (criar uma consulta para amanhã não deve tocar alarme agora).
            const createdMs = appointment.createdAt ? new Date(appointment.createdAt).getTime() : 0;
            const dueMs = triggerMs <= now && createdMs > 0 && createdMs <= triggerMs ? now : triggerMs;
            if (dueMs < now) return [];

            return [{ time: new Date(dueMs), appointment, offset: appointment.reminderOffset }];
        });

        if (candidates.length === 0) return null;
        candidates.sort((a, b) => a.time.getTime() - b.time.getTime());
        return candidates[0];
    }, [appointments]);

    const scheduleNextAppointmentAlarm = useCallback(() => {
        if (appointmentTimeoutRef.current) {
            clearTimeout(appointmentTimeoutRef.current);
        }

        const next = getNextAppointmentAlarm();
        if (!next) return;

        const delay = Math.max(0, next.time.getTime() - Date.now());
        appointmentTimeoutRef.current = window.setTimeout(() => {
            setAppointmentNotification({ appointment: next.appointment, offsetMinutes: next.offset });
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.error("Error playing sound:", e));
            }
            scheduleNextAppointmentAlarm();
        }, delay);
    }, [getNextAppointmentAlarm]);

    useEffect(() => {
        scheduleNextAppointmentAlarm();
        return () => {
            if (appointmentTimeoutRef.current) {
                clearTimeout(appointmentTimeoutRef.current);
            }
        };
    }, [appointments, scheduleNextAppointmentAlarm]);

    const handleAddReminder = (newReminder: Omit<Reminder, 'id' | 'history'>) => {
        setReminders(prev => [...prev, { ...newReminder, id: Date.now().toString(), history: {} }]);
        setAddModalOpen(false);
    };

    const handleDeleteReminder = (id: string) => {
        setReminders(prev => prev.filter(r => r.id !== id));
    };

    const stopAlarm = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
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
        stopAlarm();
        setNotification(null);
    };

    // ===== Médicos =====
    const handleSaveDoctor = (data: Omit<Doctor, 'id'>) => {
        const editingId = doctorModal.editing?.id;
        if (editingId) {
            setDoctors(prev => prev.map(d => (d.id === editingId ? { ...d, ...data } : d)));
        } else {
            setDoctors(prev => [...prev, { ...data, id: generateId() }]);
        }
        setDoctorModal({ open: false, editing: null });
    };

    const handleDeleteDoctor = (id: string) => {
        const linked = appointments.filter(a => a.doctorId === id).length;
        const message = linked > 0
            ? `Excluir este médico? ${linked} consulta(s) agendada(s) com ele será(ão) mantida(s), mas perderão o vínculo.`
            : 'Excluir este médico?';
        if (!window.confirm(message)) return;
        setDoctors(prev => prev.filter(d => d.id !== id));
        // As consultas mantêm o nome (snapshot) e apenas perdem o vínculo.
        setAppointments(prev => prev.map(a => (a.doctorId === id ? { ...a, doctorId: '' } : a)));
    };

    // ===== Consultas =====
    const handleSaveAppointment = (data: Omit<Appointment, 'id' | 'notifiedOffsets'>) => {
        const editingId = appointmentModal.editing?.id;
        if (editingId) {
            setAppointments(prev => prev.map(a => {
                if (a.id !== editingId) return a;
                // Lembrete alterado: permite que o novo horário de aviso dispare de novo.
                const notifiedOffsets = a.reminderOffset === data.reminderOffset ? a.notifiedOffsets : [];
                return { ...a, ...data, notifiedOffsets };
            }));
        } else {
            setAppointments(prev => [
                ...prev,
                { ...data, id: generateId(), notifiedOffsets: [], createdAt: new Date().toISOString() },
            ]);
        }
        setAppointmentModal({ open: false, editing: null });
    };

    const handleDeleteAppointment = (id: string) => {
        setAppointments(prev => prev.filter(a => a.id !== id));
    };

    // ===== Plano de saúde =====
    const handleSavePlan = (data: Omit<HealthPlan, 'id'>) => {
        const editingId = planModal.editing?.id;
        if (editingId) {
            setPlans(prev => prev.map(p => (p.id === editingId ? { ...p, ...data } : p)));
        } else {
            setPlans(prev => [...prev, { ...data, id: generateId() }]);
        }
        setPlanModal({ open: false, editing: null });
    };

    const handleDeletePlan = (id: string) => {
        if (!window.confirm('Excluir este plano de saúde?')) return;
        setPlans(prev => prev.filter(p => p.id !== id));
    };

    // ===== Exames =====
    const handleSaveExam = (data: Omit<Exam, 'id'>) => {
        const editingId = examModal.editing?.id;
        if (editingId) {
            setExams(prev => prev.map(e => (e.id === editingId ? { ...e, ...data } : e)));
        } else {
            setExams(prev => [...prev, { ...data, id: generateId() }]);
        }
        setExamModal({ open: false, editing: null });
    };

    const handleDeleteExam = (id: string) => {
        if (!window.confirm('Excluir este exame?')) return;
        setExams(prev => prev.filter(e => e.id !== id));
    };

    const handleAppointmentNotificationDismiss = (appointmentId: string, offsetMinutes: number) => {
        setAppointments(prev => prev.map(a => (
            a.id === appointmentId && !a.notifiedOffsets.includes(offsetMinutes)
                ? { ...a, notifiedOffsets: [...a.notifiedOffsets, offsetMinutes] }
                : a
        )));
        stopAlarm();
        setAppointmentNotification(null);
    };

    const notificationDoctor = appointmentNotification
        ? doctors.find(d => d.id === appointmentNotification.appointment.doctorId)
        : undefined;

    return (
        <div className="min-h-screen bg-brand-gray-100 text-brand-gray-800 dark:bg-brand-gray-900 dark:text-brand-gray-200 font-sans">
            <header className="bg-white dark:bg-brand-gray-800 shadow-md">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <PillIcon className="w-8 h-8 text-brand-blue" />
                        <h1 className="text-2xl font-bold text-brand-blue">Remédio na Hora</h1>
                    </div>
                    <button
                        onClick={() => setSettingsOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-brand-gray-500 dark:text-brand-gray-300 hover:text-brand-blue hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700 transition-colors"
                        aria-label="Configurações de IA (API NVIDIA)"
                        title="Configurações de IA (API NVIDIA)"
                    >
                        <GearIcon className="w-5 h-5" />
                        IA
                    </button>
                </div>
            </header>

            <nav className="container mx-auto px-4 pt-4 md:px-6 md:pt-6">
                <div className="grid grid-cols-2 gap-1 max-w-md mx-auto bg-brand-gray-200 dark:bg-brand-gray-700 rounded-xl p-1">
                    <NavButton active={mainTab === 'meds'} onClick={() => setMainTab('meds')} label="Remédios" icon={<PillIcon className="w-5 h-5" />} />
                    <NavButton active={mainTab === 'health'} onClick={() => setMainTab('health')} label="Minha Saúde" icon={<StethoscopeIcon className="w-5 h-5" />} />
                </div>
            </nav>

            {mainTab === 'meds' && (
            <main className="container mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-brand-gray-800 p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Calendário de Doses</h2>
                    </div>
                    <Calendar reminders={reminders} appointments={appointments} exams={exams} />
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
            )}

            {mainTab === 'health' && (
                <main className="container mx-auto p-4 md:p-6">
                    <div className="bg-white dark:bg-brand-gray-800 p-6 rounded-xl shadow-lg max-w-3xl mx-auto">
                        <div className="flex justify-between items-center flex-wrap gap-3 mb-5">
                            <div className="inline-flex bg-brand-gray-100 dark:bg-brand-gray-700 rounded-lg p-1">
                                <button onClick={() => setHealthTab('appointments')} className={subTabClass(healthTab === 'appointments')}>Consultas</button>
                                <button onClick={() => setHealthTab('exams')} className={subTabClass(healthTab === 'exams')}>Exames</button>
                                <button onClick={() => setHealthTab('doctors')} className={subTabClass(healthTab === 'doctors')}>Médicos</button>
                                <button onClick={() => setHealthTab('plans')} className={subTabClass(healthTab === 'plans')}>Plano</button>
                            </div>
                            <button
                                onClick={() => {
                                    if (healthTab === 'doctors') setDoctorModal({ open: true, editing: null });
                                    else if (healthTab === 'plans') setPlanModal({ open: true, editing: null });
                                    else if (healthTab === 'exams') setExamModal({ open: true, editing: null });
                                    else setAppointmentModal({ open: true, editing: null });
                                }}
                                className="flex items-center bg-brand-blue text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200"
                                aria-label={healthTab === 'doctors' ? 'Adicionar novo médico' : healthTab === 'plans' ? 'Adicionar novo plano de saúde' : healthTab === 'exams' ? 'Adicionar novo exame' : 'Adicionar nova consulta'}
                            >
                                <PlusIcon className="w-5 h-5 mr-2" />
                                {healthTab === 'doctors' ? 'Novo médico' : healthTab === 'plans' ? 'Novo plano' : healthTab === 'exams' ? 'Novo exame' : 'Nova consulta'}
                            </button>
                        </div>
                        {healthTab === 'doctors' ? (
                            <DoctorsTab
                                doctors={doctors}
                                onEdit={doctor => setDoctorModal({ open: true, editing: doctor })}
                                onDelete={handleDeleteDoctor}
                            />
                        ) : healthTab === 'plans' ? (
                            <HealthPlansTab
                                plans={plans}
                                onEdit={plan => setPlanModal({ open: true, editing: plan })}
                                onDelete={handleDeletePlan}
                            />
                        ) : healthTab === 'exams' ? (
                            <ExamsTab
                                exams={exams}
                                onEdit={exam => setExamModal({ open: true, editing: exam })}
                                onDelete={handleDeleteExam}
                            />
                        ) : (
                            <AppointmentsTab
                                appointments={appointments}
                                doctors={doctors}
                                onEdit={appointment => setAppointmentModal({ open: true, editing: appointment })}
                                onDelete={handleDeleteAppointment}
                            />
                        )}
                    </div>
                </main>
            )}
            
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

            {doctorModal.open && (
                <DoctorFormModal
                    onClose={() => setDoctorModal({ open: false, editing: null })}
                    onSave={handleSaveDoctor}
                    editing={doctorModal.editing}
                />
            )}

            {appointmentModal.open && (
                <AppointmentFormModal
                    onClose={() => setAppointmentModal({ open: false, editing: null })}
                    onSave={handleSaveAppointment}
                    doctors={doctors}
                    editing={appointmentModal.editing}
                />
            )}

            {planModal.open && (
                <HealthPlanFormModal
                    onClose={() => setPlanModal({ open: false, editing: null })}
                    onSave={handleSavePlan}
                    editing={planModal.editing}
                    onOpenSettings={() => setSettingsOpen(true)}
                />
            )}

            {examModal.open && (
                <ExamFormModal
                    onClose={() => setExamModal({ open: false, editing: null })}
                    onSave={handleSaveExam}
                    doctors={doctors}
                    editing={examModal.editing}
                    onOpenSettings={() => setSettingsOpen(true)}
                />
            )}

            {isSettingsOpen && (
                <SettingsModal onClose={() => setSettingsOpen(false)} />
            )}

            {appointmentNotification && (
                <AppointmentNotificationModal
                    appointment={appointmentNotification.appointment}
                    offsetMinutes={appointmentNotification.offsetMinutes}
                    doctorPhone={notificationDoctor?.phone}
                    onDismiss={handleAppointmentNotificationDismiss}
                />
            )}
            <audio ref={audioRef} src={ALARM_SOUND_B64} loop />
        </div>
    );
};

export default App;
