import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { BaixaModal } from '../components/BaixaModal';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { DesfazerBaixaModal } from '../components/DesfazerBaixaModal';
import { EditarContratoModal } from '../components/EditarContratoModal';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { QuitarPrincipalModal } from '../components/QuitarPrincipalModal';
import { PdfLabel } from '../components/PdfLabel';
import { apiDownload, apiRequest, compartilharOuBaixarPdf } from '../lib/api';
import { dataBR, moeda, statusLabel } from '../lib/format';
import { Icon } from '../components/Icon';
import { descricaoRecorrencia } from '../lib/recorrencia';
import type { Contrato, Parcela } from '../types';

export function ContratoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [error, setError] = useState('');
  const [baixando, setBaixando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [quitando, setQuitando] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState<'concluir' | 'excluir' | null>(null);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<Parcela | null>(null);
  const [parcelaParaDesfazer, setParcelaParaDesfazer] = useState<Parcela | null>(null);
  useEffect(() => { apiRequest<Contrato>(`/contratos/${id}/`).then(setContrato).catch(e => setError(e.message)); }, [id]);
  useEffect(() => {
    if (!menuAberto) return;
    const fecharMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuAberto(false);
    };
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuAberto(false);
    };
    document.addEventListener('mousedown', fecharMenu);
    document.addEventListener('keydown', fecharComEscape);
    return () => {
      document.removeEventListener('mousedown', fecharMenu);
      document.removeEventListener('keydown', fecharComEscape);
    };
  }, [menuAberto]);
  if (error) return <Alert message={error}/>;
  if (!contrato) return <LoadingState/>;
  const entrada = Number(contrato.valor_entrada || 0);
  const valorParcelado = contrato.valor_venda ? Number(contrato.valor_venda) - entrada : 0;
  const valorReceberEmprestimo = Number(contrato.valor_parcela || 0) * Number(contrato.qtd_parcelas || 0);
  async function baixarInstrumento() { setBaixando(true); setError(''); try { const arquivo = await apiDownload(`/contratos/${contrato!.id}/instrumento/`); await compartilharOuBaixarPdf(arquivo, `contrato-mutuo-${contrato!.id}.pdf`); } catch (e) { setError((e as Error).message); } finally { setBaixando(false); } }
  async function baixarRelatorio() { setBaixando(true); setError(''); try { const arquivo = await apiDownload(`/clientes/${contrato!.cliente}/relatorio/`); await compartilharOuBaixarPdf(arquivo, `relatorio-cliente-${contrato!.cliente}.pdf`); } catch (e) { setError((e as Error).message); } finally { setBaixando(false); } }
  async function baixarComprovante() { setBaixando(true); setError(''); try { const arquivo = await apiDownload(`/contratos/${contrato!.id}/comprovante/`); await compartilharOuBaixarPdf(arquivo, `contrato-${contrato!.id}.pdf`); } catch (e) { setError((e as Error).message); } finally { setBaixando(false); } }
  async function baixarParcela(parcela: Parcela, dataPagamento: string, formaPagamento: 'pix' | 'dinheiro') { const atualizada = await apiRequest<Parcela>(`/parcelas/${parcela.id}/dar-baixa/`, { method: 'PATCH', body: JSON.stringify({ data_pagamento: dataPagamento, forma_pagamento: formaPagamento, valor_pago: parcela.valor }) }); if (contrato!.tipo === 'emprestimo_somente_juros') setContrato(await apiRequest<Contrato>(`/contratos/${contrato!.id}/`)); else setContrato(current => current ? { ...current, parcelas: current.parcelas.map(item => item.id === atualizada.id ? { ...item, ...atualizada } : item) } : current); }
  async function desfazerBaixa(parcela: Parcela) { try { await apiRequest(`/parcelas/${parcela.id}/desfazer-baixa/`, { method: 'PATCH' }); setContrato(await apiRequest<Contrato>(`/contratos/${contrato!.id}/`)); } catch (e) { setError((e as Error).message); throw e; } }
  async function editarContrato(dados: Record<string, string>) {
    await apiRequest<Contrato>(`/contratos/${contrato!.id}/editar/`, { method: 'PATCH', body: JSON.stringify(dados) });
    setContrato(await apiRequest<Contrato>(`/contratos/${contrato!.id}/`));
  }
  async function concluirContrato() {
    setError('');
    try {
      setContrato(await apiRequest<Contrato>(`/contratos/${contrato!.id}/concluir/`, { method: 'POST' }));
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }
  async function excluirContrato() {
    setError('');
    try {
      await apiRequest(`/contratos/${contrato!.id}/excluir/`, { method: 'DELETE' });
      navigate(`/clientes/${contrato!.cliente}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }
  async function quitarContrato(data: string, forma: 'pix' | 'dinheiro') {
    await apiRequest(`/contratos/${contrato!.id}/quitar-principal/`, { method: 'POST', body: JSON.stringify({ data_pagamento: data, forma_pagamento: forma }) });
    setContrato(await apiRequest<Contrato>(`/contratos/${contrato!.id}/`));
  }
  const podeEditar = contrato.status !== 'quitado' && contrato.parcelas.some(parcela => parcela.status !== 'paga');
  return <>
    <PageHeader back={`/clientes/${contrato.cliente}`} eyebrow="Contrato" title={contrato.cliente_nome} description={`${contrato.produto || tipoLabel(contrato.tipo)} · iniciado em ${dataBR(contrato.data_inicio)}`} action={<div className="contract-actions" ref={menuRef}>
      <button type="button" className="contract-menu-trigger" onClick={() => setMenuAberto(aberto => !aberto)} aria-haspopup="menu" aria-expanded={menuAberto}>
        <span>Ações do contrato</span><Icon name="more" size={20}/>
      </button>
      {menuAberto && <div className="contract-action-menu" role="menu">
        <button type="button" role="menuitem" disabled={!podeEditar} onClick={() => { setMenuAberto(false); setEditando(true); }}><span className="menu-action-icon"><Icon name="edit"/></span><span><b>Editar contrato</b><small>Alterar dados e parcelas</small></span></button>
        {contrato.tipo !== 'venda' && <button type="button" role="menuitem" disabled={baixando} onClick={() => { setMenuAberto(false); void baixarInstrumento(); }}><span className="menu-action-icon"><Icon name="file"/></span><span><b>{baixando ? 'Gerando PDF...' : <PdfLabel documento="contrato de mútuo"/>}</b><small>Instrumento para assinatura com testemunhas</small></span></button>}
        <button type="button" role="menuitem" disabled={baixando} onClick={() => { setMenuAberto(false); void baixarComprovante(); }}><span className="menu-action-icon"><Icon name="share"/></span><span><b>{baixando ? 'Gerando PDF...' : <PdfLabel documento="comprovante PDF"/>}</b><small>Resumo com cronograma de parcelas</small></span></button>
        <button type="button" role="menuitem" disabled={contrato.status === 'quitado'} onClick={() => { setMenuAberto(false); contrato.tipo === 'emprestimo_somente_juros' ? setQuitando(true) : setConfirmacao('concluir'); }}><span className="menu-action-icon success"><Icon name="checkCircle"/></span><span><b>Concluir contrato</b><small>{contrato.tipo === 'emprestimo_somente_juros' ? 'Registrar quitação do principal' : 'Encerrar cobranças em aberto'}</small></span></button>
        <button type="button" role="menuitem" className="danger" onClick={() => { setMenuAberto(false); setConfirmacao('excluir'); }}><span className="menu-action-icon"><Icon name="trash"/></span><span><b>Excluir contrato</b><small>Remover contrato e histórico</small></span></button>
      </div>}
    </div>}/>
    <div className="pdf-actions"><button type="button" className="secondary" disabled={baixando} onClick={() => void baixarRelatorio()}><Icon name="file" size={18}/><PdfLabel documento="relatório PDF"/></button><button type="button" className="secondary" disabled={baixando} onClick={() => void baixarComprovante()}><Icon name="file" size={18}/><PdfLabel documento="comprovante PDF"/></button></div>
    <section className={`metric-grid contract-metrics ${contrato.tipo === 'venda' ? 'sale-metrics' : ''}`}><Metric label={contrato.tipo === 'emprestimo_somente_juros' ? 'Valor a receber' : contrato.tipo === 'venda' ? 'Valor da venda' : 'Valor passado'} value={moeda(contrato.valor_venda || contrato.valor_principal)}/><Metric label="Status" value={statusLabel(contrato.status)}/>{contrato.tipo === 'emprestimo_tradicional' && <Metric label="Valor a receber" value={moeda(valorReceberEmprestimo)}/>} {contrato.tipo === 'venda' && <><Metric label="Entrada recebida" value={moeda(entrada)}/><Metric label="Valor parcelado" value={moeda(valorParcelado)}/></>}<Metric label={contrato.tipo === 'emprestimo_somente_juros' ? `Juros (${contrato.taxa_juros_mensal}%)` : 'Parcela'} value={moeda(contrato.valor_parcela || contrato.valor_juros_mensal)}/>{contrato.tipo === 'emprestimo_somente_juros' ? <Metric label="Recorrência" value={descricaoRecorrencia(contrato.periodicidade, contrato.dia_semana, contrato.dia_vencimento)}/> : <Metric label="Quantidade" value={`${contrato.qtd_parcelas || 'Recorrente'} · ${descricaoRecorrencia(contrato.periodicidade, contrato.dia_semana)}`}/>}</section>
    {contrato.tipo === 'venda' && <section className="sale-reconciliation"><span>Resumo da venda</span><b>{moeda(contrato.valor_venda)} − {moeda(entrada)} de entrada = {moeda(valorParcelado)} parcelados</b></section>}
    <section className="panel"><div className="panel-head"><div><span className="section-kicker">CRONOGRAMA</span><h2>Parcelas</h2></div><Link className="text-button" to="/cobrancas">Ver cobranças<Icon name="chevronRight" size={16}/></Link></div><div className="installments">{contrato.parcelas.map(parcela => <div key={parcela.id}><span>{parcela.numero || 'J'}</span><b>{moeda(parcela.valor)}</b><small>{dataBR(parcela.data_vencimento)}</small><i className={`status ${parcela.status}`}>{statusLabel(parcela.status)}</i>{parcela.status !== 'paga' ? <button type="button" className="installment-pay is-primary" onClick={() => setParcelaSelecionada(parcela)}>Dar baixa</button> : parcela.tipo !== 'quitacao_principal' ? <button type="button" className="installment-pay" onClick={() => setParcelaParaDesfazer(parcela)}>Desfazer baixa</button> : null}</div>)}</div></section>
    <BaixaModal parcela={parcelaSelecionada} onClose={() => setParcelaSelecionada(null)} onConfirm={baixarParcela}/>
    <DesfazerBaixaModal parcela={parcelaParaDesfazer} onClose={() => setParcelaParaDesfazer(null)} onConfirm={desfazerBaixa}/>
    <EditarContratoModal contrato={contrato} open={editando} onClose={() => setEditando(false)} onConfirm={editarContrato}/>
    <QuitarPrincipalModal contrato={contrato} open={quitando} onClose={() => setQuitando(false)} onConfirm={quitarContrato}/>
    <ConfirmActionModal open={confirmacao === 'concluir'} title="Concluir este contrato?" description="As cobranças ainda abertas serão encerradas. O histórico das parcelas já pagas continuará disponível." confirmLabel="Sim, concluir" onClose={() => setConfirmacao(null)} onConfirm={concluirContrato}/>
    <ConfirmActionModal open={confirmacao === 'excluir'} title="Excluir este contrato?" description="O contrato, suas parcelas e todo o histórico relacionado serão removidos definitivamente. Esta ação não pode ser desfeita." confirmLabel="Sim, excluir" tone="danger" onClose={() => setConfirmacao(null)} onConfirm={excluirContrato}/>
  </>;
}
const tipoLabel = (tipo: string) => tipo === 'venda' ? 'Venda parcelada' : tipo === 'emprestimo_tradicional' ? 'Empréstimo tradicional' : 'Empréstimo somente juros';
function Metric({ label, value }: { label: string; value: string }) { return <article className="metric gold"><div><span>{label}</span><strong>{value}</strong></div></article>; }
