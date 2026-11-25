import { Fragment, useCallback, useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Alert } from '../components/Alert';
import { apiDownload, apiRequest, compartilharOuBaixarPdf, type PageResponse } from '../lib/api';
import { iniciais, moeda } from '../lib/format';
import { Icon, type IconName } from '../components/Icon';
import { LoadingState } from '../components/LoadingState';

type Registro = { id: number; [key: string]: unknown };
type Recursos = Record<string, Registro[]>;
type Resultado = { entradas: string; saidas: string; saldo_periodo: string; recebido_emprestimos: string; capital_emprestado: string; lotes: { id: number; nome: string; receitas: string; despesas: string; resultado: string }[] };
type Campo = { nome: string; titulo: string; tipo?: string; opcoes?: [string, string][]; opcional?: boolean; valor?: string; min?: string };
type Acao = { titulo: string; recurso: string; campos: Campo[] };
const hoje = () => new Date().toLocaleDateString('en-CA');
const dataBR = (value: unknown) => String(value ?? '').split('-').reverse().join('/');
const dinheiro = (value: unknown) => moeda(String(value ?? 0));
const erroTexto = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir a operação.';

async function carregarTodos(path: string): Promise<Registro[]> {
  let url: string | null = path;
  const lista: Registro[] = [];
  while (url) {
    const pagina: PageResponse<Registro> = await apiRequest<PageResponse<Registro>>(url);
    lista.push(...pagina.results);
    url = pagina.next;
  }
  return lista;
}

export function OperacoesPage({ modulo }: { modulo: 'motos' | 'animais' | 'financeiro' }) {
  const [recursos, setRecursos] = useState<Recursos>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [acao, setAcao] = useState('');
  const [inicio, setInicio] = useState(() => `${hoje().slice(0, 7)}-01`);
  const [fim, setFim] = useState(hoje);
  const [revisao, setRevisao] = useState(0);
  const reload = useCallback(() => setRevisao(n => n + 1), []);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro('');
    const nomes = ['motos', 'animais', 'alugueis', 'movimentos'];
    Promise.all([
      Promise.all(nomes.map(nome => carregarTodos(`/operacoes/${nome}/?page_size=100`))),
      carregarTodos('/clientes/?page_size=100'),
      apiRequest<Resultado>(`/operacoes/financeiro/?inicio=${inicio}&fim=${fim}`),
    ]).then(([listas, clientes, resumo]) => {
      if (!ativo) return;
      setRecursos({ ...Object.fromEntries(nomes.map((nome, i) => [nome, listas[i]])), clientes });
      setResultado(resumo);
    }).catch(error => { if (ativo) { setErro(erroTexto(error)); setResultado(null); } })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [revisao, inicio, fim]);

  const opcoes = (recurso: string, label: string): [string, string][] => (recursos[recurso] || []).map(item => [String(item.id), String(item[label])]);
  const moto: Campo = { nome: 'moto', titulo: 'Moto', tipo: 'select', opcoes: opcoes('motos', 'placa') };
  const lote: Campo = { nome: 'lote', titulo: 'Lote ou animal', tipo: 'select', opcoes: opcoes('animais', 'identificacao') };
  const valor: Campo = { nome: 'valor', titulo: 'Valor (R$)', tipo: 'number', min: '0.01' };
  const data: Campo = { nome: 'data', titulo: 'Data do pagamento', tipo: 'date', valor: hoje() };
  const descricao: Campo = { nome: 'descricao', titulo: 'Descrição' };
  const acoes: Acao[] = modulo === 'motos' ? [
    { titulo: 'Cadastrar moto', recurso: 'motos', campos: [{ nome: 'placa', titulo: 'Placa' }, { nome: 'modelo', titulo: 'Modelo' }, { nome: 'em_manutencao', titulo: 'Disponibilidade inicial', tipo: 'select', opcoes: [['false', 'Disponível'], ['true', 'Em manutenção']] }, { nome: 'observacoes', titulo: 'Observações', opcional: true }] },
    { titulo: 'Novo aluguel', recurso: 'alugueis', campos: [moto, { nome: 'cliente', titulo: 'Cliente', tipo: 'select', opcoes: opcoes('clientes', 'nome') }, { nome: 'inicio', titulo: 'Início do aluguel', tipo: 'date', valor: hoje() }, { nome: 'fim', titulo: 'Término do aluguel', tipo: 'date' }, { ...valor, titulo: 'Valor por cobrança (R$)' }, { nome: 'periodicidade', titulo: 'Cobrança', tipo: 'select', opcoes: [['semanal', 'Semanal'], ['mensal', 'Mensal']] }, { nome: 'primeiro_vencimento', titulo: 'Primeiro vencimento', tipo: 'date', valor: hoje() }, { nome: 'observacoes', titulo: 'Observações', opcional: true }] },
    { titulo: 'Despesa da moto', recurso: 'movimentos', campos: [moto, descricao, { nome: 'categoria', titulo: 'Categoria', tipo: 'select', opcoes: [['manutencao', 'Manutenção'], ['multa', 'Multa'], ['outros', 'Outros']] }, valor, data] },
  ] : modulo === 'animais' ? [
    { titulo: 'Cadastrar animal ou lote', recurso: 'animais', campos: [{ nome: 'identificacao', titulo: 'Identificação do animal ou lote' }, { nome: 'especie', titulo: 'Espécie' }, { nome: 'quantidade', titulo: 'Quantidade de animais', tipo: 'number', min: '1', valor: '1' }, { nome: 'data_aquisicao', titulo: 'Data de aquisição', tipo: 'date', valor: hoje() }, { nome: 'valor_compra', titulo: 'Valor total da compra (R$)', tipo: 'number', min: '0', valor: '0' }, { nome: 'observacoes', titulo: 'Observações', opcional: true }] },
    { titulo: 'Despesa da criação', recurso: 'movimentos', campos: [lote, descricao, { nome: 'categoria', titulo: 'Categoria', tipo: 'select', opcoes: [['alimentacao', 'Alimentação'], ['medicamentos', 'Medicamentos'], ['veterinario', 'Veterinário'], ['manejo', 'Manejo'], ['outros', 'Outros']] }, valor, data] },
    { titulo: 'Receita da criação', recurso: 'movimentos', campos: [lote, descricao, { nome: 'categoria', titulo: 'Categoria', tipo: 'select', opcoes: [['venda_animais', 'Venda de animais'], ['outros', 'Outros']] }, valor, data] },
  ] : [
    { titulo: 'Lançamento geral', recurso: 'movimentos', campos: [descricao, { nome: 'tipo', titulo: 'Tipo', tipo: 'select', opcoes: [['saida', 'Despesa'], ['entrada', 'Receita']] }, valor, data] },
  ];
  const selecionada = acoes.find(item => item.titulo === acao);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selecionada) return;
    const form = event.currentTarget;
    const payload: Record<string, unknown> = Object.fromEntries(new FormData(form));
    if (payload.em_manutencao) payload.em_manutencao = payload.em_manutencao === 'true';
    if (selecionada.recurso === 'movimentos') {
      payload.tipo ||= acao === 'Receita da criação' ? 'entrada' : 'saida';
      payload.categoria ||= 'outros';
    }
    setSalvando(true); setErro(''); setSucesso('');
    try {
      await apiRequest(`/operacoes/${selecionada.recurso}/`, { method: 'POST', body: JSON.stringify(payload) });
      setAcao(''); setSucesso('Cadastro salvo.'); reload();
    } catch (error) { setErro(erroTexto(error)); }
    finally { setSalvando(false); }
  }

  async function receber(id: number) {
    setSalvando(true); setErro(''); setSucesso('');
    try {
      await apiRequest(`/operacoes/alugueis/cobrancas/${id}/receber/`, { method: 'POST', body: JSON.stringify({ data: hoje() }) });
      setSucesso('Pagamento recebido e lançado no caixa.'); reload();
    } catch (error) { setErro(erroTexto(error)); }
    finally { setSalvando(false); }
  }

  async function contratoAluguel(item: Registro) {
    setErro('');
    try { await compartilharOuBaixarPdf(await apiDownload(`/operacoes/alugueis/${item.id}/contrato/`), `contrato-locacao-${String(item.placa)}-${item.id}.pdf`); }
    catch (error) { setErro(erroTexto(error)); }
  }

  const movimentos = (recursos.movimentos || []).filter(item => modulo === 'motos' ? item.moto : modulo === 'animais' ? item.lote : String(item.data) >= inicio && String(item.data) <= fim);
  const iconeAcao = (titulo: string): IconName => titulo.startsWith('Despesa') ? 'trendDown' : titulo.startsWith('Receita') ? 'trendUp' : titulo === 'Novo aluguel' ? 'calendar' : titulo === 'Lançamento geral' ? 'wallet' : 'plus';
  return <>
    <PageHeader eyebrow="Operações" title={modulo === 'motos' ? 'Aluguel de motos' : modulo === 'animais' ? 'Criação de animais' : 'Financeiro'} description={modulo === 'motos' ? 'Cadastre a frota, reserve períodos e receba os aluguéis.' : modulo === 'animais' ? 'Acompanhe animais, despesas da criação e receitas por lote.' : 'Entradas e saídas realizadas no período, incluindo empréstimos, motos e criação.'}
      action={<button type="button" className="secondary" onClick={reload} disabled={carregando || salvando}><Icon name="refresh" size={18}/>Atualizar</button>}/>
    {erro && <Alert message={erro} onClose={() => setErro('')}/>}
    {sucesso && <Alert tone="success" message={sucesso} onClose={() => setSucesso('')}/>}
    <div className="action-grid">{acoes.map(item => <button type="button" className="action-tile" key={item.titulo} disabled={carregando || salvando} onClick={() => { setAcao(item.titulo); setSucesso(''); }}><span className="tile-icon"><Icon name={iconeAcao(item.titulo)}/></span><b>{item.titulo}</b></button>)}</div>

    <Sheet open={Boolean(selecionada)} title={acao} onClose={() => !salvando && setAcao('')}>
      {selecionada && <form onSubmit={salvar} key={acao}>
        <div className="field-grid">{selecionada.campos.map(campo => <label key={campo.nome} className={campo.nome === 'observacoes' || campo.nome === 'descricao' ? 'full-span' : undefined}><span>{campo.titulo}{campo.opcional ? ' (opcional)' : ''}</span>{campo.tipo === 'select' ? <select name={campo.nome} required={!campo.opcional} defaultValue=""><option value="">Selecione</option>{campo.opcoes?.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select> : <input name={campo.nome} type={campo.tipo || 'text'} inputMode={campo.tipo === 'number' ? 'decimal' : undefined} defaultValue={campo.valor || ''} required={!campo.opcional} min={campo.min} step={campo.nome === 'quantidade' ? '1' : campo.tipo === 'number' ? '0.01' : undefined} max={['data', 'data_aquisicao'].includes(campo.nome) ? hoje() : undefined}/>}</label>)}</div>
        {acao === 'Cadastrar animal ou lote' && <p className="note"><Icon name="alert" size={18}/>O valor da compra será lançado automaticamente como despesa do lote.</p>}
        {acao === 'Novo aluguel' && <p className="note"><Icon name="alert" size={18}/>O valor é cobrado por período, sem rateio. As cobranças são geradas até o término do contrato.</p>}
        <div className="modal-actions"><button type="button" className="ghost" disabled={salvando} onClick={() => setAcao('')}>Cancelar</button><button className="primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button></div>
      </form>}
    </Sheet>

    {carregando ? <LoadingState/> : !resultado ? <div className="panel empty"><span><Icon name="alert" size={22}/></span><h3>Não foi possível carregar</h3><p>Use Atualizar para tentar novamente.</p></div> : <>
      {modulo === 'financeiro' && <>
        <div className="panel period-filter"><label><span>De</span><input type="date" value={inicio} onChange={e => setInicio(e.target.value)}/></label><label><span>Até</span><input type="date" value={fim} onChange={e => setFim(e.target.value)}/></label></div>
        <section className="hero-card"><span className="hero-label"><Icon name="wallet" size={18}/>Saldo do período</span><strong className="hero-value">{dinheiro(resultado.saldo_periodo)}</strong><div className="hero-foot"><span>Recebido em empréstimos</span><b>{dinheiro(resultado.recebido_emprestimos)}</b></div><div className="hero-foot"><span>Capital emprestado</span><b>{dinheiro(resultado.capital_emprestado)}</b></div></section>
        <section className="metric-grid cols-3">
          <article className="metric green"><div className="metric-icon"><Icon name="arrowDown"/></div><div><span>Entradas</span><strong>{dinheiro(resultado.entradas)}</strong></div></article>
          <article className="metric red"><div className="metric-icon"><Icon name="arrowUp"/></div><div><span>Saídas</span><strong>{dinheiro(resultado.saidas)}</strong></div></article>
        </section>
        <p className="note"><Icon name="alert" size={18}/>O saldo mostra a movimentação de caixa, incluindo devolução de principal; não representa lucro.</p>
      </>}
      {modulo === 'motos' && <>
        <Lista titulo="Frota" itens={recursos.motos} vazio="Nenhuma moto cadastrada." render={item => <div className="list-row"><span className="client-avatar"><Icon name="bike"/></span><div className="list-main"><b>{String(item.placa)}</b><span>{String(item.modelo)}</span></div><span className={`status ${item.em_manutencao ? 'atrasada' : 'paga'}`}>{item.em_manutencao ? 'Manutenção' : 'Disponível'}</span></div>}/>
        <Lista titulo="Contratos de aluguel" itens={recursos.alugueis} vazio="Nenhum aluguel registrado." render={item => <div className="list-row"><span className="client-avatar">{iniciais(String(item.cliente_nome))}</span><div className="list-main"><b>{String(item.cliente_nome)} · {String(item.placa)}</b><span>{dataBR(item.inicio)} até {dataBR(item.fim)} · {dinheiro(item.valor)} / {String(item.periodicidade)}</span>
          <button type="button" className="contract-pdf-button contract-inline" onClick={() => void contratoAluguel(item)}><Icon name="file" size={16}/>Contrato de locação</button>
          <div className="sub-list">{(item.cobrancas as Registro[]).map(cobranca => { const pago = Boolean(cobranca.pago_em); const atrasado = !pago && String(cobranca.vencimento) < hoje(); return <div className="sub-row" key={cobranca.id}><span><b>{dinheiro(cobranca.valor)}</b>{pago ? `Pago em ${dataBR(cobranca.pago_em)}` : `Vence ${dataBR(cobranca.vencimento)}`}</span>{pago ? <span className="status paga">Pago</span> : <button type="button" className={`pay is-primary${atrasado ? ' late' : ''}`} disabled={salvando} onClick={() => receber(cobranca.id)}><Icon name="check" size={16}/>Receber</button>}</div>; })}</div>
        </div></div>}/>
      </>}
      {modulo === 'animais' && <>
        <Lista titulo="Animais e lotes" itens={recursos.animais} vazio="Nenhum lote cadastrado." render={item => <div className="list-row"><span className="client-avatar"><Icon name="paw"/></span><div className="list-main"><b>{String(item.identificacao)}</b><span>{String(item.quantidade)} animais · {String(item.especie)}</span></div><span className="list-trailing">{dinheiro(item.valor_compra)}</span></div>}/>
        <section className="panel"><div className="panel-head"><div><span className="section-kicker">Resultado acumulado</span><h2>Por animal ou lote</h2></div></div>
          {resultado.lotes.length ? resultado.lotes.map(item => <div className="list-row" key={item.id}><div className="list-main"><b>{item.nome}</b><span>Receitas {dinheiro(item.receitas)} · Despesas {dinheiro(item.despesas)}</span></div><span className={`list-trailing ${Number(item.resultado) < 0 ? 'out' : 'in'}`}>{dinheiro(item.resultado)}</span></div>) : <p className="list-empty">Nenhum lote cadastrado.</p>}
          <p className="note"><Icon name="alert" size={18}/>Inclui a compra e as despesas registradas. O valor dos animais ainda em criação não é tratado como receita.</p>
        </section>
      </>}
      <Lista titulo={modulo === 'financeiro' ? 'Lançamentos do período' : 'Receitas e despesas'} itens={movimentos} vazio="Nenhum lançamento por enquanto." render={item => <div className="list-row"><span className="client-avatar"><Icon name={item.tipo === 'entrada' ? 'arrowDown' : 'arrowUp'}/></span><div className="list-main"><b>{String(item.descricao)}</b><span>{dataBR(item.data)} · {String(item.referencia)}</span></div><span className={`list-trailing ${item.tipo === 'entrada' ? 'in' : 'out'}`}>{item.tipo === 'entrada' ? '+' : '−'} {dinheiro(item.valor)}</span></div>}/>
    </>}
  </>;
}

function Lista({ titulo, itens = [], vazio, render }: { titulo: string; itens?: Registro[]; vazio: string; render: (item: Registro) => React.ReactNode }) {
  return <section className="panel"><div className="panel-head"><h2>{titulo}</h2><span className="count-badge">{itens.length}</span></div>{itens.length ? itens.map(item => <Fragment key={item.id}>{render(item)}</Fragment>) : <p className="list-empty">{vazio}</p>}</section>;
}

function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const fechar = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', fechar); document.body.classList.add('modal-open');
    return () => { document.removeEventListener('keydown', fechar); document.body.classList.remove('modal-open'); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="modal-card ops-sheet" role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><div><h2>{title}</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><Icon name="x" size={18}/></button></div>{children}</div></div>;
}
