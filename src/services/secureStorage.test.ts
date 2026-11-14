import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { STORAGE_KEYS } from '../storage';

const VAULT_DB = 'remedio-na-hora-secure-vault';
const VAULT_STORE = 'vault';
const VAULT_ID = 'primary';

type SecureStorageModule = typeof import('./secureStorage');

let store: Map<string, string>;
let storage: SecureStorageModule;
let factory: IDBFactory;

async function readStoredEnvelope(): Promise<Record<string, unknown> | null> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(VAULT_DB, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const get = db.transaction(VAULT_STORE, 'readonly').objectStore(VAULT_STORE).get(VAULT_ID);
            get.onsuccess = () => {
                db.close();
                resolve((get.result as Record<string, unknown> | undefined) ?? null);
            };
            get.onerror = () => {
                db.close();
                reject(get.error);
            };
        };
    });
}

async function replaceStoredEnvelope(envelope: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(VAULT_DB, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(VAULT_STORE, 'readwrite');
            transaction.objectStore(VAULT_STORE).put(envelope, VAULT_ID);
            transaction.oncomplete = () => {
                db.close();
                resolve();
            };
            transaction.onerror = () => {
                db.close();
                reject(transaction.error);
            };
        };
    });
}

beforeEach(async () => {
    vi.resetModules();
    store = new Map();
    factory = new IDBFactory();
    vi.stubGlobal('indexedDB', factory);
    vi.stubGlobal('window', { indexedDB: factory });
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
        removeItem: (key: string) => { store.delete(key); },
        clear: () => store.clear(),
    });
    storage = await import('./secureStorage');
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('cofre criptográfico — AUD-002', () => {
    it('exige senha com pelo menos 10 caracteres', async () => {
        await expect(storage.createSecureVault('curta')).rejects.toThrow('pelo menos 10 caracteres');
        expect(await storage.inspectSecureStorage()).toEqual({ configured: false, hasLegacyData: false });
    });

    it('migra os dados legados somente depois de gravar o envelope criptografado', async () => {
        const legacy = JSON.stringify([{ id: 'rem-1', medicationName: 'Medicamento confidencial' }]);
        localStorage.setItem(STORAGE_KEYS.reminders, legacy);

        await storage.createSecureVault('senha-segura-123');

        expect(localStorage.getItem(STORAGE_KEYS.reminders)).toBeNull();
        expect(await storage.inspectSecureStorage()).toEqual({ configured: true, hasLegacyData: false });
        const envelope = await readStoredEnvelope();
        expect(envelope).not.toBeNull();
        expect(JSON.stringify(envelope)).not.toContain('Medicamento confidencial');

        storage.lockSecureVault();
        await storage.unlockSecureVault('senha-segura-123');
        expect(storage.loadSecureJson(STORAGE_KEYS.reminders, Array.isArray)).toEqual([
            { id: 'rem-1', medicationName: 'Medicamento confidencial' },
        ]);
    });

    it('não apaga dados legados quando a gravação inicial no IndexedDB falha', async () => {
        const legacy = JSON.stringify([{ id: 'rem-2' }]);
        localStorage.setItem(STORAGE_KEYS.reminders, legacy);
        vi.spyOn(factory, 'open').mockImplementation(() => {
            throw new DOMException('IndexedDB indisponível', 'UnknownError');
        });

        await expect(storage.createSecureVault('senha-segura-123')).rejects.toThrow();
        expect(localStorage.getItem(STORAGE_KEYS.reminders)).toBe(legacy);
    });

    it('recusa senha incorreta e mantém o cofre bloqueado', async () => {
        await storage.createSecureVault('senha-segura-123');
        storage.lockSecureVault();

        await expect(storage.unlockSecureVault('senha-errada-123')).rejects.toThrow(
            'Senha incorreta ou dados protegidos inválidos',
        );
        expect(storage.isVaultUnlocked()).toBe(false);
    });

    it('detecta adulteração do ciphertext autenticado pelo AES-GCM', async () => {
        await storage.createSecureVault('senha-segura-123');
        storage.lockSecureVault();
        const envelope = await readStoredEnvelope();
        expect(envelope).not.toBeNull();
        const ciphertext = String(envelope?.ciphertext ?? '');
        const last = ciphertext.at(-1) === 'A' ? 'B' : 'A';
        await replaceStoredEnvelope({ ...envelope, ciphertext: ciphertext.slice(0, -1) + last });

        await expect(storage.unlockSecureVault('senha-segura-123')).rejects.toThrow(
            'Senha incorreta ou dados protegidos inválidos',
        );
        expect(storage.isVaultUnlocked()).toBe(false);
    });

    it('rejeita versões e parâmetros KDF desconhecidos sem desbloquear', async () => {
        await storage.createSecureVault('senha-segura-123');
        storage.lockSecureVault();
        const envelope = await readStoredEnvelope();
        expect(envelope).not.toBeNull();
        await replaceStoredEnvelope({ ...envelope, iterations: 1 });

        await expect(storage.unlockSecureVault('senha-segura-123')).rejects.toThrow(
            'Senha incorreta ou dados protegidos inválidos',
        );
        expect(storage.isVaultUnlocked()).toBe(false);
    });

    it('serializa gravações e recupera o último valor após bloquear e desbloquear', async () => {
        await storage.createSecureVault('senha-segura-123');
        expect(storage.saveSecureJson(STORAGE_KEYS.reminders, [{ id: 'primeiro' }])).toBe(true);
        expect(storage.saveSecureJson(STORAGE_KEYS.reminders, [{ id: 'último' }])).toBe(true);
        await storage.flushSecureWrites();

        storage.lockSecureVault();
        await storage.unlockSecureVault('senha-segura-123');
        expect(storage.loadSecureJson(STORAGE_KEYS.reminders, Array.isArray)).toEqual([{ id: 'último' }]);
    });

    it('informa falha de persistência ao confirmar a fila de gravação', async () => {
        await storage.createSecureVault('senha-segura-123');
        vi.spyOn(factory, 'open').mockImplementation(() => {
            throw new DOMException('IndexedDB indisponível', 'UnknownError');
        });

        expect(storage.saveSecureJson(STORAGE_KEYS.reminders, [{ id: 'não confirmado' }])).toBe(true);
        await expect(storage.flushSecureWrites()).rejects.toThrow('Não foi possível confirmar a gravação');
    });

    it('desativa a proteção somente depois de restaurar os registros no localStorage', async () => {
        const legacy = [{ id: 'rem-3', medicationName: 'Tratamento' }];
        await storage.createSecureVault('senha-segura-123');
        storage.saveSecureJson(STORAGE_KEYS.reminders, legacy);
        await storage.flushSecureWrites();

        await storage.disableSecureVault();

        expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.reminders) ?? 'null')).toEqual(legacy);
        expect(storage.isVaultUnlocked()).toBe(false);
        expect(await storage.inspectSecureStorage()).toEqual({ configured: false, hasLegacyData: true });
    });
    it('não substitui um cofre existente ao tentar configurá-lo novamente', async () => {
        const original = [{ id: 'preservado' }];
        await storage.createSecureVault('senha-original-123');
        storage.saveSecureJson(STORAGE_KEYS.reminders, original);
        await storage.flushSecureWrites();
        storage.lockSecureVault();

        await expect(storage.createSecureVault('outra-senha-123')).rejects.toThrow('Já existe um cofre protegido');
        await storage.unlockSecureVault('senha-original-123');
        expect(storage.loadSecureJson(STORAGE_KEYS.reminders, Array.isArray)).toEqual(original);
    });

    it('mantém o cofre bloqueado se a limpeza de dados legados falhar durante o desbloqueio', async () => {
        await storage.createSecureVault('senha-segura-123');
        storage.lockSecureVault();
        localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify([{ id: 'legado' }]));
        vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
            throw new DOMException('Acesso negado', 'SecurityError');
        });

        await expect(storage.unlockSecureVault('senha-segura-123')).rejects.toThrow('O cofre permanece bloqueado');
        expect(storage.isVaultUnlocked()).toBe(false);
        expect(localStorage.getItem(STORAGE_KEYS.reminders)).not.toBeNull();
    });

    it('permite recuperar o cofre após uma falha temporária na limpeza de dados legados', async () => {
        await storage.createSecureVault('senha-segura-123');
        storage.lockSecureVault();
        localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify([{ id: 'recuperado' }]));
        const removeSpy = vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
            throw new DOMException('Acesso negado', 'SecurityError');
        });
        await expect(storage.unlockSecureVault('senha-segura-123')).rejects.toThrow('O cofre permanece bloqueado');
        removeSpy.mockRestore();

        await storage.unlockSecureVault('senha-segura-123');
        expect(storage.isVaultUnlocked()).toBe(true);
        expect(localStorage.getItem(STORAGE_KEYS.reminders)).toBeNull();
    });

    it('rejeita envelope com estrutura de dados inválida', async () => {
        await storage.createSecureVault('senha-segura-123');
        storage.lockSecureVault();
        const envelope = await readStoredEnvelope();
        expect(envelope).not.toBeNull();
        const salt = Uint8Array.from(atob(String(envelope?.salt)), (char) => char.charCodeAt(0));
        const iv = Uint8Array.from(atob(String(envelope?.iv)), (char) => char.charCodeAt(0));
        const material = await crypto.subtle.importKey('raw', new TextEncoder().encode('senha-segura-123'), 'PBKDF2', false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' },
            material,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt'],
        );
        const invalidCiphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            new TextEncoder().encode(JSON.stringify({ unexpectedKey: 'value' })),
        );
        const bytes = new Uint8Array(invalidCiphertext);
        const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
        await replaceStoredEnvelope({ ...envelope, ciphertext: btoa(binary) });

        await expect(storage.unlockSecureVault('senha-segura-123')).rejects.toThrow('dados protegidos inválidos');
        expect(storage.isVaultUnlocked()).toBe(false);
    });

});
