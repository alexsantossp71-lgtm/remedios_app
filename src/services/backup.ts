
// Backup dos dados de saúde: exportação e importação de um arquivo JSON.
//
// Os cadastros do app são protegidos no armazenamento local deste dispositivo, então
// "limpar dados de navegação" ou trocar de aparelho apagaria tudo. O backup
// cobre lembretes (com o histórico de doses), médicos, consultas, planos,
// exames e laudos laboratoriais. Configurações e credenciais internas nunca são incluídas.

import {
    STORAGE_KEYS,
    isAppointmentArray,
    isDoctorArray,
    isExamArray,
    isLabResultArray,
    isHealthPlanArray,
    isReminderArray,
    loadJson,
    saveJson,
} from '../storage';
import { Appointment, Doctor, Exam, HealthPlan, LabResult, Reminder } from '../types';
import { toDateTimeInputValue } from '../utils/datetime';
import { loadSecureJson, saveSecureJson, isVaultUnlocked, replaceSecureJsonBatch } from './secureStorage';

/** Marcadores do formato, para rejeitar arquivos de outros apps/versões. */
const APP_ID = 'remedio-na-hora';
const FORMAT_VERSION = 1;

interface BackupData {
    reminders?: Reminder[];
    doctors?: Doctor[];
    appointments?: Appointment[];
    plans?: HealthPlan[];
    exams?: Exam[];
    /** Conteúdo de STORAGE_KEYS.labs ('healthLabResults'), incluindo fotos e valores estruturados. */
    labs?: LabResult[];
}

export interface BackupFile {
    app: string;
    version: number;
    exportedAt: string;
    data: BackupData;
}

type BackupCategory = 'reminders' | 'doctors' | 'appointments' | 'plans' | 'exams' | 'labs';

const BACKUP_CATEGORIES: BackupCategory[] = ['reminders', 'doctors', 'appointments', 'plans', 'exams', 'labs'];

export interface BackupSummary {
    reminders: number;
    doctors: number;
    appointments: number;
    plans: number;
    exams: number;
    labs: number;
    included: BackupCategory[];
}

export type ParseResult =
    | { ok: true; data: Partial<Required<BackupData>>; summary: BackupSummary }
    | { ok: false; error: string };

const VALIDATORS: Record<BackupCategory, (value: unknown) => boolean> = {
    reminders: isReminderArray,
    doctors: isDoctorArray,
    appointments: isAppointmentArray,
    plans: isHealthPlanArray,
    exams: isExamArray,
    labs: isLabResultArray,
} as const;

const LABELS: Record<BackupCategory, string> = {
    reminders: 'lembrete(s)',
    doctors: 'médico(s)',
    appointments: 'consulta(s)',
    plans: 'plano(s) de saúde',
    exams: 'exame(s)',
    labs: 'laudo(s) laboratorial(is)',
};

/** Monta o objeto de backup a partir dos dados válidos atuais. */
export function buildBackup(): BackupFile {
    const data: BackupData = {
        reminders: (isVaultUnlocked() ? loadSecureJson<Reminder[]>(STORAGE_KEYS.reminders, isReminderArray) : null) ?? loadJson<Reminder[]>(STORAGE_KEYS.reminders, isReminderArray) ?? [],
        doctors: (isVaultUnlocked() ? loadSecureJson<Doctor[]>(STORAGE_KEYS.doctors, isDoctorArray) : null) ?? loadJson<Doctor[]>(STORAGE_KEYS.doctors, isDoctorArray) ?? [],
        appointments: (isVaultUnlocked() ? loadSecureJson<Appointment[]>(STORAGE_KEYS.appointments, isAppointmentArray) : null) ?? loadJson<Appointment[]>(STORAGE_KEYS.appointments, isAppointmentArray) ?? [],
        plans: (isVaultUnlocked() ? loadSecureJson<HealthPlan[]>(STORAGE_KEYS.plans, isHealthPlanArray) : null) ?? loadJson<HealthPlan[]>(STORAGE_KEYS.plans, isHealthPlanArray) ?? [],
        exams: (isVaultUnlocked() ? loadSecureJson<Exam[]>(STORAGE_KEYS.exams, isExamArray) : null) ?? loadJson<Exam[]>(STORAGE_KEYS.exams, isExamArray) ?? [],
        // STORAGE_KEYS.labs aponta diretamente para healthLabResults; preserva o registro inteiro,
        // inclusive photo (data URL), values, faixas de referência e notes.
        labs: (isVaultUnlocked() ? loadSecureJson<LabResult[]>(STORAGE_KEYS.labs, isLabResultArray) : null) ?? loadJson<LabResult[]>(STORAGE_KEYS.labs, isLabResultArray) ?? [],
    };
    return { app: APP_ID, version: FORMAT_VERSION, exportedAt: toDateTimeInputValue(new Date()), data };
}


const ENCRYPTED_FORMAT = 'remedio-na-hora-encrypted-backup';
const ENCRYPTION_VERSION = 1;
const PBKDF2_ITERATIONS = 310_000;
const MIN_PASSWORD_LENGTH = 8;

interface EncryptedBackupFile {
    app: typeof ENCRYPTED_FORMAT;
    version: number;
    algorithm: 'AES-GCM';
    kdf: 'PBKDF2-SHA-256';
    iterations: number;
    salt: string;
    iv: string;
    ciphertext: string;
}

function toBase64(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}

async function deriveBackupKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
    const material = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

/** Criptografa o backup com AES-256-GCM e chave derivada da senha via PBKDF2. */
export async function encryptBackup(password: string): Promise<string> {
    if (password.length < MIN_PASSWORD_LENGTH) {
        throw new Error('Use uma senha com pelo menos 8 caracteres.');
    }
    if (!globalThis.crypto?.subtle) {
        throw new Error('Este navegador não oferece suporte à proteção necessária. Acesse pelo site seguro (HTTPS) e tente novamente.');
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveBackupKey(password, salt, PBKDF2_ITERATIONS);
    const plaintext = new TextEncoder().encode(JSON.stringify(buildBackup()));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    const file: EncryptedBackupFile = {
        app: ENCRYPTED_FORMAT,
        version: ENCRYPTION_VERSION,
        algorithm: 'AES-GCM',
        kdf: 'PBKDF2-SHA-256',
        iterations: PBKDF2_ITERATIONS,
        salt: toBase64(salt),
        iv: toBase64(iv),
        ciphertext: toBase64(new Uint8Array(encrypted)),
    };
    return JSON.stringify(file, null, 2);
}

/** Abre um backup criptografado. Senha incorreta ou arquivo adulterado falha sem alterar dados. */
export async function decryptBackup(text: string, password: string): Promise<string> {
    let file: Partial<EncryptedBackupFile>;
    try {
        file = JSON.parse(text) as Partial<EncryptedBackupFile>;
    } catch {
        throw new Error('O arquivo não é válido.');
    }
    if (
        file.app !== ENCRYPTED_FORMAT ||
        file.version !== ENCRYPTION_VERSION ||
        file.algorithm !== 'AES-GCM' ||
        file.kdf !== 'PBKDF2-SHA-256' ||
        !Number.isInteger(file.iterations) ||
        (file.iterations ?? 0) < 100_000 ||
        (file.iterations ?? 0) > 1_000_000 ||
        typeof file.salt !== 'string' ||
        typeof file.iv !== 'string' ||
        typeof file.ciphertext !== 'string'
    ) {
        throw new Error('Este arquivo não é um backup protegido reconhecido.');
    }
    if (!globalThis.crypto?.subtle) {
        throw new Error('Este navegador não oferece suporte à abertura deste backup.');
    }
    try {
        const salt = fromBase64(file.salt);
        const iv = fromBase64(file.iv);
        const ciphertext = fromBase64(file.ciphertext);
        if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 17) {
            throw new Error('invalid');
        }
        const iterations = file.iterations ?? 0;
        const key = await deriveBackupKey(password, salt, iterations);
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(ciphertext));
        return new TextDecoder().decode(plaintext);
    } catch {
        throw new Error('Não foi possível abrir o backup. Confira a senha e tente novamente.');
    }
}

/** Gera e baixa um backup criptografado; a senha não é armazenada no aplicativo. */
export async function downloadEncryptedBackup(password: string): Promise<void> {
    const json = await encryptBackup(password);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `remedio-na-hora-backup-protegido-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export function isEncryptedBackup(text: string): boolean {
    try {
        const value = JSON.parse(text) as { app?: string };
        return value?.app === ENCRYPTED_FORMAT;
    } catch {
        return false;
    }
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
    const data: Partial<Required<BackupData>> = {};
    const summary: BackupSummary = { reminders: 0, doctors: 0, appointments: 0, plans: 0, exams: 0, labs: 0, included: [] };

    for (const key of BACKUP_CATEGORIES) {
        const value = source[key];
        if (value === undefined) continue; // categoria ausente: mantém a atual
        if (!VALIDATORS[key](value)) {
            return { ok: false, error: `Conteúdo inválido na seção "${LABELS[key]}". A importação foi cancelada.` };
        }
        (data as Record<string, unknown>)[key] = value;
        summary[key] = (value as unknown[]).length;
        summary.included.push(key);
    }
    return { ok: true, data, summary };
}

/** Texto do diálogo de confirmação, ex.: "3 lembrete(s), 1 médico(s)...". */
export function describeSummary(summary: BackupSummary): string {
    return summary.included
        .map((key) => `${summary[key]} ${LABELS[key]}`)
        .join(', ');
}

/** Restaura as categorias presentes. No cofre, grava o envelope inteiro em uma operação;
 * sem cofre, mantém snapshots brutos e tenta restaurá-los se qualquer gravação falhar. */
export async function applyBackup(data: Partial<Required<BackupData>>): Promise<void> {
    const entries: Array<[BackupCategory, string, unknown]> = [
        ['reminders', STORAGE_KEYS.reminders, data.reminders],
        ['doctors', STORAGE_KEYS.doctors, data.doctors],
        ['appointments', STORAGE_KEYS.appointments, data.appointments],
        ['plans', STORAGE_KEYS.plans, data.plans],
        ['exams', STORAGE_KEYS.exams, data.exams],
        ['labs', STORAGE_KEYS.labs, data.labs],
    ].filter((entry): entry is [BackupCategory, string, unknown] => entry[2] !== undefined);

    if (entries.length === 0) return;

    if (isVaultUnlocked()) {
        const values = Object.fromEntries(entries.map(([, key, value]) => [key, value]));
        await replaceSecureJsonBatch(values);
        return;
    }

    const previous = new Map<string, string | null>();
    for (const [, key] of entries) previous.set(key, localStorage.getItem(key));

    try {
        for (const [, key, value] of entries) {
            if (!saveJson(key, value)) throw new Error('Não foi possível gravar todos os dados do backup.');
        }
    } catch (error) {
        let rollbackFailed = false;
        for (const [key, raw] of previous) {
            try {
                if (raw === null) localStorage.removeItem(key);
                else localStorage.setItem(key, raw);
            } catch {
                rollbackFailed = true;
            }
        }
        if (rollbackFailed) {
            throw new Error('A restauração falhou e não foi possível reverter todos os dados. Não feche o aplicativo; preserve este dispositivo para recuperação.');
        }
        throw error instanceof Error ? error : new Error('Não foi possível concluir a restauração. Os dados anteriores foram preservados.');
    }
}
