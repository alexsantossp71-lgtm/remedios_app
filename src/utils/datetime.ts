
// Formatação de datas/horas em pt-BR e helpers para os inputs nativos
// (date/datetime-local), que esperam valores no fuso local, não em UTC.

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

const pad = (n: number) => String(n).padStart(2, '0');

/** Converte um ISO local ('YYYY-MM-DDTHH:MM') em Date; retorna null se inválido. */
export const parseLocalDateTime = (iso: string): Date | null => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
};

/** Converte 'YYYY-MM-DD' em Date LOCAL (meia-noite local). new Date('YYYY-MM-DD')
 * interpreta como UTC e desloca um dia em fusos negativos (ex.: America/Sao_Paulo).
 * Datas que rolam (ex.: 2026-02-30) são rejeitadas com null. */
export const parseLocalDate = (iso: string): Date | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);
    // Componentes devem bater exatamente: 2026-02-30 viraria 02/03 pelo rolamento
    // do construtor e passaria como "válida" se não checarmos.
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
    return Number.isNaN(date.getTime()) ? null : date;
};

/** 'YYYY-MM-DD' no fuso local (diferente de toISOString(), que é UTC). */
export const toDateKey = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Valor para <input type="date">: 'YYYY-MM-DD'. */
export const toDateInputValue = toDateKey;

/** Valor para <input type="datetime-local">: 'YYYY-MM-DDTHH:MM'. */
export const toDateTimeInputValue = (date: Date): string =>
    `${toDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const formatDateBR = (iso: string): string => {
    const date = parseLocalDateTime(iso) ?? parseLocalDate(iso);
    return date ? dateFmt.format(date) : iso;
};

export const formatTimeBR = (iso: string): string => {
    const date = parseLocalDateTime(iso);
    return date ? timeFmt.format(date) : iso;
};

/** 'dd/mm/aaaa às HH:MM' ou o valor original se a data for inválida. */
export const formatDateTimeBR = (iso: string): string => {
    const date = parseLocalDateTime(iso);
    return date ? `${dateFmt.format(date)} às ${timeFmt.format(date)}` : iso;
};

/** Dia da semana abreviado ('seg.', 'ter.', ...). */
export const formatWeekdayBR = (iso: string): string => {
    const date = parseLocalDateTime(iso);
    return date ? weekdayFmt.format(date) : '';
};

/** Rótulo legível do lembrete de consulta. */
export const describeReminderOffset = (offset: number): string => {
    if (offset === 1440) return '1 dia antes';
    if (offset === 60) return '1 hora antes';
    if (offset > 0) {
        const hours = Math.floor(offset / 60);
        const minutes = offset % 60;
        const parts = [];
        if (hours > 0) parts.push(`${hours} h`);
        if (minutes > 0) parts.push(`${minutes} min`);
        return `${parts.join(' e ')} antes`;
    }
    return 'Sem lembrete';
};
