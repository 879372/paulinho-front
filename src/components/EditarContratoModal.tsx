import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { Alert } from './Alert';
import { DiaSemanaSelect, diaSemanaDaData, proximaDataNoDia } from '../lib/recorrencia';
import type { Contrato } from '../types';

type Props = { contrato: Contrato; open: boolean; onClose: () => void; onConfirm: (dados: Record<string, string>) => Promise<void> };

export function EditarContratoModal({ contrato, open, onClose, onConfirm }: Props) {
  const somenteJuros = contrato.tipo === 'emprestimo_somente_juros';
  const primeiraAberta = contrato.parcelas.find(parcela => ['pendente', 'atrasada'].includes(parcela.status));
  const [produto, setProduto] = useState('');
  const [valorEntrada, setValorEntrada] = useState('');
  const [valor, setValor] = useState('');
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('');
  const [valorReceber, setValorReceber] = useState('');
  const [taxa, setTaxa] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [periodicidade, setPeriodicidade] = useState('mensal');
  const [diaSemana, setDiaSemana] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setProduto(contrato.produto || '');
    setValorEntrada(contrato.valor_entrada || '0.00');
    setValor(somenteJuros ? contrato.valor_juros_mensal || '' : contrato.valor_parcela || '');
    setQuantidadeParcelas(String(contrato.qtd_parcelas || ''));
    setValorReceber(contrato.valor_principal || '');
    setTaxa(contrato.taxa_juros_mensal || '');
    setDiaVencimento(String(contrato.dia_vencimento || ''));
    setPeriodicidade(contrato.periodicidade || 'mensal');
    setDiaSemana(contrato.dia_semana || diaSemanaDaData(primeiraAberta?.data_vencimento || ''));
    setVencimento(primeiraAberta?.data_vencimento || '');
    setObservacoes(contrato.observacoes || '');
    setError('');
  }, [open, contrato, primeiraAberta, somenteJuros]);

  if (!open) return null;

  async function confirm() {
    setSaving(true); setError('');
    try {
      if (somenteJuros) await onConfirm({ valor_principal: valorReceber, taxa_juros_mensal: taxa, valor_juros_mensal: valor, periodicidade, ...(periodicidade === 'semanal' ? { dia_semana: diaSemana } : { dia_vencimento: diaVencimento }), observacoes });
      else await onConfirm({ produto, valor_entrada: valorEntrada || '0', valor_parcela: valor, qtd_parcelas: quantidadeParcelas, periodicidade, ...(periodicidade === 'semanal' ? { dia_semana: diaSemana } : {}), proximo_vencimento: vencimento, observacoes });
      onClose();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  const invalido = saving || !valor || Number(valor) <= 0 || (somenteJuros
    ? !valorReceber || Number(valorReceber) <= 0 || !taxa || Number(taxa) <= 0 || (periodicidade === 'semanal' ? !diaSemana : !diaVencimento || Number(diaVencimento) < 1 || Number(diaVencimento) > 31)
    : !vencimento || (periodicidade === 'semanal' && !diaSemana) || !quantidadeParcelas || Number(quantidadeParcelas) < 1 || (contrato.tipo === 'venda' && Number(valorEntrada) < 0));

  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !saving && onClose()}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="editar-contrato-title">
    <div className="modal-head"><div><span className="eyebrow">EDITAR CONTRATO</span><h2 id="editar-contrato-title">{somenteJuros ? 'Atualizar somente juros' : 'Atualizar cobranças abertas'}</h2><p>Cobranças pagas serão preservadas. As alterações valem apenas para as abertas.</p></div><button type="button" onClick={onClose} disabled={saving} aria-label="Fechar"><Icon name="x" size={18}/></button></div>
    {error && <Alert message={error}/>}
    {somenteJuros ? <>
      <label className="baixa-date"><span>Valor a receber</span><input type="number" min="0.01" step="0.01" required value={valorReceber} onChange={e => setValorReceber(e.target.value)}/><small>Montante que será cobrado na quitação</small></label>
      <label className="baixa-date"><span>Juros ao mês (%)</span><input type="number" min="0.001" step="0.001" required value={taxa} onChange={e => setTaxa(e.target.value)}/></label>
      <label className="baixa-date"><span>Valor da cobrança {periodicidade === 'semanal' ? 'semanal' : 'mensal'}</span><input type="number" min="0.01" step="0.01" required value={valor} onChange={e => setValor(e.target.value)}/></label>
      <label className="baixa-date"><span>Periodicidade</span><select value={periodicidade} onChange={e => setPeriodicidade(e.target.value)}><option value="mensal">Mensal</option><option value="semanal">Semanal</option></select></label>
      {periodicidade === 'semanal'
        ? <DiaSemanaSelect className="baixa-date" value={diaSemana} onChange={setDiaSemana} hint="A cobrança aberta passa para o próximo dia escolhido"/>
        : <label className="baixa-date"><span>Dia do vencimento</span><input type="number" min="1" max="31" required value={diaVencimento} onChange={e => setDiaVencimento(e.target.value)}/></label>}
    </> : <>
      {contrato.tipo === 'venda' && <><label className="baixa-date"><span>Produto</span><input value={produto} onChange={e => setProduto(e.target.value)}/></label><label className="baixa-date"><span>Valor da entrada</span><input type="number" min="0" step="0.01" required value={valorEntrada} onChange={e => setValorEntrada(e.target.value)}/></label></>}
      <label className="baixa-date"><span>Quantidade de parcelas</span><input type="number" min="1" step="1" required value={quantidadeParcelas} onChange={e => setQuantidadeParcelas(e.target.value)}/></label>
      <label className="baixa-date"><span>Novo valor das parcelas abertas</span><input type="number" min="0.01" step="0.01" required value={valor} onChange={e => setValor(e.target.value)}/></label>
      <label className="baixa-date"><span>Periodicidade</span><select value={periodicidade} onChange={e => { setPeriodicidade(e.target.value); if (e.target.value === 'semanal') setDiaSemana(diaSemanaDaData(vencimento)); }}><option value="mensal">Mensal</option><option value="quinzenal">Quinzenal</option><option value="semanal">Semanal</option></select></label>
      {periodicidade === 'semanal' && <DiaSemanaSelect className="baixa-date" value={diaSemana} onChange={value => { setDiaSemana(value); setVencimento(proximaDataNoDia(value)); }}/>}
      <label className="baixa-date"><span>Próximo vencimento</span><input type="date" required value={vencimento} onChange={e => { setVencimento(e.target.value); if (periodicidade === 'semanal') setDiaSemana(diaSemanaDaData(e.target.value)); }}/></label>
    </>}
    <label className="full-field"><span>Observações</span><textarea rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)}/></label>
    <div className="modal-actions"><button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" className="primary" onClick={confirm} disabled={invalido}>{saving ? 'Salvando...' : 'Salvar contrato'}</button></div>
  </div></div>;
}
