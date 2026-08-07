import type { DoseOccurrence } from '../types';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface NotificationModalProps {
  occurrence: DoseOccurrence;
  remainingAlerts: number;
  onTaken: () => void;
  onSkipped: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}

export const NotificationModal = ({
  occurrence,
  remainingAlerts,
  onTaken,
  onSkipped,
  onSnooze,
  onDismiss,
}: NotificationModalProps) => (
  <Modal
    title={occurrence.snoozed ? 'Lembrete adiado' : 'Hora do remédio'}
    description="Registre a dose para manter seu acompanhamento atualizado."
    onClose={onDismiss}
    size="small"
    closeLabel="Fechar e deixar a dose pendente"
  >
    <div className="modal-body alert-dialog">
      <div className="alert-dialog__bell"><Icon name="bell" size={34} /></div>
      <div className="alert-dialog__medicine">
        <span>{occurrence.snoozed ? 'Lembrete das' : 'Dose das'} {occurrence.time}</span>
        <h3>{occurrence.medicationName}</h3>
        {occurrence.dosage && <p>{occurrence.dosage}</p>}
        {occurrence.instructions && <small>{occurrence.instructions}</small>}
      </div>
      {remainingAlerts > 0 && (
        <p className="alert-dialog__queue">Há mais {remainingAlerts} {remainingAlerts === 1 ? 'alerta' : 'alertas'} aguardando.</p>
      )}
      <div className="alert-dialog__actions">
        <button type="button" className="button button--success button--large" onClick={onTaken}>
          <Icon name="check" size={21} /> Confirmar que tomei
        </button>
        <button type="button" className="button button--soft" onClick={onSnooze}>
          <Icon name="snooze" size={19} /> Lembrar em 10 minutos
        </button>
        <button type="button" className="button button--ghost" onClick={onSkipped}>
          Ignorar esta dose
        </button>
      </div>
    </div>
  </Modal>
);
