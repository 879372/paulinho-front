import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { dataBR, moeda } from '../lib/format';
import type { Parcela } from '../types';

type Props = { parcela: Parcela | null; onClose: () => void; onConfirm: (parcela: Parcela) => Promise<void> };

export function DesfazerBaixaModal({ parcela, onClose, onConfirm }: Props) {
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!parcela) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && !saving && onClose();
    document.addEventListener('keydown', close); document.body.classList.add('modal-open');
    return () => { document.removeEventListener('keydown', close); document.body.classList.remove('modal-open'); };
  }, [parcela, onClose, saving]);
  if (!parcela) return null;
  async function confirm() { setSaving(true); try { await onConfirm(parcela!); onClose(); } catch { /* A página exibe o erro. */ } finally { setSaving(false); } }
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !saving && onClose()}><div className="modal-card baixa-modal" role="dialog" aria-modal="true" aria-labelledby="desfazer-baixa-title"><div className="modal-head"><div><span className="eyebrow">CORRIGIR PAGAMENTO</span><h2 id="desfazer-baixa-title">Desfazer esta baixa?</h2><p>A parcela voltará a ficar pendente ou em atraso.</p></div><button type="button" onClick={onClose} disabled={saving} aria-label="Fechar"><Icon name="x" size={18}/></button></div><dl className="baixa-summary"><div><dt>Cliente</dt><dd>{parcela.cliente_nome}</dd></div><div><dt>Parcela / prazo</dt><dd>{parcela.numero ? `Parcela ${parcela.numero}` : 'Juros mensal'}</dd></div><div><dt>Vencimento</dt><dd>{dataBR(parcela.data_vencimento)}</dd></div><div><dt>Valor</dt><dd className="baixa-value">{moeda(parcela.valor)}</dd></div></dl><p>A data, a forma e o valor do pagamento registrado serão removidos.</p><div className="modal-actions"><button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" className="primary" onClick={confirm} disabled={saving}>{saving ? 'Desfazendo...' : 'Confirmar e desfazer'}</button></div></div></div>;
}
