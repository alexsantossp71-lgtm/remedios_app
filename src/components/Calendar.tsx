import { useState } from 'react';
import { ReminderStatus, type Reminder } from '../types';
import { formatMonth, parseLocalDate, toDateKey, todayKey } from '../utils/date';
import { getDoseState, getDosesForDate } from '../utils/schedule';
import { Icon } from './Icon';

interface CalendarProps {
  reminders: Reminder[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const Calendar = ({ reminders, selectedDate, onSelectDate }: CalendarProps) => {
  const initialDate = parseLocalDate(selectedDate);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12),
  );
  const now = new Date();
  const currentTodayKey = todayKey();
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstWeekday = new Date(year, month, 1, 12).getDay();
  const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
  const cells: Array<Date | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1, 12)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const changeMonth = (amount: number): void => {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1, 12));
  };

  const selectToday = (): void => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
    onSelectDate(toDateKey(today));
  };

  return (
    <section className="card calendar-card" aria-labelledby="calendar-title">
      <div className="card-header calendar-header">
        <div>
          <span className="eyebrow">Visão mensal</span>
          <h2 id="calendar-title">Calendário de doses</h2>
        </div>
        <button type="button" className="button button--ghost button--small" onClick={selectToday}>
          Hoje
        </button>
      </div>

      <div className="calendar-navigation">
        <button
          type="button"
          className="icon-button"
          onClick={() => changeMonth(-1)}
          aria-label="Mês anterior"
        >
          <Icon name="chevron-left" />
        </button>
        <h3 aria-live="polite">{formatMonth(currentMonth)}</h3>
        <button
          type="button"
          className="icon-button"
          onClick={() => changeMonth(1)}
          aria-label="Próximo mês"
        >
          <Icon name="chevron-right" />
        </button>
      </div>

      <div className="calendar-grid" role="grid" aria-label={formatMonth(currentMonth)}>
        {weekdays.map((weekday) => (
          <div className="calendar-weekday" role="columnheader" key={weekday}>{weekday}</div>
        ))}

        {cells.map((day, index) => {
          if (!day) return <div className="calendar-cell calendar-cell--empty" key={`empty-${index}`} />;

          const dateKey = toDateKey(day);
          const doses = getDosesForDate(reminders, dateKey);
          const states = doses.map((dose) =>
            getDoseState(dose, reminders.find((reminder) => reminder.id === dose.reminderId), now),
          );
          const hasTaken = states.includes(ReminderStatus.TAKEN);
          const hasSkippedOrMissed = states.some(
            (state) => state === ReminderStatus.SKIPPED || state === 'missed',
          );
          const hasPending = states.some((state) => state === 'upcoming' || state === 'due');
          const label = new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }).format(day);

          return (
            <button
              type="button"
              role="gridcell"
              key={dateKey}
              className={[
                'calendar-cell',
                selectedDate === dateKey ? 'calendar-cell--selected' : '',
                currentTodayKey === dateKey ? 'calendar-cell--today' : '',
                doses.length > 0 ? 'calendar-cell--has-doses' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectDate(dateKey)}
              aria-label={`${label}${doses.length ? `, ${doses.length} dose${doses.length > 1 ? 's' : ''}` : ', sem doses'}`}
              aria-selected={selectedDate === dateKey}
            >
              <span className="calendar-day-number">{day.getDate()}</span>
              {doses.length > 0 && (
                <span className="calendar-dots" aria-hidden="true">
                  {hasTaken && <span className="calendar-dot calendar-dot--taken" />}
                  {hasSkippedOrMissed && <span className="calendar-dot calendar-dot--missed" />}
                  {hasPending && <span className="calendar-dot calendar-dot--pending" />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend" aria-label="Legenda do calendário">
        <span><i className="legend-dot legend-dot--taken" /> Tomada</span>
        <span><i className="legend-dot legend-dot--pending" /> Pendente</span>
        <span><i className="legend-dot legend-dot--missed" /> Ignorada ou atrasada</span>
      </div>
    </section>
  );
};
