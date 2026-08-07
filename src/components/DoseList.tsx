import { ReminderStatus, type DoseOccurrence, type Reminder } from '../types';
import { formatLongDate, parseLocalDate, todayKey } from '../utils/date';
import { getDoseState } from '../utils/schedule';
import { Icon } from './Icon';

interface DoseListProps {
  occurrences: DoseOccurrence[];
  reminders: Reminder[];
  selectedDate: string;
  now: Date;
  onStatus: (occurrence: DoseOccurrence, status: ReminderStatus) => void;
  onAddReminder: () => void;
}

const STATE_LABELS = {
  upcoming: 'Programada',
  due: 'Agora',
  missed: 'Atrasada',
  [ReminderStatus.TAKEN]: 'Tomada',
  [ReminderStatus.SKIPPED]: 'Ignorada',
};

export const DoseList = ({
  occurrences,
  reminders,
  selectedDate,
  now,
  onStatus,
  onAddReminder,
}: DoseListProps) => {
  const canChangeStatus = selectedDate <= todayKey();
  const headingDate = formatLongDate(parseLocalDate(selectedDate));

  return (
    <section className="card schedule-card" aria-labelledby="schedule-title">
      <div className="card-header">
        <div>
          <span className="eyebrow">Agenda</span>
          <h2 id="schedule-title">Doses do dia</h2>
          <p className="card-subtitle capitalize">{headingDate}</p>
        </div>
        <span className="count-badge">{occurrences.length}</span>
      </div>

      {occurrences.length === 0 ? (
        <div className="empty-state empty-state--compact">
          <span className="empty-state__icon"><Icon name="calendar" size={28} /></span>
          <h3>Nenhuma dose neste dia</h3>
          <p>Escolha outra data ou crie um lembrete para começar.</p>
          <button type="button" className="button button--soft button--small" onClick={onAddReminder}>
            <Icon name="plus" size={17} /> Novo lembrete
          </button>
        </div>
      ) : (
        <ol className="dose-timeline">
          {occurrences.map((occurrence) => {
            const reminder = reminders.find((item) => item.id === occurrence.reminderId);
            const state = getDoseState(occurrence, reminder, now);
            return (
              <li className={`dose-item dose-item--${state}`} key={occurrence.key}>
                <div className="dose-time">
                  <strong>{occurrence.time}</strong>
                  <span className={`status-badge status-badge--${state}`}>{STATE_LABELS[state]}</span>
                </div>
                <div className="dose-marker" aria-hidden="true">
                  {state === ReminderStatus.TAKEN ? <Icon name="check" size={15} /> : <span />}
                </div>
                <div className="dose-content">
                  <div className="dose-content__main">
                    <div>
                      <h3>{occurrence.medicationName}</h3>
                      {(occurrence.dosage || occurrence.instructions) && (
                        <p>
                          {occurrence.dosage}
                          {occurrence.dosage && occurrence.instructions ? ' · ' : ''}
                          {occurrence.instructions}
                        </p>
                      )}
                    </div>
                    {canChangeStatus && (
                      <div className="dose-actions" aria-label={`Registrar dose de ${occurrence.medicationName}`}>
                        <button
                          type="button"
                          className={`dose-action dose-action--taken ${state === ReminderStatus.TAKEN ? 'is-active' : ''}`}
                          onClick={() => onStatus(occurrence, ReminderStatus.TAKEN)}
                          aria-pressed={state === ReminderStatus.TAKEN}
                        >
                          <Icon name="check" size={17} />
                          <span>Tomei</span>
                        </button>
                        <button
                          type="button"
                          className={`dose-action dose-action--skipped ${state === ReminderStatus.SKIPPED ? 'is-active' : ''}`}
                          onClick={() => onStatus(occurrence, ReminderStatus.SKIPPED)}
                          aria-pressed={state === ReminderStatus.SKIPPED}
                        >
                          <Icon name="skip" size={16} />
                          <span>Ignorar</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
