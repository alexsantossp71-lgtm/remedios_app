import { STORAGE_KEYS, loadJson, saveJson } from '../storage';

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
    STORAGE_KEYS.guides,
    STORAGE_KEYS.adherenceInsights,
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
let lastWriteError: unknown = null;

const toBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
};
const fromBase64 = (value: string): Uint8Array => {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};
const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
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

/** Cria o primeiro envelope sem substituir um cofre já configurado. */
async function createEnvelope(envelope: VaultEnvelope): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(VAULT_STORE, 'readwrite');
        transaction.objectStore(VAULT_STORE).add(envelope, VAULT_ID);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => {
            const error = transaction.error;
            db.close();
            reject(error?.name === 'ConstraintError'
                ? new Error('Já existe um cofre protegido neste dispositivo. Desbloqueie-o antes de qualquer alteração.')
                : error ?? new Error('Não foi possível criar o armazenamento protegido.'));
        };
        transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error('A criação do cofre foi cancelada.')); };
    });
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
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
    // add() é atômico e recusa substituir um cofre que já exista.
    await createEnvelope(envelope);
    // A cópia criptografada já está confirmada; se a limpeza falhar, o cofre fica bloqueado
    // e os dados protegidos podem ser recuperados em uma nova tentativa de desbloqueio.
    removeLegacyData();
    activeKey = key;
    activeData = data;
}

/** Desbloqueia os dados com a senha; falha sem alterar o conteúdo em caso de senha incorreta. */
export async function unlockSecureVault(password: string): Promise<void> {
    // Uma tentativa de desbloqueio sempre começa em estado fechado.
    activeKey = null;
    activeData = null;
    const envelope = await readEnvelope();
    if (!envelope) throw new Error('A proteção ainda não foi configurada neste dispositivo.');

    let key: CryptoKey;
    let data: VaultData;
    try {
        if (envelope.version !== 1 || envelope.kdf !== 'PBKDF2-SHA-256' || envelope.iterations !== PBKDF2_ITERATIONS) {
            throw new Error('Formato não reconhecido.');
        }
        const salt = fromBase64(envelope.salt);
        const iv = fromBase64(envelope.iv);
        if (salt.length !== 16 || iv.length !== 12) throw new Error('Parâmetros criptográficos inválidos.');
        key = await deriveKey(password, salt);
        const ciphertext = fromBase64(envelope.ciphertext);
        if (ciphertext.length < 16) throw new Error('Conteúdo criptografado inválido.');
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(ciphertext));
        const parsed: unknown = JSON.parse(new TextDecoder().decode(plaintext));
        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            Array.isArray(parsed) ||
            !Object.entries(parsed).every(([name, value]) => DATA_KEYS.includes(name as typeof DATA_KEYS[number]) && typeof value === 'string')
        ) {
            throw new Error('Dados inválidos.');
        }
        data = parsed as VaultData;
    } catch {
        throw new Error('Senha incorreta ou dados protegidos inválidos. Tente novamente.');
    }

    // Não liberar o cofre antes de concluir a limpeza de eventual cópia legada.
    // Se o navegador negar a remoção, a próxima tentativa pode repetir a operação com segurança.
    try {
        removeLegacyData();
    } catch {
        throw new Error('Os dados estão protegidos, mas não foi possível concluir a limpeza dos dados antigos. O cofre permanece bloqueado; tente novamente.');
    }
    activeKey = key;
    activeData = data;
}

/** Desativa a senha, preservando os registros no armazenamento local sem criptografia. */
export async function disableSecureVault(): Promise<void> {
    if (!activeData) throw new Error('Desbloqueie o aplicativo antes de desativar a proteção.');
    await flushSecureWrites();
    for (const key of DATA_KEYS) {
        const raw = activeData[key];
        if (raw !== undefined && !saveJson(key, JSON.parse(raw))) {
            throw new Error('Não foi possível salvar todos os dados sem criptografia. A proteção foi mantida.');
        }
    }
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(VAULT_STORE, 'readwrite');
        transaction.objectStore(VAULT_STORE).delete(VAULT_ID);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error('Não foi possível desativar a proteção.')); };
        transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error('A operação foi cancelada.')); };
    });
    activeKey = null;
    activeData = null;
}

export function isVaultUnlocked(): boolean {
    return activeKey !== null && activeData !== null;
}

export function lockSecureVault(): void {
    activeKey = null;
    activeData = null;
}

export function loadSecureJson<T>(key: string, isValid: (value: unknown) => boolean): T | null {
    if (!activeData) return loadJson<T>(key, isValid);
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
    if (!activeData || !activeKey) return saveJson(key, value);
    activeData[key] = JSON.stringify(value);
    const snapshot = { ...activeData };
    const keySnapshot = activeKey;
    writeQueue = writeQueue
        .catch(() => undefined)
        .then(async () => {
            const envelope = await readEnvelope();
            if (!envelope) throw new Error('Cofre protegido não encontrado.');
            await writeEnvelope(await makeEnvelope(snapshot, keySnapshot, fromBase64(envelope.salt)));
            lastWriteError = null;
        })
        .catch((error: unknown) => {
            lastWriteError = error;
            console.error('Não foi possível persistir os dados protegidos.', error);
        });
    return true;
}

export async function flushSecureWrites(): Promise<void> {
    await writeQueue;
    if (lastWriteError) throw new Error('Não foi possível confirmar a gravação dos últimos dados. Mantenha o aplicativo aberto e tente novamente.');
}

