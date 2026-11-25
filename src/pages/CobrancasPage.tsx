import { useEffect, useRef, useState } from 'react';
import { Alert } from '../components/Alert';
import { PageHeader } from '../components/PageHeader';
import { ParcelaList } from '../components/ParcelaList';
import { CobrancasAluguel } from '../components/CobrancasAluguel';
import { Icon } from '../components/Icon';
import { usePaginatedParcelas } from '../hooks/usePaginatedParcelas';
import { apiRequest } from '../lib/api';
import type { Parcela } from '../types';

const options = [{ value: 'atrasada', label: 'Em atraso' }, { value: 'pendente', label: 'Pendente' }, { value: 'paga', label: 'Paga' }];

export function CobrancasPage() {
  const [busca, setBusca] = useState(''); const [statuses, setStatuses] = useState(['atrasada', 'pendente']); const [statusOpen, setStatusOpen] = useState(false); const parcelas = usePaginatedParcelas('atrasada,pendente', false); const first = useRef(true);
  useEffect(() => { const timer = window.setTimeout(() => parcelas.load({ status: statuses.join(','), busca }), first.current ? 0 : 450); first.current = false; return () => window.clearTimeout(timer); }, [busca, statuses]);
  const toggle = (value: string) => setStatuses(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  const label = statuses.length ? statuses.map(value => options.find(item => item.value === value)?.label).join(', ') : 'Todos os status';
  async function baixa(parcela: Parcela, dataPagamento: string, formaPagamento: 'pix' | 'dinheiro') { try { await apiRequest(`/parcelas/${parcela.id}/dar-baixa/`, { method: 'PATCH', body: JSON.stringify({ data_pagamento: dataPagamento, forma_pagamento: formaPagamento, valor_pago: parcela.valor }) }); parcelas.remove(parcela.id); } catch (e) { parcelas.setError((e as Error).message); throw e; } }
  async function desfazerBaixa(parcela: Parcela) { try { await apiRequest(`/parcelas/${parcela.id}/desfazer-baixa/`, { method: 'PATCH' }); await parcelas.load({ status: statuses.join(','), busca }); } catch (e) { parcelas.setError((e as Error).message); throw e; } }
  const filters = { status: statuses.join(','), busca };
  return <><PageHeader eyebrow="Carteira" title="Cobranças" description="Encontre parcelas, acompanhe vencimentos e registre pagamentos." />{parcelas.error && <Alert message={parcelas.error} onClose={() => parcelas.setError('')} />}<section className="panel filters-panel"><div className="automatic-filters"><label className="search"><Icon name="search" size={20}/><input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente ou placa..." aria-label="Buscar cliente"/></label><div className="status-filter"><button type="button" className="filter-control" onClick={() => setStatusOpen(open => !open)} aria-expanded={statusOpen}><span><small>Status</small>{label}</span><Icon name="chevronDown" size={18}/></button>{statusOpen && <div className="status-menu">{options.map(option => <label key={option.value}><input type="checkbox" checked={statuses.includes(option.value)} onChange={() => toggle(option.value)} /><span className={`status-dot ${option.value}`} />{option.label}</label>)}</div>}</div></div><div className="filter-caption">Filtros aplicados automaticamente</div><div className="panel-head"><h2>Empréstimos e vendas</h2></div><ParcelaList items={parcelas.items} loading={parcelas.loading} next={parcelas.next} onLoadMore={() => parcelas.load({ reset: false, ...filters })} onBaixa={baixa} onDesfazerBaixa={desfazerBaixa} /></section><CobrancasAluguel busca={busca} statuses={statuses}/></>;
}
