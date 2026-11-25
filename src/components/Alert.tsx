import { Icon } from './Icon';

export function Alert({ message, onClose, tone = 'error' }: { message: string; onClose?: () => void; tone?: 'error' | 'success' }) {
  return <div className={`alert ${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon name={tone === 'error' ? 'alert' : 'checkCircle'} size={18}/><span>{message}</span>{onClose && <button type="button" onClick={onClose} aria-label="Fechar"><Icon name="x" size={16}/></button>}</div>;
}
