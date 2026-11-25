import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { ClienteModal } from '../components/ClienteModal';
import { PageHeader } from '../components/PageHeader';
import { Icon, type IconName } from '../components/Icon';
import { apiRequest, type PageResponse } from '../lib/api';
import { campoBRLParaDecimal, formatarCampoBRL, moeda } from '../lib/format';
import { DiaSemanaSelect, diaSemanaDaData, proximaDataNoDia } from '../lib/recorrencia';
import type { Cliente, Contrato } from '../types';

type FormData = Record<string, string | number | boolean>;
type FormChanges = Record<string, string | number | boolean>;
type CalculoPor = 'valor_venda' | 'valor_parcela';
type Etapa = 'origem' | 'modalidade' | 'formulario';

const hoje = new Date().toISOString().slice(0, 10);
const proximoMes = () => {
  const data = new Date();
  data.setMonth(data.getMonth() + 1);
  return data.toISOString().slice(0, 10);
};
const numero = (value: unknown) => Number(value || 0);
const decimal = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function MoneyInput({ value, onChange, onFocus, required = true, placeholder = 'R$ 0,00' }: { value: FormData[string]; onChange: (decimalValue: string) => void; onFocus?: () => void; required?: boolean; placeholder?: string }) {
  return <input required={required} type="text" inputMode="numeric" value={formatarCampoBRL(value)} onFocus={onFocus} onChange={event => onChange(campoBRLParaDecimal(event.target.value))} placeholder={placeholder}/>;
}

export function NovoContratoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [etapa, setEtapa] = useState<Etapa>('origem');
  const [origem, setOrigem] = useState<'novo' | 'importado'>('novo');
  const [tipo, setTipo] = useState('emprestimo_tradicional');
  const [calculoPor, setCalculoPor] = useState<CalculoPor>('valor_venda');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clienteModal, setClienteModal] = useState(false);
  const [data, setData] = useState<FormData>({
    cliente: searchParams.get('cliente') || '',
    data_inicio: hoje,
    data_primeira_parcela: proximoMes(),
    teve_entrada: false,
    valor_entrada: '',
    qtd_parcelas: 10,
    periodicidade: 'mensal',
    dia_semana: '',
    valor_venda: '',
    valor_parcela: '',
    valor_juros_mensal: '',
    calcular_emprestimo_por: 'taxa',
    observacoes: '',
  });

  useEffect(() => {
    apiRequest<PageResponse<Cliente>>('/clientes/?page_size=100')
      .then(response => setClientes(response.results))
      .catch(e => setError(e.message));
  }, []);

  const entrada = data.teve_entrada ? numero(data.valor_entrada) : 0;
  const valorParcelar = Math.max(0, numero(data.valor_venda) - entrada);

  const update = (field: string, value: string | number | boolean) => {
    setData(current => ({ ...current, [field]: value }));
  };

  const recalcular = (changes: FormChanges, modo = calculoPor) => {
    setData(current => {
      const next = { ...current, ...changes };
      const parcelas = numero(next.qtd_parcelas);
      const valorEntrada = next.teve_entrada ? numero(next.valor_entrada) : 0;
      if (parcelas > 0 && modo === 'valor_venda') {
        next.valor_parcela = decimal(Math.max(0, numero(next.valor_venda) - valorEntrada) / parcelas) || '';
      }
      if (parcelas > 0 && modo === 'valor_parcela') {
        next.valor_venda = decimal(numero(next.valor_parcela) * parcelas + valorEntrada) || '';
      }
      return next;
    });
  };

  const trocarModo = (modo: CalculoPor) => {
    setCalculoPor(modo);
    recalcular({}, modo);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...data, origem, tipo, cliente: Number(data.cliente), calcular_por: calculoPor, valor_entrada: data.teve_entrada ? data.valor_entrada || 0 : 0 };
      const contrato = await apiRequest<Contrato>('/contratos/', { method: 'POST', body: JSON.stringify(payload) });
      navigate(`/contratos/${contrato.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const escolherModalidade = (modalidade: string) => {
    setTipo(modalidade);
    if (modalidade === 'emprestimo_somente_juros' && data.periodicidade === 'quinzenal') update('periodicidade', 'mensal');
    setError('');
    setEtapa('formulario');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const escolherOrigem = (value: 'novo' | 'importado') => {
    setOrigem(value);
    setEtapa('modalidade');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (etapa === 'origem') {
    return <>
      <StepHeader step={1}/>
      <PageHeader eyebrow="Nova operação" title="Como deseja cadastrar?" description="Escolha entre uma operação nova ou um contrato que já está em andamento."/>
      <section className="modality-step"><div className="modality-intro"><h2>Selecione o tipo de cadastro</h2><p>Essa escolha define como o histórico das parcelas será criado.</p></div><div className="modality-grid origin-grid"><ModalityCard icon="plus" title="Contrato novo" text="Operação feita agora. Todas as parcelas começam pendentes." onClick={() => escolherOrigem('novo')}/><ModalityCard icon="history" title="Contrato em andamento" text="Importe uma operação antiga com parcelas já pagas." onClick={() => escolherOrigem('importado')}/></div></section>
    </>;
  }

  if (etapa === 'modalidade') {
    return <>
      <StepHeader step={2} onBack={() => setEtapa('origem')}/>
      <PageHeader eyebrow={origem === 'importado' ? 'CONTRATO EM ANDAMENTO' : 'CONTRATO NOVO'} title="O que você deseja cadastrar?" description="Escolha uma modalidade para continuar."/>
      {error && <Alert message={error}/>} 
      <section className="modality-step" aria-label="Seleção da modalidade">
        <div className="modality-intro"><h2>Selecione a modalidade</h2><p>O formulário será preparado apenas com os campos necessários.</p></div>
        <div className="modality-grid">
          <ModalityCard icon="money" title="Empréstimo tradicional" text="Valor passado e juros distribuídos em parcelas fixas." onClick={() => escolherModalidade('emprestimo_tradicional')}/>
          {origem === 'novo' && <ModalityCard icon="percent" title="Somente juros" text="Cobrança mensal ou semanal de juros com o valor da quitação em aberto." onClick={() => escolherModalidade('emprestimo_somente_juros')}/>}
        </div>
      </section>
    </>;
  }

  return <>
    <StepHeader step={3} onBack={() => setEtapa('modalidade')} backLabel="Modalidades"/>
    <PageHeader eyebrow={tipo === 'venda' ? 'VENDA PARCELADA' : 'EMPRÉSTIMO'} title={tipo === 'venda' ? 'Nova venda' : tipo === 'emprestimo_tradicional' ? 'Novo empréstimo tradicional' : 'Novo empréstimo somente juros'} description="Preencha os dados e gere as parcelas automaticamente."/>
    <form className="contract-form sale-form" onSubmit={submit}>
      {error && <Alert message={error}/>} 
      {tipo === 'venda' ? <VendaFields data={data} clientes={clientes} calculoPor={calculoPor} valorParcelar={valorParcelar} update={update} recalcular={recalcular} trocarModo={trocarModo} onNovoCliente={() => setClienteModal(true)}/> : <EmprestimoFields tipo={tipo} data={data} clientes={clientes} update={update} onNovoCliente={() => setClienteModal(true)}/>} 

      {origem === 'importado' && <HistoricoFields data={data} update={update}/>} 

      <div className="form-section"><div className="section-number">2</div><div className="form-content"><h3>Observações</h3><p>Inclua informações úteis sobre esta operação.</p><label className="full-field"><span>Observações</span><textarea rows={4} value={String(data.observacoes)} onChange={e => update('observacoes', e.target.value)} placeholder="Ex: condições combinadas para o pagamento..."/></label></div></div>
      <div className="form-actions"><button type="button" className="ghost" onClick={() => navigate(-1)}>Cancelar</button><button className="primary" disabled={saving}>{saving ? 'Salvando...' : tipo === 'venda' ? 'Salvar venda' : 'Salvar e gerar parcelas'}</button></div>
    </form><ClienteModal open={clienteModal} onClose={() => setClienteModal(false)} onSaved={cliente => { setClientes(lista => [cliente, ...lista]); update('cliente', cliente.id); setClienteModal(false); }}/>
  </>;
}

function VendaFields({ data, clientes, calculoPor, valorParcelar, update, recalcular, trocarModo, onNovoCliente }: { data: FormData; clientes: Cliente[]; calculoPor: CalculoPor; valorParcelar: number; update: (field: string, value: string | number | boolean) => void; recalcular: (changes: FormChanges, modo?: CalculoPor) => void; trocarModo: (modo: CalculoPor) => void; onNovoCliente: () => void }) {
  return <div className="form-section"><div className="section-number">1</div><div className="form-content"><h3>Dados da venda</h3><p>Informe o produto, os valores e as condições de pagamento.</p><div className="field-grid">
    <ClienteSelect clientes={clientes} value={data.cliente} onChange={value => update('cliente', value)} onNovoCliente={onNovoCliente}/>
    <label><span>Produto vendido</span><input required value={String(data.produto || '')} onChange={e => update('produto', e.target.value)} placeholder="Ex: iPhone 13 128GB"/></label>
    <label><span>Valor da venda</span><MoneyInput value={data.valor_venda} onFocus={() => trocarModo('valor_venda')} onChange={value => recalcular({ valor_venda: value }, 'valor_venda')}/><small>Total cobrado do cliente</small></label>
    <div className="entry-field"><span>Teve entrada?</span><div className="segmented"><button type="button" className={!data.teve_entrada ? 'selected' : ''} onClick={() => recalcular({ teve_entrada: false, valor_entrada: '' })}>Não</button><button type="button" className={data.teve_entrada ? 'selected' : ''} onClick={() => recalcular({ teve_entrada: true })}>Sim</button></div></div>
    {Boolean(data.teve_entrada) && <label><span>Valor da entrada</span><MoneyInput value={data.valor_entrada} onChange={value => recalcular({ valor_entrada: value })}/></label>}
  </div>
  <div className="installment-summary"><div><span>Valor a parcelar</span><strong>{moeda(valorParcelar)}</strong></div><small>Valor da venda menos a entrada</small></div>
  <div className="field-grid installment-grid">
    <label><span>Nº de parcelas</span><input required type="number" min="1" max="120" value={String(data.qtd_parcelas)} onChange={e => recalcular({ qtd_parcelas: e.target.value })}/></label>
    <label><span>Valor da parcela</span><MoneyInput value={data.valor_parcela} onFocus={() => trocarModo('valor_parcela')} onChange={value => recalcular({ valor_parcela: value }, 'valor_parcela')}/><small>{calculoPor === 'valor_parcela' ? 'A venda será calculada por este valor' : 'Calculado pelo valor da venda'}</small></label>
    <label><span>Periodicidade</span><select value={String(data.periodicidade)} onChange={e => { update('periodicidade', e.target.value); if (e.target.value === 'semanal') update('dia_semana', diaSemanaDaData(String(data.data_primeira_parcela))); }}><option value="mensal">Mensal</option><option value="quinzenal">Quinzenal</option><option value="semanal">Semanal</option></select></label>
    {data.periodicidade === 'semanal' && <DiaSemanaSelect value={String(data.dia_semana || '')} onChange={value => { update('dia_semana', value); update('data_primeira_parcela', proximaDataNoDia(value)); }} hint="As parcelas vencem toda semana neste dia"/>}
    <label><span>Data da venda</span><input required type="date" value={String(data.data_inicio)} onChange={e => update('data_inicio', e.target.value)}/></label>
    <label><span>1º vencimento</span><input required type="date" value={String(data.data_primeira_parcela)} onChange={e => { update('data_primeira_parcela', e.target.value); if (data.periodicidade === 'semanal') update('dia_semana', diaSemanaDaData(e.target.value)); }}/></label>
  </div></div></div>;
}

function EmprestimoFields({ tipo, data, clientes, update, onNovoCliente }: { tipo: string; data: FormData; clientes: Cliente[]; update: (field: string, value: string | number | boolean) => void; onNovoCliente: () => void }) {
  const modo = String(data.calcular_emprestimo_por || 'taxa');
  const recalcularTradicional = (changes: FormChanges, novoModo = modo) => {
    const next = { ...data, ...changes }; const principal = numero(next.valor_principal); const parcelas = numero(next.qtd_parcelas);
    Object.entries(changes).forEach(([campo, valor]) => update(campo, valor));
    if (tipo !== 'emprestimo_tradicional' || principal <= 0 || parcelas <= 0) return;
    if (novoModo === 'taxa') update('valor_parcela', decimal(principal * (1 + numero(next.taxa_juros_mensal) / 100 * parcelas) / parcelas) || '');
    else update('taxa_juros_mensal', decimal(((numero(next.valor_parcela) * parcelas / principal) - 1) * 100 / parcelas) || '');
  };
  const totalReceber = numero(data.valor_parcela) * numero(data.qtd_parcelas);
  return <div className="form-section"><div className="section-number">1</div><div className="form-content"><h3>Dados do empréstimo</h3><p>Informe o cliente, {tipo === 'emprestimo_somente_juros' ? 'o montante a receber na quitação' : 'o valor passado'} e as condições.</p><div className="field-grid"><ClienteSelect clientes={clientes} value={data.cliente} onChange={value => update('cliente', value)} onNovoCliente={onNovoCliente}/><label><span>{tipo === 'emprestimo_somente_juros' ? 'Valor a receber' : 'Valor passado'}</span><MoneyInput value={data.valor_principal} onChange={value => tipo === 'emprestimo_tradicional' ? recalcularTradicional({ valor_principal: value }) : update('valor_principal', value)}/>{tipo === 'emprestimo_somente_juros' && <small>Montante que será cobrado na quitação</small>}</label>{tipo === 'emprestimo_somente_juros' ? <><label><span>Juros ao mês (%)</span><input required type="number" min="0.001" step=".001" value={String(data.taxa_juros_mensal || '')} onChange={e => update('taxa_juros_mensal', e.target.value)} placeholder="Ex: 10%"/><small>Percentual informativo, sem cálculo automático</small></label><label><span>Valor da parcela de juros</span><MoneyInput value={data.valor_juros_mensal} onChange={value => update('valor_juros_mensal', value)}/><small>Valor que será cobrado {data.periodicidade === 'semanal' ? 'semanalmente' : 'mensalmente'}</small></label><label><span>Periodicidade</span><select value={String(data.periodicidade)} onChange={e => update('periodicidade', e.target.value)}><option value="mensal">Mensal</option><option value="semanal">Semanal</option></select></label>{data.periodicidade === 'semanal' ? <DiaSemanaSelect value={String(data.dia_semana || '')} onChange={value => update('dia_semana', value)} hint="A primeira cobrança será no próximo dia escolhido"/> : <label><span>Dia do vencimento</span><input required type="number" min="1" max="31" value={String(data.dia_vencimento || '')} onChange={e => update('dia_vencimento', e.target.value)} placeholder="Ex: 15"/><small>Se já passou neste mês, a primeira cobrança será no mês seguinte</small></label>}</> : <><label><span>Juros {data.periodicidade === 'semanal' ? 'por semana' : data.periodicidade === 'quinzenal' ? 'por quinzena' : 'ao mês'} (%)</span><input required={modo === 'taxa'} type="number" min="0.001" step=".001" value={String(data.taxa_juros_mensal || '')} onFocus={() => update('calcular_emprestimo_por', 'taxa')} onChange={e => { update('calcular_emprestimo_por', 'taxa'); recalcularTradicional({ taxa_juros_mensal: e.target.value }, 'taxa'); }} placeholder="Ex: 10%"/><small>Ao digitar, o valor da parcela é atualizado</small></label><label><span>Nº de parcelas</span><input required type="number" min="1" value={String(data.qtd_parcelas)} onChange={e => recalcularTradicional({ qtd_parcelas: e.target.value })}/><small>Inicia com 10 parcelas</small></label><label><span>Valor da parcela</span><MoneyInput value={data.valor_parcela} onFocus={() => update('calcular_emprestimo_por', 'valor_parcela')} onChange={value => { update('calcular_emprestimo_por', 'valor_parcela'); recalcularTradicional({ valor_parcela: value }, 'valor_parcela'); }}/><small>Ao digitar, a porcentagem é atualizada</small></label><label><span>Periodicidade</span><select value={String(data.periodicidade)} onChange={e => { update('periodicidade', e.target.value); if (e.target.value === 'semanal') update('dia_semana', diaSemanaDaData(String(data.data_primeira_parcela))); }}><option value="mensal">Mensal</option><option value="quinzenal">Quinzenal</option><option value="semanal">Semanal</option></select></label>{data.periodicidade === 'semanal' && <DiaSemanaSelect value={String(data.dia_semana || '')} onChange={value => { update('dia_semana', value); update('data_primeira_parcela', proximaDataNoDia(value)); }} hint="As parcelas vencem toda semana neste dia"/>}<label><span>1º vencimento</span><input required type="date" value={String(data.data_primeira_parcela)} onChange={e => { update('data_primeira_parcela', e.target.value); if (data.periodicidade === 'semanal') update('dia_semana', diaSemanaDaData(e.target.value)); }}/></label></>}</div>{tipo === 'emprestimo_tradicional' && numero(data.taxa_juros_mensal) > 0 && numero(data.valor_parcela) > 0 && numero(data.qtd_parcelas) > 0 && <div className="installment-summary"><div><span>Valor a receber</span><strong>{moeda(totalReceber)}</strong></div><small>{data.qtd_parcelas} parcelas {data.periodicidade === 'semanal' ? 'semanais' : data.periodicidade === 'quinzenal' ? 'quinzenais' : 'mensais'} de {moeda(data.valor_parcela)}</small></div>}</div></div>;
}

function HistoricoFields({ data, update }: { data: FormData; update: (field: string, value: string | number | boolean) => void }) {
  const total = numero(data.qtd_parcelas);
  const pagas = numero(data.qtd_parcelas_pagas);
  const restantes = Math.max(0, total - pagas);
  return <div className="form-section history-section"><div className="section-number">2</div><div className="form-content"><h3>Histórico do contrato</h3><p>Informe o que já foi pago antes da entrada no sistema.</p><div className="field-grid"><label><span>Parcelas já pagas</span><input required type="number" min="0" max={total || undefined} value={String(data.qtd_parcelas_pagas || '')} onChange={e => update('qtd_parcelas_pagas', e.target.value)} placeholder="Ex: 4"/></label>{pagas > 0 && <><label><span>Data do último pagamento</span><input type="date" value={String(data.data_ultimo_pagamento || '')} onChange={e => update('data_ultimo_pagamento', e.target.value)}/></label><label><span>Forma dos pagamentos anteriores</span><select required value={String(data.forma_pagamento_historico || '')} onChange={e => update('forma_pagamento_historico', e.target.value)}><option value="">Selecione</option><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option></select></label></>}</div><div className="history-summary"><div><span>Total</span><b>{total}</b></div><div className="paid"><span>Pagas</span><b>{pagas}</b></div><div><span>Restantes</span><b>{restantes}</b></div></div></div></div>;
}

function ClienteSelect({ clientes, value, onChange, onNovoCliente }: { clientes: Cliente[]; value: FormData[string]; onChange: (value: string) => void; onNovoCliente: () => void }) { return <label className="client-select-field"><span>Cliente</span><select required value={String(value || '')} onChange={e => onChange(e.target.value)}><option value="">Selecione o cliente</option>{clientes.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.nome} · {cliente.telefone}</option>)}</select><button type="button" className="inline-create" onClick={onNovoCliente}>Cliente não cadastrado? <b>Cadastrar agora</b></button></label>; }
function ModalityCard({ icon, title, text, onClick }: { icon: IconName; title: string; text: string; onClick: () => void }) { return <button type="button" className="modality-card" onClick={onClick}><span className="modality-icon"><Icon name={icon} size={22}/></span><div><b>{title}</b><p>{text}</p></div><Icon name="chevronRight"/></button>; }
function StepHeader({ step, onBack, backLabel = 'Voltar' }: { step: number; onBack?: () => void; backLabel?: string }) { return <div className="step-header"><div className="form-step-header">{onBack ? <button type="button" className="back-button" onClick={onBack}><Icon name="arrowLeft" size={18}/>{backLabel}</button> : <span className="step-spacer"/>}<span>Etapa {step} de 3</span></div><div className="step-bar" aria-hidden="true">{[1, 2, 3].map(n => <i key={n} className={n <= step ? 'done' : ''}/>)}</div></div>; }
