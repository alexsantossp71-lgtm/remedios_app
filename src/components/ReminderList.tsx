import type { Reminder } from '../types';
import { formatShortDate } from '../utils/date';
import { Icon } from './Icon';

interface ReminderListProps {
  reminders: Reminder[];
  onAdd: () => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminder: Reminder) => void;
  onToggle: (reminder: Reminder) => void;
}

const formatFrequency = (reminder: Reminder): string =>
  reminder.frequency.type === 'daily'
    ? 'Todos os dias'
    : `A cada ${reminder.frequency.days} dias`;

const formatDuration = (reminder: Reminder): string =>
  reminder.duration.type === 'continuous'
    ? 'Uso contínuo'
    : `${reminder.duration.days} ${reminder.duration.days === 1 ? 'dia' : 'dias'}`;

export const ReminderList = ({ reminders, onAdd, onEdit, onDelete, onToggle }: ReminderListProps) => (
  <section className="card reminders-card" aria-labelledby="reminders-title">
    <div className="card-header">
      <div>
        <span className="eyebrow">Tratamentos</span>
        <h2 id="reminders-title">Meus lembretes</h2>
      </div>
      <button type="button" className="button button--primary button--small" onClick={onAdd}>
        <Icon name="plus" size={17} /> Adicionar
      </button>
    </div>

    {reminders.length === 0 ? (
      <div className="empty-state">
        <span className="empty-state__icon"><Icon name="pill" size={30} /></span>
        <h3>Sua rotina começa aqui</h3>
        <p>Adicione o primeiro medicamento para montar sua agenda.</p>
        <button type="button" className="button button--primary" onClick={onAdd}>
          <Icon name="plus" size={18} /> Criar primeiro lembrete
        </button>
      </div>
    ) : (
      <div className="reminder-list">
        {reminders.map((reminder) => (
          <article
            className={`reminder-card ${reminder.enabled ? '' : 'reminder-card--paused'}`}
            key={reminder.id}
          >
            <div className="reminder-card__top">
              <span className="reminder-card__icon"><Icon name="pill" size={20} /></span>
              <div className="reminder-card__title">
                <h3>{reminder.medicationName}</h3>
                <p>{reminder.dosage || 'Dose não informada'}</p>
              </div>
              <span className={`status-badge ${reminder.enabled ? 'status-badge--active' : 'status-badge--paused'}`}>
                {reminder.enabled ? 'Ativo' : 'Pausado'}
              </span>
            </div>

            <div className="reminder-times" aria-label="Horários">
              {reminder.times.map((time) => <span key={time}>{time}</span>)}
            </div>

            <dl className="reminder-meta">
              <div>
                <dt><Icon name="refresh" size={15} /> Frequência</dt>
                <dd>{formatFrequency(reminder)}</dd>
              </div>
              <div>
                <dt><Icon name="calendar" size={15} /> Período</dt>
                <dd>{formatDuration(reminder)} · desde {formatShortDate(reminder.startDate)}</dd>
              </div>
            </dl>

            {reminder.instructions && <p className="reminder-note">“{reminder.instructions}”</p>}

            <div className="reminder-card__actions">
              <button type="button" className="text-button" onClick={() => onToggle(reminder)}>
                <Icon name={reminder.enabled ? 'pause' : 'play'} size={16} />
                {reminder.enabled ? 'Pausar' : 'Reativar'}
              </button>
              <button type="button" className="text-button" onClick={() => onEdit(reminder)}>
                <Icon name="edit" size={16} /> Editar
              </button>
              <button
                type="button"
                className="text-button text-button--danger"
                onClick={() => onDelete(reminder)}
                aria-label={`Excluir lembrete de ${reminder.medicationName}`}
              >
                <Icon name="trash" size={16} /> Excluir
              </button>
            </div>
          </article>
        ))}
      </div>
    )}
  </section>
);
