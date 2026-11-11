
// Acesso resiliente ao localStorage: nunca lança, valida o formato dos dados
// e descarta (com aviso no console) conteúdos corrompidos ou inválidos.

export type Validator = (value: unknown) => boolean;

/** Chaves usadas pelo app no localStorage, centralizadas para evitar typos. */
export const STORAGE_KEYS = {
    reminders: 'medicationReminders',
    doctors: 'healthDoctors',
    appointments: 'healthAppointments',
    plans: 'healthPlans',
    exams: 'healthExams',
    settings: 'aiSettings',
} as const;

/** ID único; usa crypto.randomUUID quando disponível (contexto seguro). */
export function generateId(): string {
    try {
        return crypto.randomUUID();
    } catch {
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const isReminderArray: Validator = (value) =>
    Array.isArray(value) &&
    value.every((r) =>
        isRecord(r) &&
        typeof r.id === 'string' &&
        typeof r.medicationName === 'string' &&
        typeof r.startDate === 'string' &&
        isRecord(r.duration) && typeof r.duration.type === 'string' &&
        isRecord(r.frequency) && typeof r.frequency.type === 'string' &&
        Array.isArray(r.times) && r.times.every((t) => typeof t === 'string') &&
        isRecord(r.history)
    );

export const isDoctorArray: Validator = (value) =>
    Array.isArray(value) &&
    value.every((d) =>
        isRecord(d) &&
        typeof d.id === 'string' &&
        typeof d.name === 'string'
    );

export const isAppointmentArray: Validator = (value) =>
    Array.isArray(value) &&
    value.every((a) =>
        isRecord(a) &&
        typeof a.id === 'string' &&
        typeof a.doctorName === 'string' &&
        typeof a.dateTime === 'string'
    );

export const isHealthPlanArray: Validator = (value) =>
    Array.isArray(value) &&
    value.every((p) =>
        isRecord(p) &&
        typeof p.id === 'string' &&
        typeof p.operator === 'string' &&
        typeof p.planName === 'string'
    );

export const isExamArray: Validator = (value) =>
    Array.isArray(value) &&
    value.every((e) =>
        isRecord(e) &&
        typeof e.id === 'string' &&
        typeof e.name === 'string' &&
        typeof e.category === 'string' &&
        typeof e.status === 'string' &&
        typeof e.date === 'string'
    );

/**
 * Lê e valida um valor JSON do localStorage.
 * Retorna `null` quando a chave não existe ou o conteúdo é inválido/corrompido.
 */
export function loadJson<T>(key: string, isValid: Validator): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!isValid(parsed)) {
            console.warn(`Dados com formato inesperado no localStorage (chave "${key}"). Serão ignorados.`);
            return null;
        }
        return parsed as T;
    } catch (error) {
        console.error(`Não foi possível ler "${key}" do localStorage.`, error);
        return null;
    }
}

/** Salva um valor no localStorage. Retorna `false` se a gravação falhar (ex.: cota cheia). */
export function saveJson(key: string, value: unknown): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Não foi possível salvar "${key}" no localStorage.`, error);
        return false;
    }
}
