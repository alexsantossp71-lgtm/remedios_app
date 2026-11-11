
// Resumo para levar à consulta: monta um documento em texto simples a partir
// dos dados LOCAIS do app (lembretes, adesão, exames, consultas) + perguntas
// sugeridas pela IA. Tudo puro e testável; nada de rede nem DOM aqui.

import { Appointment, Exam, Reminder } from '../types';
import { AdherenceReport } from './adherenceInsights';
import { formatDateBR } from './datetime';

/** Perguntas usadas quando a IA não está configurada ou falha. */
export const DEFAULT_QUESTIONS: string[] = [
    'Preciso continuar tomando todos os medicamentos ou algum pode ser suspenso/ajustado?',
    'Algum dos meus exames recentes exige mudança no tratamento?',
    'Quais efeitos colaterais devo observar e o que fazer se aparecerem?',
    'O que devo fazer se esquecer ou pular uma dose?',
    'Quando devo voltar e quais exames de controle serão necessários?',
];

/** Linha do documento descrevendo um lembrete em uso. */
export function describeReminderLine(reminder: Reminder): string {
    const parts: string[] = [];
    parts.push(reminder.dosage ? `${reminder.medicationName} (${reminder.dosage})` : reminder.medicationName);
    if (reminder.instructions) parts.push(reminder.instructions);
    const frequency =
        reminder.frequency.type === 'interval'
            ? `a cada ${reminder.frequency.days} dia(s)`
            : 'todos os dias';
    const duration =
        reminder.duration.type === 'days'
            ? `por ${reminder.duration.days} dia(s)`
            : 'uso contínuo';
    parts.push(`${frequency} às ${reminder.times.join(', ')} (${duration})`);
    return parts.join(' — ');
}

export interface ConsultationInput {
    now: Date;
    reminders: Reminder[];
    exams: Exam[];
    appointments: Appointment[];
    adherence7: { expected: number; taken: number };
    adherence30: { expected: number; taken: number };
    /** Janelas do relatório de adesão (para "doses com dificuldade"). */
    report: AdherenceReport;
    questions: string[];
    /** Nota sobre a origem das perguntas (IA ou padrão); '' omite. */
    questionsNote?: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Monta o documento completo em texto simples, pronto para copiar/imprimir. */
export function buildConsultationSummary(input: ConsultationInput): string {
    const lines: string[] = [];
    const header = `RESUMO PARA A CONSULTA — ${pad(input.now.getDate())}/${pad(input.now.getMonth() + 1)}/${input.now.getFullYear()}`;
    lines.push(header);
    lines.push('');

    // ===== Medicamentos em uso =====
    lines.push('MEDICAMENTOS EM USO');
    if (input.reminders.length === 0) {
        lines.push('- Nenhum lembrete cadastrado no app.');
    } else {
        input.reminders.forEach((reminder, index) => {
            lines.push(`${index + 1}. ${describeReminderLine(reminder)}`);
        });
    }
    lines.push('');

    // ===== Adesão =====
    lines.push('ADESÃO ÀS DOSES');
    if (input.adherence30.expected === 0 && input.adherence7.expected === 0) {
        lines.push('- Sem doses registradas no período (o histórico de doses começa com o uso do app).');
    } else {
        lines.push(`- Últimos 7 dias: ${describeWindowText(input.adherence7)}`);
        lines.push(`- Últimos 30 dias: ${describeWindowText(input.adherence30)}`);
        const difficulties = describeDifficulties(input.report);
        if (difficulties.length > 0) {
            lines.push('- Doses com mais perda:');
            difficulties.forEach((line) => lines.push(`  • ${line}`));
        }
    }
    lines.push('');

    // ===== Exames pendentes =====
    lines.push('EXAMES PENDENTES');
    const pending = input.exams
        .filter((exam) => exam.status !== 'done')
        .sort((a, b) => a.date.localeCompare(b.date));
    if (pending.length === 0) {
        lines.push('- Nenhum exame pendente registrado.');
    } else {
        pending.forEach((exam) => {
            const when = exam.status === 'scheduled' ? 'agendado para' : 'pedido em';
            lines.push(`- ${exam.name} — ${when} ${formatDateBR(exam.date)}${exam.place ? ` (${exam.place})` : ''}`);
        });
    }
    lines.push('');

    // ===== Últimos resultados =====
    const withResults = input.exams
        .filter((exam) => exam.status === 'done' && exam.results.trim())
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3);
    if (withResults.length > 0) {
        lines.push('RESULTADOS RECENTES');
        withResults.forEach((exam) => {
            lines.push(`- ${exam.name} (${formatDateBR(exam.date)}): ${exam.results.trim()}`);
        });
        lines.push('');
    }

    // ===== Próximas consultas =====
    const upcoming = input.appointments
        .filter((appointment) => appointment.dateTime >= toLocalIso(input.now))
        .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
        .slice(0, 3);
    lines.push('PRÓXIMAS CONSULTAS');
    if (upcoming.length === 0) {
        lines.push('- Nenhuma consulta futura agendada no app.');
    } else {
        upcoming.forEach((appointment) => {
            lines.push(`- ${appointment.doctorName} — ${formatDateTimeShort(appointment.dateTime)}${appointment.reason ? ` (${appointment.reason})` : ''}`);
        });
    }
    lines.push('');

    // ===== Perguntas =====
    lines.push('PERGUNTAS PARA LEVAR AO MÉDICO');
    if (input.questionsNote) lines.push(`(${input.questionsNote})`);
    input.questions.forEach((question, index) => {
        lines.push(`${index + 1}. ${question}`);
    });
    lines.push('');
    lines.push('Documento gerado pelo app Remédio na Hora (dados locais deste dispositivo).');

    return lines.join('\n');
}

const describeWindowText = (adherence: { expected: number; taken: number }): string => {
    if (adherence.expected === 0) return 'sem doses programadas';
    const pct = Math.round((adherence.taken / adherence.expected) * 100);
    return `${pct}% das doses tomadas (${adherence.taken} de ${adherence.expected})`;
};

/** Maiores perdas (faixa de horário e medicamento) dos últimos 30 dias. */
export function describeDifficulties(report: AdherenceReport): string[] {
    const lines: string[] = [];
    report.last30.byTime.slice(0, 2).forEach((group) => {
        lines.push(`${group.label}: ${group.missed} dose(s) não tomada(s) de ${group.expected} programadas`);
    });
    report.last30.byMedication.slice(0, 2).forEach((group) => {
        lines.push(`${group.label}: ${group.missed} dose(s) não tomada(s)`);
    });
    return lines;
}

const toLocalIso = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const formatDateTimeShort = (iso: string): string => {
    const formatted = formatDateBR(iso);
    const time = iso.split('T')[1] ?? '';
    return time ? `${formatted} às ${time}` : formatted;
};

/**
 * Normaliza a lista de perguntas devolvida pela IA; nunca lança.
 * Aceita {"questions":[...]} ou uma lista direta de strings.
 */
export function sanitizeConsultationQuestions(value: unknown): string[] {
    const record = value as Record<string, unknown> | null;
    const raw = Array.isArray(record?.questions)
        ? (record!.questions as unknown[])
        : Array.isArray(value)
            ? (value as unknown[])
            : [];
    return raw
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 220))
        .slice(0, 6);
}
