import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../storage';

const VAULT_DB = 'remedio-na-hora-secure-vault';
const VAULT_STORE = 'vault';
const VAULT_ID = 'primary';
const PBKDF2_ITERATIONS = 310_000;
const DATA_KEYS = [
    STORAGE_KEYS.reminders,
    STORAGE_KEYS.doctors,
    STORAGE_KEYS.appointments,
    STORAGE_KEYS.plans,
    STORAGE_KEYS.exams,
    STORAGE_KEYS.labs,
] as const;

interface VaultEnvelope {
    version: 1;
    kdf: 'PBKDF2-SHA-256';
    iterations: number;
    salt: string;
    iv: string;
    ciphertext: string;
}

type VaultData = Record<string, string>;
let activeKey: CryptoKey | null = null;
let activeData: VaultData | null = null;
let writeQueue: Promise<void> = Promise.resolve();

const toBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
};
const fromBase64 = (value: string): Uint8Array => {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(VAULT_DB, 1);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(VAULT_STORE)) {
                request.result.createObjectStore(VAULT_STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o armazenamento protegido.'));
    });
}

async function readEnvelope(): Promise<VaultEnvelope | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = db.transaction(VAULT_STORE, 'readonly').objectStore(VAULT_STORE).get(VAULT_ID);
        request.onsuccess = () => { db.close(); resolve((request.result as VaultEnvelope | undefined) ?? null); };
        request.onerror = () => { db.close(); reject(request.error); };
    });
}

async function writeEnvelope(envelope: VaultEnvelope): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(VAULT_STORE, 'readwrite');
        transaction.objectStore(VAULT_STORE).put(envelope, VAULT_ID);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error('Não foi possível salvar os dados protegidos.')); };
        transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error('A gravação dos dados protegidos foi cancelada.')); };
    });
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

async function makeEnvelope(data: VaultData, key: CryptoKey, salt: Uint8Array): Promise<VaultEnvelope> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(JSON.stringify(data)),
    );
    return {
        version: 1,
        kdf: 'PBKDF2-SHA-256',
        iterations: PBKDF2_ITERATIONS,
        salt: toBase64(salt),
        iv: toBase64(iv),
        ciphertext: toBase64(new Uint8Array(ciphertext)),
    };
}

function collectLegacyData(): VaultData {
    const data: VaultData = {};
    DATA_KEYS.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (raw !== null) data[key] = raw;
    });
    return data;
}

function removeLegacyData(): void {
    DATA_KEYS.forEach((key) => localStorage.removeItem(key));
}

export async function inspectSecureStorage(): Promise<{ configured: boolean; hasLegacyData: boolean }> {
    const envelope = await readEnvelope();
    return {
        configured: envelope !== null,
        hasLegacyData: DATA_KEYS.some((key) => localStorage.getItem(key) !== null),
    };
}

/** Configura a proteção e migra os registros antigos sem apagá-los antes da confirmação da gravação. */
export async function createSecureVault(password: string): Promise<void> {
    if (password.length < 10) throw new Error('Escolha uma senha com pelo menos 10 caracteres.');
    if (!crypto?.subtle || !('indexedDB' in window)) throw new Error('Este navegador não oferece suporte ao armazenamento protegido.');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(password, salt);
    const data = collectLegacyData();
    const envelope = await makeEnvelope(data, key, salt);
    await writeEnvelope(envelope);
    activeKey = key;
    activeData = data;
    // Só remove os dados antigos depois que a cópia criptografada foi confirmada no IndexedDB.
    removeLegacyData();
}

/** Desbloqueia os dados com a senha; falha sem alterar o conteúdo em caso de senha incorreta. */
export async function unlockSecureVault(password: string): Promise<void> {
    const envelope = await readEnvelope();
    if (!envelope) throw new Error('A proteção ainda não foi configurada neste dispositivo.');
    try {
        if (envelope.version !== 1 || envelope.kdf !== 'PBKDF2-SHA-256' || envelope.iterations !== PBKDF2_ITERATIONS) {
            throw new Error('Formato não reconhecido.');
        }
        const salt = fromBase64(envelope.salt);
        const iv = fromBase64(envelope.iv);
        const key = await deriveKey(password, salt);
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromBase64(envelope.ciphertext));
        const parsed: unknown = JSON.parse(new TextDecoder().decode(plaintext));
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Dados inválidos.');
        activeKey = key;
        activeData = parsed as VaultData;
        // Limpeza de eventual cópia antiga deixada por interrupção durante uma migração anterior.
        removeLegacyData();
    } catch {
        throw new Error('Senha incorreta ou dados protegidos inválidos. Tente novamente.');
    }
}

export function isVaultUnlocked(): boolean {
    return activeKey !== null && activeData !== null;
}

export function lockSecureVault(): void {
    activeKey = null;
    activeData = null;
}

export function loadSecureJson<T>(key: string, isValid: (value: unknown) => boolean): T | null {
    if (!activeData) return null;
    try {
        const raw = activeData[key];
        if (raw === undefined) return null;
        const parsed: unknown = JSON.parse(raw);
        return isValid(parsed) ? parsed as T : null;
    } catch {
        return null;
    }
}

/** Atualiza a cópia em memória e persiste o cofre inteiro criptografado no IndexedDB. */
export function saveSecureJson(key: string, value: unknown): boolean {
    if (!activeData || !activeKey) return false;
    activeData[key] = JSON.stringify(value);
    const snapshot = { ...activeData };
    const keySnapshot = activeKey;
    writeQueue = writeQueue
        .catch(() => undefined)
        .then(async () => {
            const envelope = await readEnvelope();
            if (!envelope) throw new Error('Cofre protegido não encontrado.');
            await writeEnvelope(await makeEnvelope(snapshot, keySnapshot, fromBase64(envelope.salt)));
        })
        .catch((error: unknown) => {
            console.error('Não foi possível persistir os dados protegidos.', error);
        });
    return true;
}

export async function flushSecureWrites(): Promise<void> {
    await writeQueue;
}

export function SecurityGate({ onUnlock }: { onUnlock: () => void }) {
    const [mode, setMode] = useState<'loading' | 'setup' | 'unlock'>('loading');
    const [hasLegacyData, setHasLegacyData] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        inspectSecureStorage().then((status) => {
            setHasLegacyData(status.hasLegacyData);
            setMode(status.configured ? 'unlock' : 'setup');
        }).catch(() => {
            setError('Não foi possível acessar o armazenamento seguro deste navegador.');
            setMode('setup');
        });
    }, []);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setBusy(true);
        try {
            if (mode === 'setup') {
                if (password !== confirmation) throw new Error('As senhas não coincidem.');
                await createSecureVault(password);
            } else {
                await unlockSecureVault(password);
            }
            onUnlock();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Não foi possível desbloquear os dados.');
        } finally {
            setBusy(false);
        }
    };

    if (mode === 'loading') {
        return <main className="min-h-screen grid place-items-center p-6 text-brand-gray-600">Verificando proteção dos dados…</main>;
    }

    return (
        <main className="min-h-screen bg-brand-gray-50 dark:bg-brand-gray-900 flex items-center justify-center p-5">
            <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white dark:bg-brand-gray-800 shadow-xl p-6 space-y-4">
                <div className="text-center">
                    <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-blue-50 dark:bg-brand-gray-700 text-2xl">🔒</div>
                    <h1 className="text-xl font-bold text-brand-gray-900 dark:text-white">Remédio na Hora</h1>
                    <h2 className="mt-2 text-lg font-semibold text-brand-gray-800 dark:text-white">
                        {mode === 'setup' ? 'Proteja seus dados' : 'Desbloquear aplicativo'}
                    </h2>
                    <p className="mt-2 text-sm text-brand-gray-600 dark:text-brand-gray-300">
                        {mode === 'setup'
                            ? 'Crie uma senha para criptografar seus medicamentos, horários, histórico, médicos, consultas, exames e dados do plano de saúde neste dispositivo.'
                            : 'Digite sua senha para acessar seus dados pessoais, armazenados criptografados neste dispositivo.'}
                    </p>
                </div>
                {mode === 'setup' && hasLegacyData && (
                    <p className="rounded-lg bg-blue-50 dark:bg-blue-950/40 p-3 text-sm text-blue-800 dark:text-blue-200">
                        Encontramos dados já cadastrados. Eles serão migrados para o armazenamento protegido antes de remover a cópia antiga.
                    </p>
                )}
                <label className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-200">
                    Senha
                    <input autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} type="password" minLength={10} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-brand-gray-300 dark:border-brand-gray-600 bg-white dark:bg-brand-gray-700 px-3 py-3" />
                </label>
                {mode === 'setup' && (
                    <label className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-200">
                        Confirme a senha
                        <input autoComplete="new-password" type="password" minLength={10} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full rounded-lg border border-brand-gray-300 dark:border-brand-gray-600 bg-white dark:bg-brand-gray-700 px-3 py-3" />
                    </label>
                )}
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                <button disabled={busy} type="submit" className="w-full rounded-lg bg-brand-blue px-4 py-3 font-semibold text-white disabled:opacity-60">
                    {busy ? 'Aguarde…' : mode === 'setup' ? 'Proteger e continuar' : 'Desbloquear'}
                </button>
                <p className="text-xs text-center text-brand-gray-500 dark:text-brand-gray-400">
                    A senha não é enviada nem armazenada. Se esquecê-la, os dados não poderão ser recuperados sem um backup protegido.
                </p>
            </form>
        </main>
    );
}
