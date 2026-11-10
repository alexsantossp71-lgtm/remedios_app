
import React, { useState } from 'react';
import { HealthPlan } from '../types';
import { formatDateBR, parseLocalDate } from '../utils/datetime';
import { CopyIcon, IdCardIcon, PhoneIcon, PencilIcon, ShieldIcon, TrashIcon } from '../constants';

interface Props {
    plans: HealthPlan[];
    onEdit: (plan: HealthPlan) => void;
    onDelete: (id: string) => void;
}

/** Copia texto para a área de transferência, com fallback para contextos sem clipboard API. */
const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const area = document.createElement('textarea');
            area.value = text;
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(area);
            return ok;
        } catch {
            return false;
        }
    }
};

type ValidityState = { label: string; className: string } | null;

/** Selo de validade: válida (verde), vence em breve (âmbar) ou vencida (vermelha). */
const validityState = (validity: string): ValidityState => {
    if (!validity) return null;
    const date = parseLocalDate(validity);
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
    if (diffDays < 0) {
        return { label: `Vencida em ${formatDateBR(validity)}`, className: 'bg-brand-red/10 text-brand-red dark:text-red-400' };
    }
    if (diffDays <= 60) {
        const quando = diffDays === 0 ? 'hoje' : `em ${diffDays} dia${diffDays === 1 ? '' : 's'}`;
        return { label: `Vence ${quando}`, className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' };
    }
    return { label: `Válida até ${formatDateBR(validity)}`, className: 'bg-brand-green/10 text-green-700 dark:text-green-400' };
};

const PlanCard: React.FC<{ plan: HealthPlan; onEdit: () => void; onDelete: () => void }> = ({ plan, onEdit, onDelete }) => {
    const [copied, setCopied] = useState(false);
    const badge = validityState(plan.validity);

    const handleCopy = async () => {
        const ok = await copyToClipboard(plan.cardNumber);
        if (ok) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        }
    };

    return (
        <div className="relative rounded-lg border-l-4 border-brand-blue bg-brand-gray-100 dark:bg-brand-gray-700 p-4 shadow-sm">
            <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-brand-blue text-white flex items-center justify-center">
                    <IdCardIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg text-brand-gray-900 dark:text-white break-words pr-12">{plan.operator}</h4>
                    <p className="text-sm text-brand-gray-600 dark:text-brand-gray-300 break-words">
                        {plan.planName}
                        {plan.holder && <span className="text-brand-gray-400 dark:text-brand-gray-400"> · Titular: {plan.holder}</span>}
                    </p>
                </div>
            </div>

            {plan.cardNumber && (
                <div className="mt-3 flex items-center justify-between gap-2 bg-white dark:bg-brand-gray-800 rounded-md px-3 py-2">
                    <span className="font-mono tracking-wider text-brand-gray-800 dark:text-brand-gray-100 text-sm truncate">
                        {plan.cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')}
                    </span>
                    <button
                        onClick={handleCopy}
                        className={`flex items-center text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
                            copied
                                ? 'text-green-700 dark:text-green-400'
                                : 'text-brand-blue hover:bg-brand-blue/10'
                        }`}
                        aria-label="Copiar número da carteirinha"
                    >
                        <CopyIcon className="w-4 h-4 mr-1" />
                        {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
                {badge && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge.className}`} title={plan.validity}>
                        {badge.label}
                    </span>
                )}
                {plan.phone && (
                    <a
                        href={`tel:${plan.phone}`}
                        className="flex items-center bg-brand-blue text-white text-sm font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
                        aria-label={`Ligar para a operadora ${plan.operator}`}
                    >
                        <PhoneIcon className="w-4 h-4 mr-1.5" />
                        Ligar / SAC
                    </a>
                )}
            </div>

            {plan.coverage && (
                <p className="mt-3 text-sm text-brand-gray-600 dark:text-brand-gray-300 break-words whitespace-pre-line">
                    <span className="font-semibold">Cobertura: </span>
                    {plan.coverage}
                </p>
            )}

            <div className="absolute top-2 right-2 flex space-x-1">
                <button
                    onClick={onEdit}
                    className="p-1 text-brand-gray-400 hover:text-brand-blue dark:hover:text-brand-blue transition-colors"
                    aria-label={`Editar plano ${plan.operator}`}
                >
                    <PencilIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-1 text-brand-gray-400 hover:text-brand-red dark:hover:text-brand-red transition-colors"
                    aria-label={`Deletar plano ${plan.operator}`}
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const HealthPlansTab: React.FC<Props> = ({ plans, onEdit, onDelete }) => {
    if (plans.length === 0) {
        return (
            <div className="text-center py-10 text-brand-gray-500">
                <ShieldIcon className="w-12 h-12 mx-auto mb-2" />
                <p>Nenhum plano de saúde cadastrado.</p>
                <p className="text-sm">Cadastre sua carteirinha (ou o cartão do SUS) para ter os dados sempre à mão.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map(plan => (
                <PlanCard key={plan.id} plan={plan} onEdit={() => onEdit(plan)} onDelete={() => onDelete(plan.id)} />
            ))}
        </div>
    );
};

export default HealthPlansTab;
