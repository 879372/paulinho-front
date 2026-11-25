import { useEffect, useState } from 'react';
import { Icon } from './Icon';

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'default' | 'danger';
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmActionModal({ open, title, description, confirmLabel, tone = 'default', onClose, onConfirm }: ConfirmActionModalProps) {
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirmando) onClose();
    };
    document.body.classList.add('modal-open');
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, confirmando, onClose]);

  if (!open) return null;

  async function confirmar() {
    setConfirmando(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // A tela chamadora apresenta a mensagem retornada pela API.
    } finally {
      setConfirmando(false);
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget && !confirmando) onClose();
  }}>
    <section className="modal-card confirm-action-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-action-title" aria-describedby="confirm-action-description">
      <div className={`confirm-action-icon ${tone}`} aria-hidden="true"><Icon name={tone === 'danger' ? 'alert' : 'check'} size={24}/></div>
      <div className="modal-head">
        <div>
          <h2 id="confirm-action-title">{title}</h2>
          <p id="confirm-action-description">{description}</p>
        </div>
        <button type="button" onClick={onClose} disabled={confirmando} aria-label="Fechar"><Icon name="x" size={18}/></button>
      </div>
      <div className="modal-actions">
        <button type="button" className="ghost" onClick={onClose} disabled={confirmando}>Cancelar</button>
        <button type="button" className={tone === 'danger' ? 'danger-button' : 'primary'} onClick={confirmar} disabled={confirmando}>
          {confirmando ? 'Aguarde...' : confirmLabel}
        </button>
      </div>
    </section>
  </div>;
}
