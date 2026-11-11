
import React from 'react';
import { Reminder } from '../types';
import { computeAdherence } from '../utils/adherence';
import { ChartIcon } from '../constants';

interface Props {
    reminders: Reminder[];
}

const AdherenceBar: React.FC<{ label: string; pct: number | null; taken: number; expected: number }> = ({
    label,
    pct,
    taken,
    expected,
}) => (
    <div>
        <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-semibold text-brand-gray-500 dark:text-brand-gray-400">{label}</span>
            <span className="text-sm font-bold text-brand-gray-800 dark:text-white">
                {pct === null ? '—' : `${pct}%`}
                <span className="ml-1.5 text-xs font-medium text-brand-gray-500 dark:text-brand-gray-400">
                    ({taken} de {expected} doses)
                </span>
            </span>
        </div>
        <div className="h-2.5 rounded-full bg-brand-gray-200 dark:bg-brand-gray-600 overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
            <div
                className={`h-full rounded-full transition-all ${
                    pct === null ? 'bg-transparent' : pct >= 80 ? 'bg-brand-green' : pct >= 50 ? 'bg-amber-500' : 'bg-brand-red'
                }`}
                style={{ width: `${pct ?? 0}%` }}
            />
        </div>
    </div>
);

/** Relatório de adesão: % de doses tomadas nos últimos 7 e 30 dias. */
const AdherenceCard: React.FC<Props> = ({ reminders }) => {
    const week = computeAdherence(reminders, 7);
    const month = computeAdherence(reminders, 30);

    if (week.expected === 0 && month.expected === 0) return null;

    return (
        <div className="mt-4 border-t border-brand-gray-200 dark:border-brand-gray-600 pt-4 space-y-3">
            <div className="flex items-center gap-2">
                <ChartIcon className="w-4 h-4 text-brand-blue" />
                <h3 className="text-sm font-semibold text-brand-gray-700 dark:text-brand-gray-300">Adesão às doses</h3>
            </div>
            <AdherenceBar label="Últimos 7 dias" pct={week.pct} taken={week.taken} expected={week.expected} />
            <AdherenceBar label="Últimos 30 dias" pct={month.pct} taken={month.taken} expected={month.expected} />
            {month.skipped > 0 && (
                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400">
                    No período, {month.skipped} dose(s) foi(ram) marcada(s) como pulada(s) por você.
                </p>
            )}
        </div>
    );
};

export default AdherenceCard;
