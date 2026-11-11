
import React from 'react';
import { Exam } from '../types';
import { TrashIcon, PencilIcon, MapPinIcon, StethoscopeIcon, FileTextIcon, CalendarIcon, FlaskIcon } from '../constants';
import { formatDateBR, parseLocalDate } from '../utils/datetime';

interface Props {
    exams: Exam[];
    onEdit: (exam: Exam) => void;
    onDelete: (id: string) => void;
}

const statusMeta: Record<Exam['status'], { label: string; badge: string; border: string; icon: string }> = {
    requested: {
        label: 'Solicitado',
        badge: 'bg-brand-blue/10 text-brand-blue dark:text-blue-400',
        border: 'border-brand-blue',
        icon: 'bg-brand-blue',
    },
    scheduled: {
        label: 'Agendado',
        badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        border: 'border-amber-500',
        icon: 'bg-amber-500',
    },
    done: {
        label: 'Realizado',
        badge: 'bg-brand-green/10 text-green-700 dark:text-green-400',
        border: 'border-brand-green',
        icon: 'bg-brand-green',
    },
};

const datePrefix = (status: Exam['status']): string =>
    status === 'requested' ? 'Pedido em ' : status === 'scheduled' ? 'Agendado para ' : 'Realizado em ';

const ExamItem: React.FC<{ exam: Exam; onEdit: () => void; onDelete: () => void }> = ({ exam, onEdit, onDelete }) => {
    const meta = statusMeta[exam.status] ?? statusMeta.requested;
    const dateLabel = parseLocalDate(exam.date)
        ? `${datePrefix(exam.status)}${formatDateBR(exam.date)}`
        : formatDateBR(exam.date);

    return (
        <div className={`relative rounded-lg border-l-4 ${meta.border} bg-brand-gray-100 dark:bg-brand-gray-700 p-4 shadow-sm`}>
            <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-11 h-11 rounded-lg ${meta.icon} text-white flex items-center justify-center`}>
                    <FlaskIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg text-brand-gray-900 dark:text-white break-words pr-12">{exam.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>
                            {meta.label}
                        </span>
                        {exam.category && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-gray-200 dark:bg-brand-gray-600 text-brand-gray-600 dark:text-brand-gray-200">
                                {exam.category}
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-brand-gray-600 dark:text-brand-gray-300 mt-2 space-y-1">
                        <div className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span>{dateLabel}</span>
                        </div>
                        {exam.doctorName && (
                            <div className="flex items-start">
                                <StethoscopeIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="break-words">Solicitado por {exam.doctorName}</span>
                            </div>
                        )}
                        {exam.place && (
                            <div className="flex items-start">
                                <MapPinIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="break-words">{exam.place}</span>
                            </div>
                        )}
                        {exam.results && (
                            <div className="flex items-start">
                                <FileTextIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="break-words">{exam.results}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="absolute top-2 right-2 flex space-x-1">
                <button
                    onClick={onEdit}
                    className="p-1 text-brand-gray-400 hover:text-brand-blue dark:hover:text-brand-blue transition-colors"
                    aria-label={`Editar exame ${exam.name}`}
                >
                    <PencilIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-1 text-brand-gray-400 hover:text-brand-red dark:hover:text-brand-red transition-colors"
                    aria-label={`Deletar exame ${exam.name}`}
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const ExamsTab: React.FC<Props> = ({ exams, onEdit, onDelete }) => {
    if (exams.length === 0) {
        return (
            <div className="text-center py-10 text-brand-gray-500">
                <FlaskIcon className="w-12 h-12 mx-auto mb-2" />
                <p>Nenhum exame registrado.</p>
                <p className="text-sm">Registre o pedido do médico (ou tire uma foto dele) para acompanhar do pedido ao laudo.</p>
            </div>
        );
    }

    const parse = (exam: Exam): number => parseLocalDate(exam.date)?.getTime() ?? 0;
    const pending = exams
        .filter(e => e.status !== 'done')
        .sort((a, b) => parse(a) - parse(b));
    const done = exams
        .filter(e => e.status === 'done')
        .sort((a, b) => parse(b) - parse(a));

    return (
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
            {pending.length > 0 && (
                <>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-gray-500 dark:text-brand-gray-400">Pendentes</h4>
                    {pending.map(exam => (
                        <ExamItem key={exam.id} exam={exam} onEdit={() => onEdit(exam)} onDelete={() => onDelete(exam.id)} />
                    ))}
                </>
            )}
            {done.length > 0 && (
                <>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-gray-500 dark:text-brand-gray-400 pt-2">Realizados</h4>
                    {done.map(exam => (
                        <div key={exam.id} className="opacity-75">
                            <ExamItem key={exam.id} exam={exam} onEdit={() => onEdit(exam)} onDelete={() => onDelete(exam.id)} />
                        </div>
                    ))}
                </>
            )}
        </div>
    );
};

export default ExamsTab;
