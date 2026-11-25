import { useState } from 'react';
import { Icon } from './Icon';
import { Alert } from './Alert';
import { moeda } from '../lib/format';
import type { Contrato } from '../types';

const hoje = new Date().toISOString().slice(0, 10);
export function QuitarPrincipalModal({ contrato, open, onClose, onConfirm }: { contrato: Contrato; open: boolean; onClose: () => void; onConfirm: (data: string, forma: 'pix' | 'dinheiro') => Promise<void> }) {
  const [data, setData] = useState(hoje); const [forma, setForma] = useState<'pix' | 'dinheiro'>('pix'); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  if (!open) return null;
  const total = Number(contrato.valor_principal || 0);
  async function confirm() { setSaving(true); setError(''); try { await onConfirm(data, forma); onClose(); } catch (e) { setError((e as Error).message); } finally { setSaving(false); } }
  return <div className="modal-backdrop"><div className="modal-card" role="dialog" aria-modal="true"><div className="modal-head"><div><span className="eyebrow">QUITAR CONTRATO</span><h2>Encerrar somente juros?</h2><p>O valor informado já inclui o valor passado e os juros da quitação.</p></div><button type="button" onClick={onClose} disabled={saving} aria-label="Fechar"><Icon name="x" size={18}/></button></div>{error && <Alert message={error}/>}<dl className="baixa-summary"><div><dt>Valor a receber</dt><dd className="baixa-value">{moeda(total)}</dd></div></dl><label className="baixa-date"><span>Forma de pagamento</span><select value={forma} onChange={e => setForma(e.target.value as 'pix' | 'dinheiro')}><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option></select></label><label className="baixa-date"><span>Data da quitação</span><input type="date" value={data} onChange={e => setData(e.target.value)}/></label><div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>Cancelar</button><button type="button" className="primary" onClick={confirm} disabled={saving}>{saving ? 'Quitando...' : 'Confirmar quitação'}</button></div></div></div>;
}
