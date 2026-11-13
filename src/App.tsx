
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Reminder, ReminderStatus, Medication, Doctor, Appointment, HealthPlan, Exam, LabResult } from './types';
import { getMedications } from './services/nvidiaService';
import { FALLBACK_MEDICATIONS } from './data/medications';
import { STORAGE_KEYS, generateId, isAppointmentArray, isDoctorArray, isExamArray, isHealthPlanArray, isLabResultArray, isReminderArray } from './storage';
import { loadSecureJson, saveSecureJson, isVaultUnlocked, lockSecureVault, flushSecureWrites } from './services/secureStorage';
import SecurityGate from './components/SecurityGate';
import { formatDateTimeBR, parseLocalDate, parseLocalDateTime } from './utils/datetime';
import { showSystemNotification, vibrateAlarm } from './utils/notify';
import MissedDosesModal from './components/MissedDosesModal';
import { findMissedDoses, MissedDose } from './utils/missedDoses';
import { isPushEnabled, syncDoseSchedule } from './services/pushNotifications';
import NotificationsBanner from './components/NotificationsBanner';
import AddReminderModal from './components/AddReminderModal';
import Calendar from './components/Calendar';
import ReminderList from './components/ReminderList';
import AdherenceCard from './components/AdherenceCard';
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
import ExamNotificationModal from './components/ExamNotificationModal';
import SettingsModal from './components/SettingsModal';
import PrescriptionImportModal from './components/PrescriptionImportModal';
import InteractionsModal from './components/InteractionsModal';
import BulaModal from './components/BulaModal';
import ConsultationSummaryModal from './components/ConsultationSummaryModal';
import ScheduleAdvisorModal from './components/ScheduleAdvisorModal';
import LabFormModal from './components/LabFormModal';
import LabResultsTab from './components/LabResultsTab';
import type { ReminderDraft } from './utils/prescription';
import { GearIcon, PlusIcon, PillIcon, StethoscopeIcon, FileTextIcon, CalendarIcon, ChartIcon, SparklesIcon, ClockIcon } from './constants';

type MainTab = 'home' | 'meds' | 'schedule' | 'health';
type HealthTab = 'appointments' | 'doctors' | 'plans' | 'exams' | 'labs';

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
const AppContent: React.FC<{ onLock: () => void }> = ({ onLock }) => {
    // Dados lidos do localStorage uma única vez, nos initializers (app 100%
    // cliente, sem SSR): o primeiro render já traz tudo, sem cascade de effect.
    const [reminders, setReminders] = useState<Reminder[]>(
        () => loadSecureJson<Reminder[]>(STORAGE_KEYS.reminders, isReminderArray) ?? []
    );
    const [medications, setMedications] = useState<Medication[]>([]);
    const [isLoadingMeds, setIsLoadingMeds] = useState(true);
    const [medsError, setMedsError] = useState<string | null>(null);

    // Cadastros de "Minha Saúde"
    const [doctors, setDoctors] = useState<Doctor[]>(() => loadSecureJson<Doctor[]>(STORAGE_KEYS.doctors, isDoctorArray) ?? []);
    const [appointments, setAppointments] = useState<Appointment[]>(
        () => loadSecureJson<Appointment[]>(STORAGE_KEYS.appointments, isAppointmentArray) ?? []
    );
    const [plans, setPlans] = useState<HealthPlan[]>(() => loadSecureJson<HealthPlan[]>(STORAGE_KEYS.plans, isHealthPlanArray) ?? []);
    const [exams, setExams] = useState<Exam[]>(() => loadSecureJson<Exam[]>(STORAGE_KEYS.exams, isExamArray) ?? []);
    const [labs, setLabs] = useState<LabResult[]>(() => loadSecureJson<LabResult[]>(STORAGE_KEYS.labs, isLabResultArray) ?? []);

    // Navegação por abas
    const [mainTab, setMainTab] = useState<MainTab>('home');
    const [healthTab, setHealthTab] = useState<HealthTab>('appointments');

    const [reminderModal, setReminderModal] = useState<{ open: boolean; editing: Reminder | null }>({ open: false, editing: null });
    const [notification, setNotification] = useState<{ reminder: Reminder; time: string } | null>(null);
    const [doctorModal, setDoctorModal] = useState<{ open: boolean; editing: Doctor | null }>({ open: false, editing: null });
    const [appointmentModal, setAppointmentModal] = useState<{ open: boolean; editing: Appointment | null }>({ open: false, editing: null });
    const [planModal, setPlanModal] = useState<{ open: boolean; editing: HealthPlan | null }>({ open: false, editing: null });
    const [examModal, setExamModal] = useState<{ open: boolean; editing: Exam | null }>({ open: false, editing: null });
    const [labModalOpen, setLabModalOpen] = useState(false);
    const [appointmentNotification, setAppointmentNotification] = useState<{ appointment: Appointment; offsetMinutes: number } | null>(null);
    const [examNotification, setExamNotification] = useState<{ exam: Exam; offsetMinutes: number } | null>(null);
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    // Recursos de IA (Camada 1): importar receita, interações e bula simplificada.
    const [prescriptionOpen, setPrescriptionOpen] = useState(false);
    const [interactionsOpen, setInteractionsOpen] = useState(false);
    const [bulaReminder, setBulaReminder] = useState<Reminder | null>(null);
    // Recursos de IA (Camada 2): resumo para consulta e insights de adesão.
    const [consultationOpen, setConsultationOpen] = useState(false);
    // Recurso de IA (Camada 3): agendamento inteligente (redistribui horários).
    const [scheduleOpen, setScheduleOpen] = useState(false);
    // Doses de hoje que passaram do horário sem resposta; null = ainda não verificado.
    const [missedDoses, setMissedDoses] = useState<MissedDose[] | null>(
        () => findMissedDoses(loadSecureJson<Reminder[]>(STORAGE_KEYS.reminders, isReminderArray) ?? [])
    );

    const audioRef = useRef<HTMLAudioElement>(null);
    const timeoutRef = useRef<number | null>(null);
    const appointmentTimeoutRef = useRef<number | null>(null);
    const examTimeoutRef = useRef<number | null>(null);
    const remindersRef = useRef<Reminder[]>([]);

    useEffect(() => {
        remindersRef.current = reminders;
    }, [reminders]);


    useEffect(() => {
        saveSecureJson(STORAGE_KEYS.reminders, reminders);
    }, [reminders]);

    // Quando o usuário optou por Push, sincroniza somente instantes UTC.
    // O serviço nunca recebe nome, dose, histórico ou qualquer dado clínico.
    useEffect(() => {
        if (!isPushEnabled()) return;
        void syncDoseSchedule(reminders).catch((error: unknown) => {
            console.warn('Não foi possível atualizar os horários Push neste momento.', error);
        });
    }, [reminders]);

    useEffect(() => {
        saveSecureJson(STORAGE_KEYS.doctors, doctors);
    }, [doctors]);

    useEffect(() => {
        saveSecureJson(STORAGE_KEYS.appointments, appointments);
    }, [appointments]);

    useEffect(() => {
        saveSecureJson(STORAGE_KEYS.plans, plans);
    }, [plans]);

    useEffect(() => {
        saveSecureJson(STORAGE_KEYS.exams, exams);
    }, [exams]);

    useEffect(() => {
        saveSecureJson(STORAGE_KEYS.labs, labs);
    }, [labs]);

    useEffect(() => {
        const fetchMedications = async () => {
            try {
                const meds = await getMedications();
                setMedications(meds);
            } catch (error) {
                console.error("Failed to fetch medications:", error);
                setMedsError("Lista online indisponível — usando lista offline de medicamentos comuns.");
                setMedications(FALLBACK_MEDICATIONS);
            } finally {
                setIsLoadingMeds(false);
            }
        };

        fetchMedications();
    }, []);
    
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
            // parseLocalDate: 'YYYY-MM-DD' é data LOCAL; new Date() interpretaria
            // como UTC e deslocaria um dia em fusos negativos (America/Sao_Paulo).
            const startDate = parseLocalDate(reminder.startDate);
            if (!startDate) return;

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


    // Function expression nomeada: o callback do setTimeout re-agenda o próximo
    // alarme chamando a própria função (auto-referência sem TDZ).
    const scheduleNextAlarm = useCallback(function scheduleDose() {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        const { nextAlarmTime, nextAlarmReminder } = getNextAlarm();

        if (!nextAlarmTime || !nextAlarmReminder) return;

        const timeToAlarm = nextAlarmTime.getTime() - Date.now();
        if (timeToAlarm <= 0) return;

        timeoutRef.current = window.setTimeout(() => {
            setNotification(nextAlarmReminder);
            // Aviso do sistema quando a página está em segundo plano
            // (tela apagada / aba oculta); em primeiro plano o modal já avisa.
            if (document.hidden) {
                showSystemNotification(
                    'Hora do remédio',
                    `${nextAlarmReminder.reminder.medicationName} — dose das ${nextAlarmReminder.time}`,
                    `remedio-${nextAlarmReminder.reminder.id}-${nextAlarmReminder.time}`
                );
                vibrateAlarm();
            }
            if(audioRef.current) {
                audioRef.current.play().catch(e => console.error("Error playing sound:", e));
            }
            scheduleDose();
        }, timeToAlarm);
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

    const scheduleNextAppointmentAlarm = useCallback(function scheduleAppointment() {
        if (appointmentTimeoutRef.current) {
            clearTimeout(appointmentTimeoutRef.current);
        }

        const next = getNextAppointmentAlarm();
        if (!next) return;

        const delay = Math.max(0, next.time.getTime() - Date.now());
        appointmentTimeoutRef.current = window.setTimeout(() => {
            setAppointmentNotification({ appointment: next.appointment, offsetMinutes: next.offset });
            // Aviso do sistema para consultas também (segundo plano).
            if (document.hidden) {
                showSystemNotification(
                    'Lembrete de consulta',
                    `${next.appointment.doctorName} — ${formatDateTimeBR(next.appointment.dateTime)}${next.appointment.location ? ` (${next.appointment.location})` : ''}`,
                    `consulta-${next.appointment.id}-${next.offset}`
                );
                vibrateAlarm();
            }
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.error("Error playing sound:", e));
            }
            scheduleAppointment();
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

    // ===== Alarmes de exame agendado (mesmo mecanismo das consultas) =====
    const getNextExamAlarm = useCallback((): { time: Date; exam: Exam; offset: number } | null => {
        const now = Date.now();
        const candidates = exams.flatMap(exam => {
            if (exam.status !== 'scheduled') return [];
            const offset = exam.reminderOffset ?? 0;
            if (offset <= 0) return [];
            if ((exam.notifiedOffsets ?? []).includes(offset)) return [];

            // Exame sem hora definida: alarme ancorado às 08:00 do dia.
            const scheduledMs = parseLocalDateTime(`${exam.date}T${exam.time || '08:00'}`)?.getTime();
            if (!scheduledMs) return [];

            const triggerMs = scheduledMs - offset * 60_000;
            // Se o horário do lembrete passou com o app fechado, dispara assim
            // que abrir — mas apenas quando o exame foi cadastrado ANTES desse
            // horário. Exames antigos (sem createdAt) nunca disparam atrasado.
            const createdMs = exam.createdAt ? Date.parse(exam.createdAt) : Infinity;
            const dueMs = triggerMs <= now && createdMs <= triggerMs ? now : triggerMs;
            if (dueMs < now) return [];

            return [{ time: new Date(dueMs), exam, offset }];
        });

        if (candidates.length === 0) return null;
        candidates.sort((a, b) => a.time.getTime() - b.time.getTime());
        return candidates[0];
    }, [exams]);

    const scheduleNextExamAlarm = useCallback(function scheduleExam() {
        if (examTimeoutRef.current) {
            clearTimeout(examTimeoutRef.current);
        }

        const next = getNextExamAlarm();
        if (!next) return;

        const delay = Math.max(0, next.time.getTime() - Date.now());
        examTimeoutRef.current = window.setTimeout(() => {
            setExamNotification({ exam: next.exam, offsetMinutes: next.offset });
            // Aviso do sistema quando a página está em segundo plano.
            if (document.hidden) {
                showSystemNotification(
                    'Lembrete de exame',
                    `${next.exam.name} — ${formatDateTimeBR(`${next.exam.date}T${next.exam.time || '08:00'}`)}`,
                    `exame-${next.exam.id}-${next.offset}`
                );
                vibrateAlarm();
            }
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.error("Error playing sound:", e));
            }
            scheduleExam();
        }, delay);
    }, [getNextExamAlarm]);

    useEffect(() => {
        scheduleNextExamAlarm();
        return () => {
            if (examTimeoutRef.current) {
                clearTimeout(examTimeoutRef.current);
            }
        };
    }, [exams, scheduleNextExamAlarm]);

    // Mantém a lista de doses atrasadas em sincronia com o histórico
    // (ex.: marcar "Tomei" no modal remove a dose da lista na hora; quem
    // fechou com "Responder depois" vê a lista reaparecer quando os dados
    // mudam). Estado local deliberado: derivado de reminders, com override
    // manual enquanto o usuário não interage.
    useEffect(() => {
        setMissedDoses(prev => (prev === null ? null : findMissedDoses(reminders)));
    }, [reminders]);

    // Ao voltar para o app (aba retomada, celular desbloqueado), reavalia
    // alarmes que não puderam tocar e doses que passaram em segundo plano.
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            setMissedDoses(findMissedDoses(remindersRef.current));
            scheduleNextAlarm();
            scheduleNextAppointmentAlarm();
            scheduleNextExamAlarm();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [scheduleNextAlarm, scheduleNextAppointmentAlarm, scheduleNextExamAlarm]);

    const handleSaveReminder = (data: Omit<Reminder, 'id' | 'history' | 'createdAt'>) => {
        const editingId = reminderModal.editing?.id;
        if (editingId) {
            // Edição preserva id, histórico de doses e createdAt (para não
            // "apagar" o histórico nem rearmar doses perdidas).
            setReminders(prev => prev.map(r => (r.id === editingId ? { ...r, ...data } : r)));
        } else {
            setReminders(prev => [
                ...prev,
                { ...data, id: generateId(), history: {}, createdAt: new Date().toISOString() },
            ]);
        }
        setReminderModal({ open: false, editing: null });
    };

    const handleDeleteReminder = (id: string) => {
        setReminders(prev => prev.filter(r => r.id !== id));
    };

    // ===== Receita importada (IA): cria vários lembretes de uma vez =====
    const handleImportPrescription = (drafts: ReminderDraft[]) => {
        if (!drafts.length) return;
        setReminders(prev => [
            ...prev,
            ...drafts.map(draft => ({
                ...draft,
                id: generateId(),
                history: {},
                createdAt: new Date().toISOString(),
            })),
        ]);
        setPrescriptionOpen(false);
    };

    // ===== Agendamento inteligente (IA): aplica os novos horários escolhidos =====
    const handleApplySchedule = (updates: Array<{ id: string; times: string[] }>) => {
        if (!updates.length) return;
        const byId = new Map(updates.map(update => [update.id, update.times]));
        setReminders(prev => prev.map(r => (byId.has(r.id) ? { ...r, times: byId.get(r.id)! } : r)));
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
    const handleSaveExam = (data: Omit<Exam, 'id' | 'notifiedOffsets' | 'createdAt'>) => {
        const editingId = examModal.editing?.id;
        if (editingId) {
            setExams(prev => prev.map(e => {
                if (e.id !== editingId) return e;
                // Data, hora ou lembrete alterados: permite que o alarme
                // rearmado pelo novo horário dispare de novo.
                const scheduleChanged =
                    e.date !== data.date || e.time !== data.time || e.reminderOffset !== data.reminderOffset;
                return { ...e, ...data, notifiedOffsets: scheduleChanged ? [] : (e.notifiedOffsets ?? []) };
            }));
        } else {
            setExams(prev => [
                ...prev,
                { ...data, id: generateId(), notifiedOffsets: [], createdAt: new Date().toISOString() },
            ]);
        }
        setExamModal({ open: false, editing: null });
    };

    const handleDeleteExam = (id: string) => {
        if (!window.confirm('Excluir este exame?')) return;
        setExams(prev => prev.filter(e => e.id !== id));
    };

    // ===== Laudos de laboratório (IA lê a foto; comparações são locais) =====
    const handleSaveLab = (data: Omit<LabResult, 'id' | 'createdAt'>) => {
        setLabs(prev => [
            ...prev,
            { ...data, id: generateId(), createdAt: new Date().toISOString() },
        ]);
        setLabModalOpen(false);
    };

    const handleDeleteLab = (id: string) => {
        if (!window.confirm('Excluir este laudo?')) return;
        setLabs(prev => prev.filter(l => l.id !== id));
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

    const handleExamNotificationDismiss = (examId: string, offsetMinutes: number) => {
        setExams(prev => prev.map(e => (
            e.id === examId && !(e.notifiedOffsets ?? []).includes(offsetMinutes)
                ? { ...e, notifiedOffsets: [...(e.notifiedOffsets ?? []), offsetMinutes] }
                : e
        )));
        stopAlarm();
        setExamNotification(null);
    };

    const notificationDoctor = appointmentNotification
        ? doctors.find(d => d.id === appointmentNotification.appointment.doctorId)
        : undefined;

    const nextDose = getNextAlarm();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dosesTakenToday = reminders.reduce((total, reminder) => (
        total + Object.values(reminder.history[todayKey] ?? {}).filter(status => status === ReminderStatus.TAKEN).length
    ), 0);
    const upcomingAppointments = appointments.filter(appointment => (
        (parseLocalDateTime(appointment.dateTime)?.getTime() ?? 0) >= Date.now()
    )).length;
    const todayLabel = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="app-shell min-h-screen text-slate-800 dark:text-slate-100">
            <header className="app-header sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-700/70">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg">
                            <PillIcon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900 dark:text-white md:text-xl">Remédios na Hora</h1>
                            <p className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 sm:block">Sua rotina de cuidado, organizada</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSettingsOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-teal-200 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-teal-300"
                        aria-label="Configurações"
                        title="Configurações"
                    >
                        <GearIcon className="h-5 w-5" />
                        <span className="hidden sm:inline">Configurações</span>
                    </button>
                </div>
            </header>

            <nav className="mx-auto max-w-7xl px-4 pt-4 md:px-8 md:pt-6" aria-label="Navegação principal">
                <div className="app-nav grid grid-cols-2 gap-1.5 rounded-2xl p-1.5 sm:grid-cols-4">
                    <NavButton active={mainTab === 'home'} onClick={() => setMainTab('home')} label="Início" icon={<ChartIcon className="h-5 w-5" />} />
                    <NavButton active={mainTab === 'meds'} onClick={() => setMainTab('meds')} label="Medicamentos" icon={<PillIcon className="h-5 w-5" />} />
                    <NavButton active={mainTab === 'schedule'} onClick={() => setMainTab('schedule')} label="Agenda" icon={<CalendarIcon className="h-5 w-5" />} />
                    <NavButton active={mainTab === 'health'} onClick={() => setMainTab('health')} label="Minha Saúde" icon={<StethoscopeIcon className="h-5 w-5" />} />
                </div>
            </nav>

            {(mainTab === 'home' || mainTab === 'meds') && <NotificationsBanner />}

            {mainTab === 'home' && (
                <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
                    <section className="dashboard-hero relative overflow-hidden rounded-3xl p-6 text-white shadow-xl md:p-8">
                        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />
                        <div className="pointer-events-none absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-white/5" />
                        <div className="relative grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
                            <div>
                                <p className="text-sm font-semibold capitalize text-teal-100">{todayLabel}</p>
                                <h2 className="mt-2 max-w-xl text-2xl font-extrabold leading-tight md:text-3xl">Olá! Vamos cuidar da sua saúde hoje?</h2>
                                <p className="mt-3 max-w-lg text-sm leading-6 text-teal-50/90 md:text-base">Acompanhe seus medicamentos, horários e compromissos em um só lugar.</p>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <button onClick={() => setReminderModal({ open: true, editing: null })} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-teal-800 shadow-md transition hover:bg-teal-50">
                                        <PlusIcon className="h-5 w-5" /> Adicionar medicamento
                                    </button>
                                    <button onClick={() => setMainTab('schedule')} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">
                                        <CalendarIcon className="h-5 w-5" /> Ver agenda
                                    </button>
                                </div>
                            </div>
                            <div className="next-dose-card rounded-2xl border border-white/20 bg-white/12 p-5 backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-sm font-semibold text-teal-50">
                                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,0.16)]" />
                                    Próxima dose
                                </div>
                                {nextDose.nextAlarmReminder && nextDose.nextAlarmTime ? (
                                    <>
                                        <p className="mt-4 text-4xl font-extrabold tracking-tight">{nextDose.nextAlarmTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                        <p className="mt-1 text-lg font-bold">{nextDose.nextAlarmReminder.reminder.medicationName}</p>
                                        <p className="mt-1 text-sm text-teal-50/80">{nextDose.nextAlarmReminder.reminder.dosage || 'Dose programada'} · Hoje</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="mt-4 text-xl font-bold">Tudo em dia por enquanto</p>
                                        <p className="mt-2 text-sm leading-5 text-teal-50/80">Não há outra dose programada para hoje. Consulte seus lembretes para conferir a rotina.</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-4 sm:grid-cols-3">
                        <div className="app-stat-card">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Lembretes cadastrados</span>
                                <span className="stat-icon bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"><PillIcon className="h-5 w-5" /></span>
                            </div>
                            <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">{reminders.length}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Medicamentos na sua rotina</p>
                        </div>
                        <div className="app-stat-card">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Doses tomadas hoje</span>
                                <span className="stat-icon bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><ChartIcon className="h-5 w-5" /></span>
                            </div>
                            <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">{dosesTakenToday}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Registros marcados como tomados</p>
                        </div>
                        <div className="app-stat-card">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Compromissos futuros</span>
                                <span className="stat-icon bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"><CalendarIcon className="h-5 w-5" /></span>
                            </div>
                            <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">{upcomingAppointments}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Consultas agendadas</p>
                        </div>
                    </section>

                    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                        <div className="app-panel p-5 md:p-6">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sua rotina de medicamentos</h3>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Acesso rápido aos lembretes cadastrados</p>
                                </div>
                                <button onClick={() => setMainTab('meds')} className="shrink-0 text-sm font-bold text-teal-700 hover:text-teal-800 dark:text-teal-300">Ver todos</button>
                            </div>
                            {reminders.length > 0 ? (
                                <ReminderList
                                    reminders={reminders.slice(0, 3)}
                                    onEdit={reminder => setReminderModal({ open: true, editing: reminder })}
                                    onDelete={handleDeleteReminder}
                                    onExplain={setBulaReminder}
                                />
                            ) : (
                                <div className="empty-state rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
                                    <PillIcon className="mx-auto h-9 w-9 text-teal-600 dark:text-teal-300" />
                                    <p className="mt-3 font-bold text-slate-800 dark:text-white">Sua rotina começa aqui</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cadastre o primeiro medicamento para organizar seus horários.</p>
                                    <button onClick={() => setReminderModal({ open: true, editing: null })} className="mt-4 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">Cadastrar medicamento</button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="app-panel p-5 md:p-6">
                                <div className="flex items-center gap-3">
                                    <span className="stat-icon bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"><SparklesIcon className="h-5 w-5" /></span>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">Ferramentas inteligentes</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Recursos de apoio com inteligência artificial</p>
                                    </div>
                                </div>
                                <div className="mt-4 grid gap-2">
                                    <button onClick={() => setPrescriptionOpen(true)} className="quick-action"><FileTextIcon className="h-4 w-4" /> Importar receita</button>
                                    <button onClick={() => setInteractionsOpen(true)} disabled={reminders.length < 2} className="quick-action disabled:cursor-not-allowed disabled:opacity-45"><SparklesIcon className="h-4 w-4" /> Analisar interações</button>
                                    <button onClick={() => setConsultationOpen(true)} disabled={reminders.length === 0} className="quick-action disabled:cursor-not-allowed disabled:opacity-45"><FileTextIcon className="h-4 w-4" /> Preparar resumo para consulta</button>
                                    <button onClick={() => setScheduleOpen(true)} disabled={reminders.length === 0} className="quick-action disabled:cursor-not-allowed disabled:opacity-45"><ClockIcon className="h-4 w-4" /> Revisar horários</button>
                                </div>
                            </div>
                            <div className="app-panel p-5 md:p-6">
                                <h3 className="font-bold text-slate-900 dark:text-white">Acompanhamento</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Veja seus registros e padrões de adesão.</p>
                                <AdherenceCard reminders={reminders} />
                            </div>
                        </div>
                    </section>
                </main>
            )}

            {mainTab === 'meds' && (
                <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Sua lista pessoal</p>
                            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Medicamentos e lembretes</h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Organize doses, horários e informações de cada medicamento.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setPrescriptionOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2.5 text-sm font-bold text-teal-700 shadow-sm transition hover:bg-teal-50 dark:border-teal-800 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-slate-700">
                                <FileTextIcon className="h-5 w-5" /> Importar receita
                            </button>
                            <button onClick={() => setReminderModal({ open: true, editing: null })} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-teal-800">
                                <PlusIcon className="h-5 w-5" /> Adicionar medicamento
                            </button>
                        </div>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <section className="app-panel p-5 md:p-6">
                            <ReminderList
                                reminders={reminders}
                                onEdit={reminder => setReminderModal({ open: true, editing: reminder })}
                                onDelete={handleDeleteReminder}
                                onExplain={setBulaReminder}
                            />
                        </section>
                        <aside className="app-panel p-5 md:p-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Acompanhamento da rotina</h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Indicadores e ferramentas para acompanhar seus registros.</p>
                            <AdherenceCard reminders={reminders} />
                            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-700">
                                <button onClick={() => setInteractionsOpen(true)} disabled={reminders.length < 2} className="quick-action disabled:cursor-not-allowed disabled:opacity-45"><SparklesIcon className="h-4 w-4" /> Analisar interações (IA)</button>
                                <button onClick={() => setConsultationOpen(true)} disabled={reminders.length === 0} className="quick-action disabled:cursor-not-allowed disabled:opacity-45"><FileTextIcon className="h-4 w-4" /> Resumo para consulta</button>
                                <button onClick={() => setScheduleOpen(true)} disabled={reminders.length === 0} className="quick-action disabled:cursor-not-allowed disabled:opacity-45"><ClockIcon className="h-4 w-4" /> Otimizar horários (IA)</button>
                            </div>
                        </aside>
                    </div>
                </main>
            )}

            {mainTab === 'schedule' && (
                <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
                    <div className="mb-5">
                        <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Visão organizada do seu tempo</p>
                        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Agenda de cuidados</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Consulte doses, consultas e exames em um calendário único.</p>
                    </div>
                    <section className="app-panel p-5 md:p-7">
                        <Calendar reminders={reminders} appointments={appointments} exams={exams} />
                    </section>
                </main>
            )}

            {mainTab === 'health' && (
                <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
                    <div className="mb-5">
                        <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Seus dados de acompanhamento</p>
                        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Minha Saúde</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Consultas, profissionais, exames, laudos e plano de saúde.</p>
                    </div>
                    <div className="app-panel p-4 md:p-6">
                        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
                                <button onClick={() => setHealthTab('appointments')} className={subTabClass(healthTab === 'appointments')}>Consultas</button>
                                <button onClick={() => setHealthTab('exams')} className={subTabClass(healthTab === 'exams')}>Exames</button>
                                <button onClick={() => setHealthTab('labs')} className={subTabClass(healthTab === 'labs')}>Laudos</button>
                                <button onClick={() => setHealthTab('doctors')} className={subTabClass(healthTab === 'doctors')}>Médicos</button>
                                <button onClick={() => setHealthTab('plans')} className={subTabClass(healthTab === 'plans')}>Plano</button>
                            </div>
                            <button
                                onClick={() => {
                                    if (healthTab === 'doctors') setDoctorModal({ open: true, editing: null });
                                    else if (healthTab === 'plans') setPlanModal({ open: true, editing: null });
                                    else if (healthTab === 'exams') setExamModal({ open: true, editing: null });
                                    else if (healthTab === 'labs') setLabModalOpen(true);
                                    else setAppointmentModal({ open: true, editing: null });
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-teal-800"
                                aria-label={healthTab === 'doctors' ? 'Adicionar novo médico' : healthTab === 'plans' ? 'Adicionar novo plano de saúde' : healthTab === 'exams' ? 'Adicionar novo exame' : healthTab === 'labs' ? 'Registrar novo laudo' : 'Adicionar nova consulta'}
                            >
                                <PlusIcon className="h-5 w-5" />
                                {healthTab === 'doctors' ? 'Novo médico' : healthTab === 'plans' ? 'Novo plano' : healthTab === 'exams' ? 'Novo exame' : healthTab === 'labs' ? 'Registrar laudo' : 'Nova consulta'}
                            </button>
                        </div>
                        {healthTab === 'doctors' ? (
                            <DoctorsTab doctors={doctors} onEdit={doctor => setDoctorModal({ open: true, editing: doctor })} onDelete={handleDeleteDoctor} />
                        ) : healthTab === 'plans' ? (
                            <HealthPlansTab plans={plans} onEdit={plan => setPlanModal({ open: true, editing: plan })} onDelete={handleDeletePlan} />
                        ) : healthTab === 'exams' ? (
                            <ExamsTab exams={exams} onEdit={exam => setExamModal({ open: true, editing: exam })} onDelete={handleDeleteExam} />
                        ) : healthTab === 'labs' ? (
                            <LabResultsTab labs={labs} onDelete={handleDeleteLab} onNew={() => setLabModalOpen(true)} />
                        ) : (
                            <AppointmentsTab appointments={appointments} doctors={doctors} onEdit={appointment => setAppointmentModal({ open: true, editing: appointment })} onDelete={handleDeleteAppointment} />
                        )}
                    </div>
                </main>
            )}
            
            {reminderModal.open && (
                <AddReminderModal
                    onClose={() => setReminderModal({ open: false, editing: null })}
                    onSave={handleSaveReminder}
                    medications={medications}
                    isLoadingMeds={isLoadingMeds}
                    medsError={medsError}
                    editing={reminderModal.editing}
                />
            )}
            
            {missedDoses && missedDoses.length > 0 && !notification && !appointmentNotification && (
                <MissedDosesModal
                    doses={missedDoses}
                    onMark={handleNotificationAction}
                    onClose={() => setMissedDoses([])}
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
                />
            )}

            {examModal.open && (
                <ExamFormModal
                    onClose={() => setExamModal({ open: false, editing: null })}
                    onSave={handleSaveExam}
                    doctors={doctors}
                    editing={examModal.editing}
                />
            )}

            {prescriptionOpen && (
                <PrescriptionImportModal
                    onClose={() => setPrescriptionOpen(false)}
                    onImport={handleImportPrescription}
                />
            )}

            {interactionsOpen && (
                <InteractionsModal
                    medications={reminders.map(reminder => ({ name: reminder.medicationName, dosage: reminder.dosage }))}
                    onClose={() => setInteractionsOpen(false)}
                />
            )}

            {bulaReminder && (
                <BulaModal
                    reminder={bulaReminder}
                    onClose={() => setBulaReminder(null)}
                />
            )}

            {consultationOpen && (
                <ConsultationSummaryModal
                    reminders={reminders}
                    exams={exams}
                    appointments={appointments}
                    onClose={() => setConsultationOpen(false)}
                />
            )}

            {scheduleOpen && (
                <ScheduleAdvisorModal
                    reminders={reminders}
                    onApply={handleApplySchedule}
                    onClose={() => setScheduleOpen(false)}
                />
            )}

            {labModalOpen && (
                <LabFormModal
                    onClose={() => setLabModalOpen(false)}
                    onSave={handleSaveLab}
                />
            )}

            {isSettingsOpen && (
                <SettingsModal onClose={() => setSettingsOpen(false)} onLock={onLock} reminders={reminders} />
            )}

            {examNotification && (
                <ExamNotificationModal
                    exam={examNotification.exam}
                    onDismiss={handleExamNotificationDismiss}
                />
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

const App: React.FC = () => {
    const [unlocked, setUnlocked] = useState(() => isVaultUnlocked());
    const handleUnlock = () => setUnlocked(true);
    const handleLock = async () => {
        try {
            await flushSecureWrites();
            lockSecureVault();
            setUnlocked(false);
        } catch (error) {
            window.alert(error instanceof Error ? error.message : 'Não foi possível bloquear com segurança. Tente novamente.');
        }
    };
    return unlocked
        ? <AppContent onLock={handleLock} />
        : <SecurityGate onUnlock={handleUnlock} />;
};

export default App;
