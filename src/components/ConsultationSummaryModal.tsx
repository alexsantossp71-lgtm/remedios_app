
import React, { useEffect, useMemo, useState } from 'react';
import { AiError, suggestConsultationQuestions } from '../services/nvidiaService';
import { hasAiAccess, useAiSettings } from '../services/settings';
import { Appointment, Exam, Reminder } from '../types';
import { computeAdherence } from '../utils/adherence';
import { buildAdherenceReport, describeWindow } from '../utils/adherenceInsights';
import {
    buildConsultationSummary,
    DEFAULT_QUESTIONS,
    describeReminderLine,
    describeDifficulties,
} from '../utils/consultationSummary';
import { CopyIcon, FileTextIcon, PrinterIcon, XIcon } from '../constants';
import { useEscapeToClose } from './formFields';

interface Props {
    reminders: Reminder[];
    exams: Exam[];
    appointments: Appointment[];
    onClose: () => void;
}

/**
 * Resumo para levar à consulta: o documento é montado localmente
 * (funciona mesmo sem IA); a IA sugere apenas as perguntas personalizadas.
 * Texto editável, com botões Copiar e Imprimir.
 */
const ConsultationSummaryModal: React.FC<Props> = ({ reminders, exams, appointments, onClose }) => {
    const aiSettings = useAiSettings();
    const hasApiKey = hasAiAccess(aiSettings);

    useEscapeToClose(onClose);
    const [copied, setCopied] = useState(false);

    // Dados locais calculados uma vez por abertura (estáveis por mount).
    const baseData = useMemo(() => {
        const now = new Date();
        const week = computeAdherence(reminders, 7, now);
        const month = computeAdherence(reminders, 30, now);
        const report = buildAdherenceReport(reminders, now);
        return { now, week, month, report };
    }, [reminders]);

    // Perguntas: IA quando disponível, padrão como fallback silencioso.
    const [questions, setQuestions] = useState<string[]>(DEFAULT_QUESTIONS);
    const [questionsNote, setQuestionsNote] = useState(
        hasApiKey ? 'sugestões da IA em andamento…' : 'perguntas padrão (configurar a IA as personaliza)'
    );

    useEffect(() => {
        if (!hasApiKey) return;
        let cancelled = false;
        suggestConsultationQuestions({
            medications: reminders.map(describeReminderLine),
            adherence7: describeWindow(baseData.report.last7),
            adherence30: describeWindow(baseData.report.last30),
            difficulties: describeDifficulties(baseData.report),
            pendingExams: exams
                .filter((exam) => exam.status !== 'done')
                .map((exam) => `${exam.name} (${exam.date})`),
        })
            .then((suggested) => {
                if (cancelled) return;
                if (suggested.length > 0) {
                    setQuestions(suggested);
                    setQuestionsNote('perguntas sugeridas pela IA — edite como quiser');
                } else {
                    setQuestionsNote('perguntas padrão (a IA não retornou sugestões)');
                }
            })
            .catch((err) => {
                if (cancelled) return;
                setQuestionsNote(
                    err instanceof AiError
                        ? `perguntas padrão (${err.message})`
                        : 'perguntas padrão (falha ao consultar a IA)'
                );
            });
        return () => {
            cancelled = true;
        };
        // Deliberado: busca as perguntas uma vez por abertura, não a cada
        // mudança dos dados — o resumo local é recalculado à parte.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasApiKey]);

    const summaryText = useMemo(
        () =>
            buildConsultationSummary({
                now: baseData.now,
                reminders,
                exams,
                appointments,
                adherence7: baseData.week,
                adherence30: baseData.month,
                report: baseData.report,
                questions,
                questionsNote,
            }),
        [baseData, reminders, exams, appointments, questions, questionsNote]
    );

    // Texto derivado: enquanto o usuário não edita, segue o resumo gerado
    // (que muda quando as perguntas da IA chegam). Sem effect de sincronização.
    const [userEdits, setUserEdits] = useState<string | null>(null);
    const text = userEdits ?? summaryText;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback para navegadores sem clipboard API (http, navegadores antigos).
            const textarea = document.getElementById('consultation-summary-text') as HTMLTextAreaElement | null;
            if (textarea) {
                textarea.select();
                document.execCommand('copy');
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2500);
            }
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="relative max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/70 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:max-h-[90dvh] sm:rounded-3xl sm:p-7">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    aria-label="Fechar"
                >
                    <XIcon className="w-6 h-6" />
                </button>
                <h3 className="text-lg font-medium leading-6 text-brand-gray-900 dark:text-white mb-1 pr-8">
                    Resumo para a consulta
                </h3>
                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mb-4">
                    Montado com os dados deste dispositivo (medicamentos, adesão, exames e consultas) e perguntas sugeridas pela IA. Confira e edite antes de levar.
                </p>

                <textarea
                    id="consultation-summary-text"
                    value={text}
                    onChange={(e) => setUserEdits(e.target.value)}
                    rows={18}
                    className="w-full rounded-md border border-brand-gray-300 dark:border-brand-gray-600 dark:bg-brand-gray-700 focus:border-brand-blue focus:ring-brand-blue text-xs leading-relaxed font-mono p-3 text-brand-gray-800 dark:text-brand-gray-100"
                    aria-label="Texto do resumo para a consulta"
                />

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-brand-gray-200 dark:bg-brand-gray-600 rounded-md hover:bg-brand-gray-300 dark:hover:bg-brand-gray-500 text-sm font-semibold"
                    >
                        Fechar
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-4 py-2 border border-brand-blue text-brand-blue rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-semibold"
                    >
                        <PrinterIcon className="w-4 h-4" />
                        Imprimir
                    </button>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-600 text-sm font-semibold"
                    >
                        <CopyIcon className="w-4 h-4" />
                        {copied ? 'Copiado!' : 'Copiar texto'}
                    </button>
                </div>
            </div>

            {/* Impressão: só este bloco aparece na folha (visibility técnica). */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #consultation-print-sheet, #consultation-print-sheet * { visibility: visible; }
                    #consultation-print-sheet { position: absolute; inset: 0; padding: 8mm; font-size: 11pt; }
                    #consultation-print-sheet .print-note { display: none; }
                }
            `}</style>
            <div id="consultation-print-sheet" className="hidden print:block fixed inset-0 bg-white text-black whitespace-pre-wrap font-mono text-xs p-8 overflow-hidden">
                <div className="print-note">
                    <FileTextIcon className="w-5 h-5 mb-2" />
                </div>
                {text}
            </div>
        </div>
    );
};

export default ConsultationSummaryModal;
