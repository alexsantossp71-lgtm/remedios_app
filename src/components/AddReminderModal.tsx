import { useMemo, useState, type FormEvent } from 'react';
import type { Reminder, ReminderInput } from '../types';
import { MEDICATION_SUGGESTIONS } from '../data/medications';
import { isValidDateKey, isValidTime, todayKey } from '../utils/date';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface AddReminderModalProps {
  reminder?: Reminder;
  onClose: () => void;
  onSave: (input: ReminderInput) => void;
}

interface FormErrors {
  medicationName?: string;
  startDate?: string;
  durationDays?: string;
  frequencyDays?: string;
  times?: string;
}

const nextAvailableTime = (times: string[]): string => {
  const candidates = ['08:00', '12:00', '18:00', '20:00', '22:00', '06:00', '14:00'];
  return candidates.find((candidate) => !times.includes(candidate)) ?? '09:00';
};

export const AddReminderModal = ({ reminder, onClose, onSave }: AddReminderModalProps) => {
  const [medicationName, setMedicationName] = useState(reminder?.medicationName ?? '');
  const [dosage, setDosage] = useState(reminder?.dosage ?? '');
  const [instructions, setInstructions] = useState(reminder?.instructions ?? '');
  const [startDate, setStartDate] = useState(reminder?.startDate ?? todayKey());
  const [durationType, setDurationType] = useState<'continuous' | 'days'>(
    reminder?.duration.type ?? 'continuous',
  );
  const [durationDays, setDurationDays] = useState(String(reminder?.duration.days || 7));
  const [frequencyType, setFrequencyType] = useState<'daily' | 'interval'>(
    reminder?.frequency.type ?? 'daily',
  );
  const [frequencyDays, setFrequencyDays] = useState(String(reminder?.frequency.days || 2));
  const [times, setTimes] = useState<string[]>(reminder?.times ?? ['08:00']);
  const [enabled, setEnabled] = useState(reminder?.enabled ?? true);
  const [errors, setErrors] = useState<FormErrors>({});

  const sortedSuggestions = useMemo(
    () => MEDICATION_SUGGESTIONS.map((item) => item.name).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [],
  );

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (!medicationName.trim()) nextErrors.medicationName = 'Informe o nome do medicamento.';
    if (!isValidDateKey(startDate)) nextErrors.startDate = 'Informe uma data válida.';

    const parsedDuration = Number(durationDays);
    if (durationType === 'days' && (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 3_650)) {
      nextErrors.durationDays = 'Use um valor entre 1 e 3650 dias.';
    }

    const parsedFrequency = Number(frequencyDays);
    if (frequencyType === 'interval' && (!Number.isInteger(parsedFrequency) || parsedFrequency < 2 || parsedFrequency > 365)) {
      nextErrors.frequencyDays = 'Use um intervalo entre 2 e 365 dias.';
    }

    const validTimes = times.filter(isValidTime);
    if (validTimes.length !== times.length || validTimes.length === 0) {
      nextErrors.times = 'Adicione pelo menos um horário válido.';
    } else if (new Set(validTimes).size !== validTimes.length) {
      nextErrors.times = 'Não repita o mesmo horário.';
    }
    return nextErrors;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      medicationName: medicationName.trim(),
      dosage: dosage.trim(),
      instructions: instructions.trim(),
      startDate,
      duration: {
        type: durationType,
        days: durationType === 'days' ? Number(durationDays) : 0,
      },
      frequency: {
        type: frequencyType,
        days: frequencyType === 'interval' ? Number(frequencyDays) : 1,
      },
      times: [...times].sort(),
      enabled,
    });
  };

  const updateTime = (index: number, value: string): void => {
    setTimes((current) => current.map((time, itemIndex) => (itemIndex === index ? value : time)));
    setErrors((current) => ({ ...current, times: undefined }));
  };

  return (
    <Modal
      title={reminder ? 'Editar lembrete' : 'Novo lembrete'}
      description="Cadastre exatamente como foi orientado pelo profissional de saúde."
      onClose={onClose}
      size="large"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-body reminder-form">
          <section className="form-section" aria-labelledby="medicine-section-title">
            <div className="form-section__heading">
              <span className="form-section__number">1</span>
              <div>
                <h3 id="medicine-section-title">Medicamento</h3>
                <p>Nome, dose e uma orientação opcional.</p>
              </div>
            </div>

            <div className="form-grid form-grid--two">
              <div className="field field--wide">
                <label htmlFor="medication-name">Nome do medicamento <span aria-hidden="true">*</span></label>
                <input
                  id="medication-name"
                  type="text"
                  value={medicationName}
                  onChange={(event) => {
                    setMedicationName(event.target.value);
                    setErrors((current) => ({ ...current, medicationName: undefined }));
                  }}
                  list="medication-suggestions"
                  placeholder="Ex.: Losartana"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.medicationName)}
                  aria-describedby={errors.medicationName ? 'medication-name-error' : undefined}
                  autoFocus
                />
                <datalist id="medication-suggestions">
                  {sortedSuggestions.map((name) => <option key={name} value={name} />)}
                </datalist>
                {errors.medicationName && <span className="field-error" id="medication-name-error">{errors.medicationName}</span>}
              </div>

              <div className="field">
                <label htmlFor="dosage">Dose</label>
                <input
                  id="dosage"
                  type="text"
                  value={dosage}
                  onChange={(event) => setDosage(event.target.value)}
                  placeholder="Ex.: 1 comprimido"
                  maxLength={80}
                />
              </div>

              <div className="field">
                <label htmlFor="instructions">Orientação</label>
                <input
                  id="instructions"
                  type="text"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder="Ex.: após o café"
                  maxLength={300}
                />
              </div>
            </div>
          </section>

          <section className="form-section" aria-labelledby="period-section-title">
            <div className="form-section__heading">
              <span className="form-section__number">2</span>
              <div>
                <h3 id="period-section-title">Período e frequência</h3>
                <p>Defina quando o tratamento começa e em quais dias ocorre.</p>
              </div>
            </div>

            <div className="form-grid form-grid--two">
              <div className="field">
                <label htmlFor="start-date">Data de início</label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setErrors((current) => ({ ...current, startDate: undefined }));
                  }}
                  aria-invalid={Boolean(errors.startDate)}
                />
                {errors.startDate && <span className="field-error">{errors.startDate}</span>}
              </div>

              <fieldset className="field fieldset-reset">
                <legend>Duração</legend>
                <div className="segmented-control">
                  <label>
                    <input
                      type="radio"
                      name="duration"
                      checked={durationType === 'continuous'}
                      onChange={() => setDurationType('continuous')}
                    />
                    <span>Uso contínuo</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="duration"
                      checked={durationType === 'days'}
                      onChange={() => setDurationType('days')}
                    />
                    <span>Por dias</span>
                  </label>
                </div>
                {durationType === 'days' && (
                  <div className="inline-number-field">
                    <input
                      aria-label="Quantidade de dias"
                      type="number"
                      min="1"
                      max="3650"
                      inputMode="numeric"
                      value={durationDays}
                      onChange={(event) => {
                        setDurationDays(event.target.value);
                        setErrors((current) => ({ ...current, durationDays: undefined }));
                      }}
                    />
                    <span>dias</span>
                  </div>
                )}
                {errors.durationDays && <span className="field-error">{errors.durationDays}</span>}
              </fieldset>

              <fieldset className="field field--wide fieldset-reset">
                <legend>Frequência</legend>
                <div className="segmented-control segmented-control--fit">
                  <label>
                    <input
                      type="radio"
                      name="frequency"
                      checked={frequencyType === 'daily'}
                      onChange={() => setFrequencyType('daily')}
                    />
                    <span>Todos os dias</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="frequency"
                      checked={frequencyType === 'interval'}
                      onChange={() => setFrequencyType('interval')}
                    />
                    <span>A cada alguns dias</span>
                  </label>
                </div>
                {frequencyType === 'interval' && (
                  <div className="inline-number-field">
                    <span>A cada</span>
                    <input
                      aria-label="Intervalo em dias"
                      type="number"
                      min="2"
                      max="365"
                      inputMode="numeric"
                      value={frequencyDays}
                      onChange={(event) => {
                        setFrequencyDays(event.target.value);
                        setErrors((current) => ({ ...current, frequencyDays: undefined }));
                      }}
                    />
                    <span>dias</span>
                  </div>
                )}
                {errors.frequencyDays && <span className="field-error">{errors.frequencyDays}</span>}
              </fieldset>
            </div>
          </section>

          <section className="form-section" aria-labelledby="times-section-title">
            <div className="form-section__heading">
              <span className="form-section__number">3</span>
              <div>
                <h3 id="times-section-title">Horários</h3>
                <p>Você receberá um alerta para cada horário cadastrado.</p>
              </div>
            </div>

            <div className="time-fields">
              {times.map((time, index) => (
                <div className="time-field" key={index}>
                  <label htmlFor={`dose-time-${index}`}>Dose {index + 1}</label>
                  <input
                    id={`dose-time-${index}`}
                    type="time"
                    value={time}
                    onChange={(event) => updateTime(index, event.target.value)}
                    aria-invalid={Boolean(errors.times)}
                  />
                  <button
                    type="button"
                    className="icon-button icon-button--danger"
                    onClick={() => setTimes((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    disabled={times.length === 1}
                    aria-label={`Remover horário ${time || index + 1}`}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="button button--soft button--small add-time-button"
                onClick={() => setTimes((current) => [...current, nextAvailableTime(current)])}
                disabled={times.length >= 12}
              >
                <Icon name="plus" size={17} />
                Adicionar horário
              </button>
            </div>
            {errors.times && <span className="field-error">{errors.times}</span>}
          </section>

          <label className="toggle-row toggle-row--boxed">
            <span>
              <strong>Lembrete ativo</strong>
              <small>Você pode pausar e reativar quando quiser.</small>
            </span>
            <input
              className="switch"
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              aria-label="Lembrete ativo"
            />
          </label>

          <div className="form-safety-note">
            <Icon name="info" size={18} />
            <span>As sugestões ajudam apenas no preenchimento. Siga sempre a receita e a orientação do seu profissional de saúde.</span>
          </div>
        </div>

        <footer className="modal-footer">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button button--primary">
            <Icon name="check" size={18} />
            {reminder ? 'Salvar alterações' : 'Criar lembrete'}
          </button>
        </footer>
      </form>
    </Modal>
  );
};
