
import React, { useEffect } from 'react';
import { XIcon } from '../constants';

// ===== Classes compartilhadas pelos formulários de cadastro =====

export const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200';
export const helperClass = 'mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400';

export const inputClass = (hasError = false): string =>
    `block w-full rounded-xl border bg-slate-50 px-3.5 py-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-950 sm:text-sm ${
        hasError
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-500 dark:focus:ring-rose-950/50'
            : 'border-slate-200 focus:border-teal-600 focus:ring-teal-100 dark:border-slate-700 dark:focus:border-teal-500 dark:focus:ring-teal-950/50'
    }`;

export const cancelBtnClass =
    'inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';

export const saveBtnClass =
    'inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500 dark:focus:ring-teal-950/60';

// ===== Máscaras =====
// Implementação em utils/masks.ts (funções puras testadas); reexportada
// aqui para os formulários continuarem importando de um lugar só.

export { maskPhone, phoneDigits, maskCardNumber } from '../utils/masks';

// ===== Componentes =====

/** Mensagem de erro inline de um campo. */
export const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
    message ? (
        <p id={id} className="mt-1 text-xs font-medium text-brand-red" role="alert">
            {message}
        </p>
    ) : null;

/** Título de seção dentro do formulário, para agrupar campos relacionados. */
export const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-700/80 dark:bg-slate-900/40 sm:p-5">
        <h4 className="mb-4 text-xs font-extrabold uppercase tracking-[0.12em] text-teal-800 dark:text-teal-300">
            {title}
        </h4>
        <div className="space-y-4">{children}</div>
    </section>
);

/** Fecha o modal quando o usuário pressiona Esc. */
export function useEscapeToClose(onClose: () => void): void {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
}

interface ShellProps {
    title: string;
    onClose: () => void;
    onSubmit: () => void;
    /** Texto do botão principal (padrão "Salvar"). */
    submitLabel?: string;
    children: React.ReactNode;
}

/**
 * Estrutura visual comum dos modais de cadastro: overlay, cartão, título,
 * <form> (Enter envia) e rodapé com Cancelar / Salvar.
 */
export const FormModalShell: React.FC<ShellProps> = ({ title, onClose, onSubmit, submitLabel = 'Salvar', children }) => {
    useEscapeToClose(onClose);
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
            <div
                className="relative max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/70 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:max-h-[90dvh] sm:rounded-3xl sm:p-7"
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-700">
                    <div className="min-w-0">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">Remédios na Hora</p>
                        <h3 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        aria-label="Fechar"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                    noValidate
                >
                    <div className="space-y-4">{children}</div>
                    <div className="sticky bottom-0 mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 pt-4 backdrop-blur sm:flex-row sm:justify-end dark:border-slate-700 dark:bg-slate-900/95">
                        <button type="button" onClick={onClose} className={cancelBtnClass}>
                            Cancelar
                        </button>
                        <button type="submit" className={saveBtnClass}>
                            {submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
