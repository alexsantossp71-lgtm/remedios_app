import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog = ({
  title,
  message,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onClose,
}: ConfirmDialogProps) => (
  <Modal title={title} onClose={onClose} size="small">
    <div className="modal-body">
      <p className="confirm-message">{message}</p>
    </div>
    <footer className="modal-footer">
      <button type="button" className="button button--ghost" onClick={onClose}>
        Cancelar
      </button>
      <button
        type="button"
        className={`button ${tone === 'danger' ? 'button--danger' : 'button--primary'}`}
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
    </footer>
  </Modal>
);
