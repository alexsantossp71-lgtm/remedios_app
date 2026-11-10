
export interface Medication {
    name: string;
}

export enum ReminderStatus {
    TAKEN = 'taken',
    SKIPPED = 'skipped',
}

export interface Reminder {
    id: string;
    medicationName: string;
    startDate: string; // YYYY-MM-DD
    duration: {
        type: 'days' | 'continuous';
        days: number;
    };
    frequency: {
        type: 'daily' | 'interval';
        days: number;
    };
    times: string[]; // HH:MM
    history: Record<string, Record<string, ReminderStatus>>; // { 'YYYY-MM-DD': { 'HH:MM': status } }
}

export interface Doctor {
    id: string;
    name: string;
    specialty: string;
    crm: string;
    phone: string; // apenas dígitos ou formato livre; usado para ligar/WhatsApp
    clinic: string;
}

/** Minutos antes da consulta em que o lembrete dispara. */
export type AppointmentReminderOffset = 0 | 60 | 1440;

export interface Appointment {
    id: string;
    doctorId: string; // vazio quando o médico não está cadastrado
    doctorName: string; // nome no momento do cadastro (snapshot, sobrevive à exclusão do médico)
    dateTime: string; // ISO local: 'YYYY-MM-DDTHH:MM'
    location: string;
    reason: string;
    notes: string;
    reminderOffset: AppointmentReminderOffset;
    /** Offsets cujo lembrete já foi exibido (evita repetir o alarme). */
    notifiedOffsets: number[];
    /** Momento da criação (ISO). Evita disparar lembrete "atrasado" para
     * consultas criadas depois do horário em que o lembrete deveria tocar. */
    createdAt?: string;
}
