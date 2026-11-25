import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { dataBR, moeda } from '../lib/format';
import type { Parcela } from '../types';

const hoje = new Date().toISOString().slice(0, 10);

export function BaixaModal({ parcela, onClose, onConfirm }: { parcela: Parcela | null; onClose: () => void; onConfirm: (parcela: Parcela, dataPagamento: string, formaPagamento: 'pix' | 'dinheiro') => Promise<void> }) {
  const [dataPagamento, setDataPagamento] = useState(hoje);
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'dinheiro'>('pix');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!parcela) return;
    setDataPagamento(hoje);
    setFormaPagamento('pix');
    const close = (event: KeyboardEvent) => event.key === 'Escape' && !saving && onClose();
    document.addEventListener('keydown', close);
    document.body.classList.add('modal-open');
    return () => { document.removeEventListener('keydown', close); document.body.classList.remove('modal-open'); };
  }, [parcela, onClose, saving]);

  if (!parcela) return null;

  async function confirm() {
    setSaving(true);
    try { await onConfirm(parcela!, dataPagamento, formaPagamento); onClose(); }
    catch { /* A página exibe a mensagem retornada pela API e mantém a confirmação aberta. */ }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !saving && onClose()}>
    <div className="modal-card baixa-modal" role="dialog" aria-modal="true" aria-labelledby="baixa-modal-title">
      <div className="modal-head"><div><span className="eyebrow">CONFIRMAR PAGAMENTO</span><h2 id="baixa-modal-title">Dar baixa na parcela?</h2><p>Confira os dados antes de confirmar.</p></div><button type="button" onClick={onClose} disabled={saving} aria-label="Fechar"><Icon name="x" size={18}/></button></div>
      <dl className="baixa-summary">
        <div><dt>Cliente</dt><dd>{parcela.cliente_nome}</dd></div>
        {parcela.produto && <div className="baixa-product"><dt>Produto</dt><dd>{parcela.produto}</dd></div>}
        <div><dt>Parcela / prazo</dt><dd>{parcela.numero ? `Parcela ${parcela.numero}` : 'Juros mensal'}</dd></div>
        <div><dt>Vencimento</dt><dd>{dataBR(parcela.data_vencimento)}</dd></div>
        <div><dt>Valor da parcela</dt><dd className="baixa-value">{moeda(parcela.valor)}</dd></div>
      </dl>
      <label className="baixa-date"><span>Forma de pagamento</span><select value={formaPagamento} onChange={event => setFormaPagamento(event.target.value as 'pix' | 'dinheiro')}><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option></select></label>
      <label className="baixa-date"><span>Data do pagamento</span><input type="date" required value={dataPagamento} onChange={event => setDataPagamento(event.target.value)}/></label>
      <div className="modal-actions"><button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" className="primary" onClick={confirm} disabled={saving || !dataPagamento}>{saving ? 'Confirmando...' : 'Confirmar baixa'}</button></div>
    </div>
  </div>;
}
