
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
