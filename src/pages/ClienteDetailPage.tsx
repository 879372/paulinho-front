import { AdiarCobrancaButton } from '../components/AdiarCobrancaButton';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { BaixaModal } from '../components/BaixaModal';
import { ClienteModal } from '../components/ClienteModal';
import { DesfazerBaixaModal } from '../components/DesfazerBaixaModal';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { apiDownload, apiRequest, compartilharOuBaixarPdf } from '../lib/api';
import { dataBR, formatarTelefone, moeda, statusLabel } from '../lib/format';
import { Icon } from '../components/Icon';
import { PdfLabel } from '../components/PdfLabel';
import type { Cliente, Contrato, Parcela } from '../types';

export function ClienteDetailPage() {
  const { id } = useParams(); const [cliente, setCliente] = useState<Cliente | null>(null); const [error, setError] = useState(''); const [parcelaSelecionada, setParcelaSelecionada] = useState<Parcela | null>(null); const [parcelaParaDesfazer, setParcelaParaDesfazer] = useState<Parcela | null>(null); const [baixandoRelatorio, setBaixandoRelatorio] = useState(false); const [editando, setEditando] = useState(false);
  useEffect(() => { apiRequest<Cliente>(`/clientes/${id}/`).then(setCliente).catch(e => setError(e.message)); }, [id]);
  if (error) return <Alert message={error}/>; if (!cliente) return <LoadingState/>;
  const contratos = cliente.contratos || [];
  async function baixarParcela(parcela: Parcela, dataPagamento: string, formaPagamento: 'pix' | 'dinheiro') {
    const atualizada = await apiRequest<Parcela>(`/parcelas/${parcela.id}/dar-baixa/`, { method: 'PATCH', body: JSON.stringify({ data_pagamento: dataPagamento, forma_pagamento: formaPagamento, valor_pago: parcela.valor }) });
    if (parcela.contrato_tipo === 'emprestimo_somente_juros') {
      setCliente(await apiRequest<Cliente>(`/clientes/${id}/`));
      return;
    }
    setCliente(current => current ? { ...current, contratos: current.contratos?.map(contrato => ({ ...contrato, parcelas: contrato.parcelas.map(item => item.id === atualizada.id ? { ...item, ...atualizada } : item) })) } : current);
  }
  async function baixarRelatorio() {
    setBaixandoRelatorio(true);
    try {
      const arquivo = await apiDownload(`/clientes/${cliente!.id}/relatorio/`);
      await compartilharOuBaixarPdf(arquivo, `relatorio-${cliente!.nome}.pdf`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBaixandoRelatorio(false);
    }
  }
  async function desfazerBaixa(parcela: Parcela) { try { await apiRequest(`/parcelas/${parcela.id}/desfazer-baixa/`, { method: 'PATCH' }); setCliente(await apiRequest<Cliente>(`/clientes/${id}/`)); } catch (e) { setError((e as Error).message); throw e; } }
  return <><PageHeader back="/clientes" eyebrow="Cliente" title={cliente.nome} description={formatarTelefone(cliente.telefone)} action={<><button className="secondary" onClick={() => setEditando(true)}><Icon name="edit" size={18}/>Editar</button><Link className="primary" to={`/contratos/novo?cliente=${cliente.id}`}><Icon name="plus" size={18}/>Novo contrato</Link></>}/><RelatorioCliente contratos={contratos} onBaixar={baixarRelatorio} baixando={baixandoRelatorio}/><section className="panel client-contracts"><div className="panel-head"><div><span className="section-kicker">HISTÓRICO FINANCEIRO</span><h2>Compras e parcelas</h2></div><span className="contract-count">{contratos.length} {contratos.length === 1 ? 'contrato' : 'contratos'}</span></div>{!contratos.length ? <div className="empty"><span><Icon name="file" size={22}/></span><h3>Nenhuma compra cadastrada</h3><p>Cadastre um contrato para acompanhar as parcelas deste cliente.</p></div> : <div className="client-contract-list">{contratos.map(contrato => <ContratoClienteCard key={contrato.id} contrato={contrato} onBaixa={setParcelaSelecionada} onDesfazerBaixa={setParcelaParaDesfazer}/>)}</div>}</section><BaixaModal parcela={parcelaSelecionada} onClose={() => setParcelaSelecionada(null)} onConfirm={baixarParcela}/><DesfazerBaixaModal parcela={parcelaParaDesfazer} onClose={() => setParcelaParaDesfazer(null)} onConfirm={desfazerBaixa}/><ClienteModal open={editando} cliente={cliente} onClose={() => setEditando(false)} onSaved={atualizado => { setCliente(atual => atual ? { ...atual, ...atualizado } : atualizado); setEditando(false); }}/></>;
}

const grupos = [
  { tipo: 'venda', titulo: 'Produtos' },
  { tipo: 'emprestimo_tradicional', titulo: 'Empréstimos' },
  { tipo: 'emprestimo_somente_juros', titulo: 'Empréstimos — somente juros' },
];

function valorQuitacao(contrato: Contrato) {
  if (['quitado', 'cancelado', 'renegociado'].includes(contrato.status)) return 0;
  if (contrato.tipo === 'emprestimo_somente_juros') return Number(contrato.valor_principal || 0);
  return contrato.parcelas.filter(parcela => ['pendente', 'atrasada'].includes(parcela.status)).reduce((total, parcela) => total + Number(parcela.valor), 0);
}

function progresso(contrato: Contrato) {
  const total = Number(contrato.qtd_parcelas || contrato.parcelas.length);
  const pagas = contrato.parcelas.filter(parcela => parcela.status === 'paga').length;
  return `${pagas}/${total}`;
}

function descricaoRelatorio(contrato: Contrato) {
  if (contrato.tipo === 'venda') return contrato.produto || 'Produto sem descrição';
  if (contrato.tipo === 'emprestimo_somente_juros') return `Valor emprestado ${moeda(Math.max(Number(contrato.valor_principal || 0) - Number(contrato.valor_juros_mensal || contrato.valor_parcela || 0), 0))}`;
  return `Valor emprestado ${moeda(contrato.valor_principal)}`;
}

function detalhesRelatorio(contrato: Contrato) {
  if (contrato.tipo === 'emprestimo_somente_juros') return `Juros ${moeda(contrato.valor_juros_mensal || contrato.valor_parcela)} · Quitação ${moeda(valorQuitacao(contrato))}`;
  return `${progresso(contrato)} parcelas · Parcela ${moeda(contrato.valor_parcela)} · Quitação ${moeda(valorQuitacao(contrato))}`;
}

function RelatorioCliente({ contratos, onBaixar, baixando }: { contratos: Contrato[]; onBaixar: () => void; baixando: boolean }) {
  const totalQuitacao = contratos.reduce((total, contrato) => total + valorQuitacao(contrato), 0);
  return <section className="panel client-report"><div className="panel-head"><div><span className="section-kicker">RELATÓRIO DO CLIENTE</span><h2>Resumo de todos os contratos</h2></div><button type="button" className="contract-pdf-button" onClick={onBaixar} disabled={baixando}><Icon name="file" size={16}/>{baixando ? 'Gerando...' : <PdfLabel documento="relatório PDF"/>}</button></div>{!contratos.length ? <p className="client-report-empty">O resumo aparecerá quando o cliente tiver contratos.</p> : <><div className="client-report-total"><span>Total para quitar todos os contratos</span><strong>{moeda(totalQuitacao)}</strong></div><div className="client-report-groups">{grupos.map(grupo => { const itens = contratos.filter(contrato => contrato.tipo === grupo.tipo); return itens.length ? <div className="client-report-group" key={grupo.tipo}><h3>{grupo.titulo}<span>{itens.length}</span></h3>{itens.map(contrato => <Link className="client-report-item" to={`/contratos/${contrato.id}`} key={contrato.id}><span><b>{descricaoRelatorio(contrato)}</b><small>{detalhesRelatorio(contrato)}</small></span><i className={`status ${contrato.status}`}>{statusLabel(contrato.status)}</i></Link>)}</div> : null; })}</div></>}</section>;
}

function ContratoClienteCard({ contrato, onBaixa, onDesfazerBaixa }: { contrato: Contrato; onBaixa: (parcela: Parcela) => void; onDesfazerBaixa: (parcela: Parcela) => void }) {
  const [baixando, setBaixando] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const titulo = contrato.produto || (contrato.tipo === 'venda' ? 'Venda parcelada' : contrato.tipo === 'emprestimo_tradicional' ? 'Empréstimo tradicional' : 'Empréstimo somente juros');
  const valor = contrato.valor_venda || contrato.valor_principal;
  const entrada = Number(contrato.valor_entrada || 0);
  const valorParcelado = contrato.valor_venda ? Number(contrato.valor_venda) - entrada : 0;
  const valorReceber = Number(contrato.valor_parcela || 0) * Number(contrato.qtd_parcelas || 0);
  async function baixarComprovante() {
    setBaixando(true);
    setDownloadError('');
    try {
      const arquivo = await apiDownload(`/contratos/${contrato.id}/comprovante/`);
      await compartilharOuBaixarPdf(arquivo, `comprovante-${contrato.id}.pdf`);
    } catch (e) {
      setDownloadError((e as Error).message);
    } finally {
      setBaixando(false);
    }
  }
  return <article className="client-contract-card"><div className="client-contract-head"><div><span className="contract-type">{contrato.tipo === 'venda' ? 'COMPRA' : 'CONTRATO'}</span><Link to={`/contratos/${contrato.id}`}>{titulo}</Link><small>Iniciado em {dataBR(contrato.data_inicio)}</small></div><div className="client-contract-actions"><span className={`status ${contrato.status}`}>{statusLabel(contrato.status)}</span><button type="button" className="contract-pdf-button" onClick={baixarComprovante} disabled={baixando}><Icon name="share" size={16}/>{baixando ? 'Gerando...' : <PdfLabel documento="comprovante PDF"/>}</button></div></div>{downloadError && <div className="contract-download-error"><Alert message={downloadError} onClose={() => setDownloadError('')}/></div>}<div className="client-contract-data"><div><span>{contrato.tipo === 'emprestimo_somente_juros' ? 'Valor a receber' : contrato.tipo === 'venda' ? 'Valor da venda' : 'Valor passado'}</span><b>{moeda(valor)}</b></div>{contrato.tipo === 'venda' && <><div className="entry-value"><span>Entrada recebida</span><b>{moeda(entrada)}</b></div><div><span>Valor parcelado</span><b>{moeda(valorParcelado)}</b></div></>}{contrato.tipo === 'emprestimo_tradicional' && <div><span>Valor a receber</span><b>{moeda(valorReceber)}</b></div>}<div><span>Parcelas</span><b>{contrato.tipo === 'emprestimo_somente_juros' ? 'Recorrente' : `${contrato.qtd_parcelas || 'Recorrente'} × ${moeda(contrato.valor_parcela)}`}</b></div></div><div className="client-installments"><span className="installments-title">Parcelas</span>{contrato.parcelas.length ? contrato.parcelas.map(parcela => <div className="client-installment" key={parcela.id}><span>{parcela.numero ? `Parcela ${parcela.numero}` : parcela.tipo === 'juros_mensal' ? 'Juros' : 'Saldo prorrogado'}</span><span>{dataBR(parcela.data_vencimento)}</span><b>{moeda(parcela.valor)}</b><i className={`status ${parcela.status}`}>{statusLabel(parcela.status)}</i>{['pendente', 'atrasada'].includes(parcela.status) ? <div className="payment-actions"><button type="button" className="installment-pay is-primary" onClick={() => onBaixa(parcela)}>Dar baixa</button>{parcela.tipo !== 'quitacao_principal' && <AdiarCobrancaButton id={parcela.id}/>}</div> : parcela.status === 'paga' && parcela.tipo !== 'quitacao_principal' ? <button type="button" className="installment-pay" onClick={() => onDesfazerBaixa(parcela)}>Desfazer baixa</button> : null}</div>) : <p>Nenhuma parcela gerada.</p>}</div></article>;
}
