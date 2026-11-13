import React, { useEffect, useState } from 'react';
import { createSecureVault, inspectSecureStorage, unlockSecureVault } from '../services/secureStorage';

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
