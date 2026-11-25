import { useEffect, useState } from 'react';
import { apiRequest, type PageResponse } from '../lib/api';
import { dataBR, iniciais, moeda, statusLabel } from '../lib/format';
import { Alert } from './Alert';
import { Icon } from './Icon';

type Cobranca = { id: number; aluguel: number; cliente_nome: string; placa: string; vencimento: string; valor: string; pago_em: string | null; status: 'paga' | 'pendente' | 'atrasada' };
const hoje = () => new Date().toLocaleDateString('en-CA');

export function CobrancasAluguel({ busca, statuses }: { busca: string; statuses: string[] }) {
  const [pagina, setPagina] = useState<PageResponse<Cobranca> | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [revisao, setRevisao] = useState(0);
  const [selecionada, setSelecionada] = useState<Cobranca | null>(null);
  const [data, setData] = useState(hoje);
  const [salvando, setSalvando] = useState(false);
  const filtros = new URLSearchParams({ busca, status: statuses.join(','), page_size: '30' }).toString();

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setPagina(null);
    const timer = window.setTimeout(() => {
      apiRequest<PageResponse<Cobranca>>(`/operacoes/alugueis/cobrancas/?${filtros}`)
        .then(dados => { if (ativo) { setPagina(dados); setErro(''); } })
        .catch(error => { if (ativo) setErro((error as Error).message); })
        .finally(() => { if (ativo) setCarregando(false); });
    }, 300);
    return () => { ativo = false; window.clearTimeout(timer); };
  }, [filtros, revisao]);

  async function receber() {
    if (!selecionada) return;
    setSalvando(true); setErro('');
    try {
      await apiRequest(`/operacoes/alugueis/cobrancas/${selecionada.id}/receber/`, { method: 'POST', body: JSON.stringify({ data }) });
      setSelecionada(null); setRevisao(n => n + 1);
    } catch (error) { setErro((error as Error).message); }
    finally { setSalvando(false); }
  }

  async function mais() {
    if (!pagina?.next || carregando) return;
    const proxima = pagina.next;
    setCarregando(true);
    try {
      const dados = await apiRequest<PageResponse<Cobranca>>(proxima);
      setPagina(atual => atual?.next === proxima ? { ...dados, results: [...atual.results, ...dados.results] } : atual);
    } catch (error) { setErro((error as Error).message); }
    finally { setCarregando(false); }
  }

  return <section className="panel">
    <div className="panel-head"><div><span className="section-kicker">Motos</span><h2>Cobranças de aluguel</h2></div>{pagina && <span className="count-badge">{pagina.count}</span>}</div>
    {erro && !selecionada && <Alert message={erro} onClose={() => setErro('')}/>}
    {pagina?.results.map(item => <article className="debt-row" key={item.id}>
      <div className="client-avatar">{iniciais(item.cliente_nome)}</div>
      <div className="client-info"><b>{item.cliente_nome}</b><span>Aluguel · {item.placa}</span></div>
      <div className="amount"><b>{moeda(item.valor)}</b><span className={`status ${item.status}`}>{statusLabel(item.status)}</span></div>
      <div className="debt-foot"><span className={`due${item.status === 'atrasada' ? ' late' : ''}`}><Icon name="clock" size={16}/>{dataBR(item.vencimento)}</span>{item.pago_em ? <span className="due">Pago em {dataBR(item.pago_em)}</span> : <button type="button" className="pay is-primary" onClick={() => { setData(hoje()); setErro(''); setSelecionada(item); }}><Icon name="check" size={16}/>Receber</button>}</div>
    </article>)}
    {!carregando && pagina?.count === 0 && <div className="empty"><span><Icon name="check"/></span><h3>Nenhuma cobrança de aluguel</h3><p>Nenhum aluguel encontrado para esses filtros.</p></div>}
    <div className="load-more">{carregando ? <span className="spinner"/> : pagina?.next ? <button type="button" className="secondary" onClick={() => void mais()}>Carregar mais aluguéis</button> : null}</div>
    {selecionada && <div className="modal-backdrop"><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="receber-aluguel-titulo">
      <div className="modal-head"><h2 id="receber-aluguel-titulo">Receber aluguel</h2><button type="button" disabled={salvando} onClick={() => setSelecionada(null)} aria-label="Fechar"><Icon name="x"/></button></div>
      <p>{selecionada.cliente_nome} · {selecionada.placa}</p><p><b>{moeda(selecionada.valor)}</b> · Vencimento {dataBR(selecionada.vencimento)}</p>
      {erro && <Alert message={erro}/>}
      <label><span>Data do pagamento</span><input type="date" required max={hoje()} value={data} onChange={e => setData(e.target.value)}/></label>
      <div className="modal-actions"><button type="button" className="ghost" disabled={salvando} onClick={() => setSelecionada(null)}>Cancelar</button><button type="button" className="primary" disabled={salvando || !data || data > hoje()} onClick={() => void receber()}>{salvando ? 'Salvando...' : 'Confirmar recebimento'}</button></div>
    </div></div>}
  </section>;
}
