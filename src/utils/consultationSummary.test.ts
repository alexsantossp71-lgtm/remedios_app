
import { describe, it, expect } from 'vitest';
import { Appointment, Exam, Reminder, ReminderStatus } from '../types';
import { buildAdherenceReport } from './adherenceInsights';
import {
    buildConsultationSummary,
    DEFAULT_QUESTIONS,
    describeReminderLine,
    describeDifficulties,
    sanitizeConsultationQuestions,
} from './consultationSummary';

const NOW = new Date(2026, 10, 12, 16, 0, 0, 0);
const DAY_MS = 86_400_000;

const dayKey = (daysAgo: number): string => {
    const d = new Date(NOW);
    d.setDate(d.getDate() - daysAgo);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
    id: 'r1',
    medicationName: 'Losartana',
    dosage: '50mg',
    instructions: 'pela manhã',
    startDate: dayKey(7),
    duration: { type: 'continuous', days: 0 },
    frequency: { type: 'daily', days: 1 },
    times: ['08:00'],
    history: {},
    createdAt: new Date(NOW.getTime() - 8 * DAY_MS).toISOString(),
    ...overrides,
});

describe('describeReminderLine', () => {
    it('junta nome, dosagem, instruções e posologia', () => {
        const line = describeReminderLine(reminder());
        expect(line).toBe('Losartana (50mg) — pela manhã — todos os dias às 08:00 (uso contínuo)');
    });

    it('frequência em dias alternados e duração em dias', () => {
        const line = describeReminderLine(
            reminder({
                dosage: '',
                instructions: '',
                frequency: { type: 'interval', days: 2 },
                duration: { type: 'days', days: 7 },
                times: ['09:00', '21:00'],
            })
        );
        expect(line).toBe('Losartana — a cada 2 dia(s) às 09:00, 21:00 (por 7 dia(s))');
    });
});

describe('describeDifficulties', () => {
    it('lista as maiores perdas da janela de 30 dias', () => {
        const history: Reminder['history'] = {};
        for (let i = 0; i < 7; i++) history[dayKey(i)] = { '08:00': ReminderStatus.TAKEN };
        const report = buildAdherenceReport([reminder({ times: ['08:00', '22:00'], history })], NOW);
        const lines = describeDifficulties(report);
        expect(lines.length).toBeGreaterThan(0);
        expect(lines[0]).toContain('dose(s) não tomada(s)');
    });
});

describe('buildConsultationSummary', () => {
    const takenHistory = (): Reminder['history'] => {
        const history: Reminder['history'] = {};
        for (let i = 0; i < 7; i++) history[dayKey(i)] = { '08:00': ReminderStatus.TAKEN };
        return history;
    };

    const exams: Exam[] = [
        {
            id: 'e1',
            name: 'Hemograma completo',
            category: 'Laboratório',
            status: 'scheduled',
            date: dayKey(-8), // futuro
            time: '09:00',
            reminderOffset: 1440,
            doctorId: '',
            doctorName: 'Dr. Ana',
            place: 'Laboratório Central',
            results: '',
        },
    ];

    const appointments: Appointment[] = [
        {
            id: 'a1',
            doctorId: '',
            doctorName: 'Dr. Carlos (cardiologista)',
            dateTime: `${dayKey(-20)}T14:30`,
            location: 'Clínica Vida',
            reason: 'Rotina',
            notes: '',
            reminderOffset: 60,
            notifiedOffsets: [],
        },
    ];

    it('monta o documento com todas as seções', () => {
        const text = buildConsultationSummary({
            now: NOW,
            reminders: [reminder({ history: takenHistory() })],
            exams,
            appointments,
            adherence7: { expected: 7, taken: 7 },
            adherence30: { expected: 7, taken: 7 },
            report: buildAdherenceReport([reminder({ history: takenHistory() })], NOW),
            questions: ['Posso continuar com a mesma dose?'],
            questionsNote: 'perguntas sugeridas pela IA',
        });

        expect(text).toContain('RESUMO PARA A CONSULTA — 12/11/2026');
        expect(text).toContain('MEDICAMENTOS EM USO');
        expect(text).toContain('1. Losartana (50mg) — pela manhã');
        expect(text).toContain('ADESÃO ÀS DOSES');
        expect(text).toContain('Últimos 7 dias: 100% das doses tomadas (7 de 7)');
        expect(text).toContain('EXAMES PENDENTES');
        expect(text).toContain('Hemograma completo — agendado para');
        expect(text).toContain('Laboratório Central');
        expect(text).toContain('PRÓXIMAS CONSULTAS');
        expect(text).toContain('Dr. Carlos (cardiologista)');
        expect(text).toContain('PERGUNTAS PARA LEVAR AO MÉDICO');
        expect(text).toContain('1. Posso continuar com a mesma dose?');
        expect(text).toContain('Documento gerado pelo app Remédio na Hora');
    });

    it('trata listas vazias sem quebrar', () => {
        const text = buildConsultationSummary({
            now: NOW,
            reminders: [],
            exams: [],
            appointments: [],
            adherence7: { expected: 0, taken: 0 },
            adherence30: { expected: 0, taken: 0 },
            report: buildAdherenceReport([], NOW),
            questions: [],
        });
        expect(text).toContain('Nenhum lembrete cadastrado no app.');
        expect(text).toContain('Nenhum exame pendente registrado.');
        expect(text).toContain('Nenhuma consulta futura agendada no app.');
    });

    it('inclui resultados recentes de exames realizados', () => {
        const text = buildConsultationSummary({
            now: NOW,
            reminders: [],
            exams: [
                {
                    id: 'e2',
                    name: 'Glicemia',
                    category: 'Laboratório',
                    status: 'done',
                    date: dayKey(5),
                    doctorId: '',
                    doctorName: '',
                    place: '',
                    results: '95 mg/dL (jejum)',
                },
            ],
            appointments: [],
            adherence7: { expected: 0, taken: 0 },
            adherence30: { expected: 0, taken: 0 },
            report: buildAdherenceReport([], NOW),
            questions: DEFAULT_QUESTIONS,
        });
        expect(text).toContain('RESULTADOS RECENTES');
        expect(text).toContain('Glicemia (');
        expect(text).toContain('95 mg/dL (jejum)');
    });
});

describe('sanitizeConsultationQuestions', () => {
    it('aceita o formato {"questions":[...]}', () => {
        expect(
            sanitizeConsultationQuestions({ questions: ['  Pergunta 1? ', '', 'Pergunta 2?'] })
        ).toEqual(['Pergunta 1?', 'Pergunta 2?']);
    });

    it('aceita lista direta e descarta não-strings', () => {
        expect(sanitizeConsultationQuestions(['A?', 42, null, 'B?'])).toEqual(['A?', 'B?']);
    });

    it('nunca lança e limita a 6 perguntas', () => {
        expect(sanitizeConsultationQuestions('lixo')).toEqual([]);
        const many = Array.from({ length: 9 }, (_, i) => `P${i}`);
        expect(sanitizeConsultationQuestions({ questions: many })).toHaveLength(6);
    });
});

describe('DEFAULT_QUESTIONS', () => {
    it('traz perguntas seguras e genéricas', () => {
        expect(DEFAULT_QUESTIONS.length).toBeGreaterThanOrEqual(3);
        expect(DEFAULT_QUESTIONS.every((q) => typeof q === 'string' && q.length > 10)).toBe(true);
    });
});
