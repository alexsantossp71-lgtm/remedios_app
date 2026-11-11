
import React from 'react';
import { LabResult } from '../types';
import { computeTrends, describeTrend } from '../utils/labResults';
import { formatDateBR, parseLocalDate } from '../utils/datetime';
import { FlaskIcon, TrashIcon, TrendingUpIcon, XIcon } from '../constants';

interface Props {
    labs: LabResult[];
    onDelete: (id: string) => void;
    onNew: () => void;
}

const flagBadgeClass: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    low: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    normal: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

const flagLabel: Record<string, string> = {
    high: 'Acima',
    low: 'Abaixo',
    normal: 'Na faixa',
};

/** Aba "Laudos": histórico de laudos com evolução dos exames repetidos. */
const LabResultsTab: React.FC<Props> = ({ labs, onDelete, onNew }) => {
    const [viewPhoto, setViewPhoto] = React.useState<LabResult | null>(null);
    const [expanded, setExpanded] = React.useState<string | null>(labs[0]?.id ?? null);

    if (labs.length === 0) {
        return (
            <div className="text-center py-10 text-brand-gray-500">
                <FlaskIcon className="w-12 h-12 mx-auto mb-2" />
                <p>Nenhum laudo registrado.</p>
                <p className="text-sm">Fotografe o laudo do laboratório e a IA extrai os valores para acompanhar a evolução.</p>
                <button
                    type="button"
                    onClick={onNew}
                    className="mt-4 px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-600"
                >
                    Registrar primeiro laudo
                </button>
            </div>
        );
    }

    const sorted = [...labs].sort((a, b) => (parseLocalDate(b.date)?.getTime() ?? 0) - (parseLocalDate(a.date)?.getTime() ?? 0));
    const trends = computeTrends(sorted);

    return (
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
            <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 border-l-4 border-brand-blue pl-3">
                Os valores, faixas e marcações ("na faixa"/"acima"/"abaixo") vêm da leitura por IA ou do seu preenchimento — servem para organizar
                o histórico e facilitar a conversa com o médico, não para autodiagnóstico. Confirme sempre com o laboratório ou médico.
            </p>

            {trends.length > 0 && (
                <section className="rounded-lg bg-brand-gray-100 dark:bg-brand-gray-700 p-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-gray-500 dark:text-brand-gray-400 mb-2 flex items-center gap-1.5">
                        <TrendingUpIcon className="w-4 h-4" />
                        Evolução dos exames repetidos
                    </h4>
                    <ul className="space-y-1.5 text-sm text-brand-gray-700 dark:text-brand-gray-200">
                        {trends.map((trend) => (
                            <li key={trend.examName} className="break-words">{describeTrend(trend)}</li>
                        ))}
                    </ul>
                    <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mt-2">
                        Variação simples entre o primeiro e o último resultado registrados. Interpretação clínica é papel do médico.
                    </p>
                </section>
            )}

            {sorted.map((lab) => {
                const isOpen = expanded === lab.id;
                return (
                    <div key={lab.id} className="relative rounded-lg border-l-4 border-brand-blue bg-brand-gray-100 dark:bg-brand-gray-700 p-4 shadow-sm">
                        <div className="flex items-start space-x-3">
                            {lab.photo ? (
                                <button
                                    type="button"
                                    onClick={() => setViewPhoto(lab)}
                                    className="flex-shrink-0 w-11 h-11 rounded-lg overflow-hidden border border-brand-gray-300 dark:border-brand-gray-600 hover:ring-2 hover:ring-brand-blue transition-shadow"
                                    aria-label={`Ver foto do laudo de ${formatDateBR(lab.date)}`}
                                    title="Ver foto do laudo"
                                >
                                    <img src={lab.photo} alt={`Foto do laudo de ${formatDateBR(lab.date)}`} className="w-full h-full object-cover" />
                                </button>
                            ) : (
                                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-brand-blue text-white flex items-center justify-center">
                                    <FlaskIcon className="w-6 h-6" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-brand-gray-900 dark:text-white break-words pr-12">
                                    Laudo de {formatDateBR(lab.date)}
                                </h4>
                                {lab.labName && (
                                    <p className="text-sm text-brand-gray-600 dark:text-brand-gray-300">{lab.labName}</p>
                                )}
                                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mt-0.5">
                                    {lab.values.length} valor(es) registrado(s)
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setExpanded(isOpen ? null : lab.id)}
                                    className="mt-1 text-xs font-semibold text-brand-blue hover:underline"
                                    aria-expanded={isOpen}
                                >
                                    {isOpen ? 'Ocultar valores' : 'Ver valores'}
                                </button>
                                {isOpen && (
                                    <div className="mt-2 space-y-1.5">
                                        {lab.values.map((value, index) => (
                                            <div key={index} className="flex items-center flex-wrap gap-1.5 text-sm">
                                                <span className="font-semibold text-brand-gray-800 dark:text-white">{value.examName}:</span>
                                                <span className="text-brand-gray-700 dark:text-brand-gray-200">
                                                    {value.valueText}{value.unit ? ` ${value.unit}` : ''}
                                                </span>
                                                {value.referenceText && (
                                                    <span className="text-xs text-brand-gray-500 dark:text-brand-gray-400">(ref.: {value.referenceText})</span>
                                                )}
                                                {value.flag && (
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${flagBadgeClass[value.flag]}`}>
                                                        {flagLabel[value.flag]}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                        {lab.notes && (
                                            <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 pt-1">Obs.: {lab.notes}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="absolute top-2 right-2">
                            <button
                                onClick={() => onDelete(lab.id)}
                                className="p-1 text-brand-gray-400 hover:text-brand-red dark:hover:text-brand-red transition-colors"
                                aria-label={`Deletar laudo de ${formatDateBR(lab.date)}`}
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                );
            })}

            {viewPhoto && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4"
                    onClick={() => setViewPhoto(null)}
                    role="dialog"
                    aria-label="Foto do laudo"
                >
                    <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-white text-sm font-semibold">
                                Laudo de {formatDateBR(viewPhoto.date)}{viewPhoto.labName ? ` — ${viewPhoto.labName}` : ''}
                            </p>
                            <button
                                onClick={() => setViewPhoto(null)}
                                className="flex items-center gap-1 text-white/80 hover:text-white text-sm font-bold"
                                aria-label="Fechar foto"
                            >
                                Fechar
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <img
                            src={viewPhoto.photo}
                            alt={`Foto do laudo de ${formatDateBR(viewPhoto.date)}`}
                            className="w-full max-h-[75vh] object-contain rounded-lg bg-white"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default LabResultsTab;
