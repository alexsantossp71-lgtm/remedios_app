
// Backup dos dados de saúde: exportação e importação de um arquivo JSON.
//
// Todos os cadastros do app vivem no localStorage deste dispositivo, então
// "limpar dados de navegação" ou trocar de aparelho apagaria tudo. O backup
// cobre lembretes (com o histórico de doses), médicos, consultas, planos e
// exames. A chave da API NVIDIA NUNCA é incluída (dado sensível do usuário).

import {
    STORAGE_KEYS,
    isAppointmentArray,
    isDoctorArray,
    isExamArray,
    isHealthPlanArray,
    isReminderArray,
    loadJson,
    saveJson,
} from '../storage';
import { Appointment, Doctor, Exam, HealthPlan, Reminder } from '../types';
import { toDateTimeInputValue } from '../utils/datetime';

/** Marcadores do formato, para rejeitar arquivos de outros apps/versões. */
const APP_ID = 'remedio-na-hora';
const FORMAT_VERSION = 1;

interface BackupData {
    reminders?: Reminder[];
    doctors?: Doctor[];
    appointments?: Appointment[];
    plans?: HealthPlan[];
    exams?: Exam[];
}

export interface BackupFile {
    app: string;
    version: number;
    exportedAt: string;
    data: BackupData;
}

export interface BackupSummary {
    reminders: number;
    doctors: number;
    appointments: number;
    plans: number;
    exams: number;
}

export type ParseResult =
    | { ok: true; data: Required<BackupData>; summary: BackupSummary }
    | { ok: false; error: string };

const VALIDATORS = {
    reminders: isReminderArray,
    doctors: isDoctorArray,
    appointments: isAppointmentArray,
    plans: isHealthPlanArray,
    exams: isExamArray,
} as const;

const LABELS: Record<keyof BackupSummary, string> = {
    reminders: 'lembrete(s)',
    doctors: 'médico(s)',
    appointments: 'consulta(s)',
    plans: 'plano(s) de saúde',
    exams: 'exame(s)',
};

/** Monta o objeto de backup a partir dos dados válidos atuais. */
export function buildBackup(): BackupFile {
    const data: BackupData = {
        reminders: loadJson<Reminder[]>(STORAGE_KEYS.reminders, isReminderArray) ?? [],
        doctors: loadJson<Doctor[]>(STORAGE_KEYS.doctors, isDoctorArray) ?? [],
        appointments: loadJson<Appointment[]>(STORAGE_KEYS.appointments, isAppointmentArray) ?? [],
        plans: loadJson<HealthPlan[]>(STORAGE_KEYS.plans, isHealthPlanArray) ?? [],
        exams: loadJson<Exam[]>(STORAGE_KEYS.exams, isExamArray) ?? [],
    };
    return { app: APP_ID, version: FORMAT_VERSION, exportedAt: toDateTimeInputValue(new Date()), data };
}

/** Gera o arquivo e dispara o download (remedio-na-hora-backup-AAAA-MM-DD.json). */
export function downloadBackup(): void {
    const json = JSON.stringify(buildBackup(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `remedio-na-hora-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/**
 * Valida o conteúdo de um arquivo de backup.
 * Chaves ausentes preservam os dados atuais da categoria; conteúdo presente
 * porém inválido rejeita a importação inteira (não corrompe pela metade).
 */
export function parseBackup(text: string): ParseResult {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return { ok: false, error: 'O arquivo não é um JSON válido.' };
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { ok: false, error: 'O arquivo não tem o formato esperado.' };
    }
    const file = parsed as Partial<BackupFile>;
    if (file.app !== APP_ID || file.version !== FORMAT_VERSION) {
        return { ok: false, error: 'Este arquivo não é um backup do Remédio na Hora (ou é de outra versão).' };
    }
    if (typeof file.data !== 'object' || file.data === null || Array.isArray(file.data)) {
        return { ok: false, error: 'O arquivo não contém a seção de dados.' };
    }

    const source = file.data as Record<string, unknown>;
    const data: Required<BackupData> = { reminders: [], doctors: [], appointments: [], plans: [], exams: [] };
    const summary: BackupSummary = { reminders: 0, doctors: 0, appointments: 0, plans: 0, exams: 0 };

    for (const key of Object.keys(VALIDATORS) as Array<keyof BackupSummary>) {
        const value = source[key];
        if (value === undefined) continue; // categoria ausente: mantém a atual
        if (!VALIDATORS[key](value)) {
            return { ok: false, error: `Conteúdo inválido na seção "${LABELS[key]}". A importação foi cancelada.` };
        }
        (data[key] as unknown[]) = value as unknown[];
        summary[key] = (value as unknown[]).length;
    }
    return { ok: true, data, summary };
}

/** Texto do diálogo de confirmação, ex.: "3 lembrete(s), 1 médico(s)...". */
export function describeSummary(summary: BackupSummary): string {
    return (Object.keys(summary) as Array<keyof BackupSummary>)
        .filter((key) => summary[key] > 0)
        .map((key) => `${summary[key]} ${LABELS[key]}`)
        .join(', ');
}

/** Grava os dados do backup no localStorage (sobrescreve cada categoria presente). */
export function applyBackup(data: Required<BackupData>): void {
    saveJson(STORAGE_KEYS.reminders, data.reminders);
    saveJson(STORAGE_KEYS.doctors, data.doctors);
    saveJson(STORAGE_KEYS.appointments, data.appointments);
    saveJson(STORAGE_KEYS.plans, data.plans);
    saveJson(STORAGE_KEYS.exams, data.exams);
}
