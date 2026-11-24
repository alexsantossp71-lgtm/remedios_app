
import React, { useState } from 'react';
import { PillIcon } from '../constants';

// Cadastro do usuário no primeiro uso: só o essencial (nome para as saudações
// e idade opcional). Fica salvo somente neste aparelho, junto dos demais dados.

export interface UserProfile {
    /** Nome de chamada (ex.: primeiro nome). */
    name: string;
    /** Idade informada; null quando a pessoa prefere não dizer. */
    age: number | null;
    createdAtMs: number;
}

interface Props {
    onDone: (profile: UserProfile) => void;
    onBack: () => void;
}

const RegisterScreen: React.FC<Props> = ({ onDone, onBack }) => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [error, setError] = useState<string | null>(null);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const clean = name.trim().slice(0, 40);
        if (clean.length < 2) {
            setError('Diga como podemos chamar você (mínimo de 2 letras).');
            return;
        }
        let ageValue: number | null = null;
        if (age.trim()) {
            const parsed = Number.parseInt(age.trim(), 10);
            if (!Number.isFinite(parsed) || parsed < 0 || parsed > 120) {
                setError('Informe uma idade entre 0 e 120 anos, ou deixe em branco.');
                return;
            }
            ageValue = parsed;
        }
        setError(null);
        onDone({ name: clean, age: ageValue, createdAtMs: Date.now() });
    };

    return (
        <div className="flex min-h-dvh flex-col bg-gradient-to-b from-teal-800 via-teal-700 to-teal-600 px-4 pb-6 pt-10 text-white">
            <form onSubmit={submit} className="mx-auto flex w-full max-w-md flex-1 flex-col">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                        <PillIcon className="h-6 w-6 text-white" />
                    </span>
                    <div>
                        <h1 className="text-xl font-extrabold leading-tight">Quase lá</h1>
                        <p className="text-xs text-teal-100">Falta só o seu nome para começar</p>
                    </div>
                </div>

                <div className="mt-10 rounded-3xl bg-white p-5 text-brand-gray-700 shadow-2xl dark:bg-brand-gray-500 dark:text-white">
                    <label htmlFor="register-name" className="text-sm font-bold">
                        Como podemos chamar você?
                    </label>
                    <input
                        id="register-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Ex.: Maria"
                        maxLength={40}
                        autoComplete="given-name"
                        className="mt-2 w-full rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-base font-semibold outline-none transition focus:border-teal-600 focus:bg-white dark:border-brand-gray-400 dark:bg-brand-gray-400/40"
                    />

                    <label htmlFor="register-age" className="mt-4 block text-sm font-bold">
                        Idade <span className="font-normal text-brand-gray-400">(opcional)</span>
                    </label>
                    <input
                        id="register-age"
                        value={age}
                        onChange={(event) => setAge(event.target.value.replace(/\D/g, '').slice(0, 3))}
                        inputMode="numeric"
                        placeholder="Ex.: 67"
                        className="mt-2 w-full rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-base font-semibold outline-none transition focus:border-teal-600 focus:bg-white dark:border-brand-gray-400 dark:bg-brand-gray-400/40"
                    />

                    {error && <p className="mt-3 text-sm font-semibold text-brand-red" role="alert">{error}</p>}

                    <p className="mt-4 text-xs leading-5 text-brand-gray-400">
                        Seu nome e idade ficam somente neste aparelho, nunca vão para a internet.
                    </p>

                    <button
                        type="submit"
                        className="mt-5 w-full rounded-2xl bg-teal-800 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:bg-teal-700"
                    >
                        Começar a usar
                    </button>
                    <button
                        type="button"
                        onClick={onBack}
                        className="mt-2 w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-brand-gray-400 transition hover:text-brand-gray-600"
                    >
                        Voltar
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegisterScreen;
