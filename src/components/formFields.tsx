
import React, { useEffect } from 'react';
import { XIcon } from '../constants';

// ===== Classes compartilhadas pelos formulários de cadastro =====

export const labelClass = 'block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300';
export const helperClass = 'text-xs text-brand-gray-500 dark:text-brand-gray-400 mt-1';

export const inputClass = (hasError = false): string =>
    `mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
        hasError
            ? 'border-brand-red dark:border-brand-red focus:border-brand-red focus:ring-brand-red dark:bg-brand-gray-700 text-brand-red dark:text-brand-red'
            : 'border-brand-gray-300 focus:border-brand-blue focus:ring-brand-blue dark:bg-brand-gray-700 dark:border-brand-gray-600'
    }`;

export const cancelBtnClass =
    'px-4 py-2 bg-brand-gray-200 dark:bg-brand-gray-600 rounded-md hover:bg-brand-gray-300 dark:hover:bg-brand-gray-500 transition-colors';

export const saveBtnClass =
    'px-4 py-2 bg-brand-green text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

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
    <section>
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-gray-400 dark:text-brand-gray-500 mb-2">
            {title}
        </h4>
        <div className="space-y-3">{children}</div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-brand-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 relative max-h-[92vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-brand-gray-400 hover:text-brand-gray-600 dark:hover:text-brand-gray-200"
                    aria-label="Fechar"
                >
                    <XIcon className="w-6 h-6" />
                </button>
                <h3 className="text-lg font-medium leading-6 text-brand-gray-900 dark:text-white mb-4">{title}</h3>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                    noValidate
                >
                    <div className="space-y-4">{children}</div>
                    <div className="mt-6 flex justify-end space-x-2">
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
