import { useCallback, useEffect, useState } from 'react';
import { ParcelaList } from './ParcelaList';
import { apiRequest, type PageResponse } from '../lib/api';
import type { Parcela } from '../types';

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

function diasDaSemana(referencia = new Date()) {
  const segunda = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  segunda.setDate(segunda.getDate() - ((segunda.getDay() + 6) % 7));
  return DIAS.map((nome, i) => { const d = new Date(segunda); d.setDate(segunda.getDate() + i); return { nome, data: d, iso: iso(d) }; });
}

export function AgendaSemana({ onBaixa, reloadKey = 0 }: { onBaixa: (p: Parcela, dataPagamento: string, formaPagamento: 'pix' | 'dinheiro') => Promise<void>; reloadKey?: number }) {
  const [items, setItems] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dias = diasDaSemana();
  const hoje = iso(new Date());
  const segunda = dias[0].iso;
  const domingo = dias[6].iso;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ status: 'pendente,atrasada', vencimento_ate: domingo, page_size: '100' });
      let url: string | null = `/parcelas/?${params}`;
      const todos: Parcela[] = [];
      while (url) { const data: PageResponse<Parcela> = await apiRequest<PageResponse<Parcela>>(url); todos.push(...data.results); url = data.next; }
      // Parcelas pendentes com vencimento passado contam como atrasadas
      setItems(todos.map(p => p.status === 'pendente' && p.data_vencimento < hoje ? { ...p, status: 'atrasada' } : p));
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [domingo, hoje]);

  useEffect(() => { void load(); }, [load, reloadKey]);

  async function baixa(p: Parcela, dataPagamento: string, formaPagamento: 'pix' | 'dinheiro') {
    await onBaixa(p, dataPagamento, formaPagamento);
    setItems(current => current.filter(item => item.id !== p.id));
  }

  if (error) return <div className="empty"><span>!</span><h3>Não foi possível carregar a semana</h3><p>{error}</p></div>;
  if (loading && !items.length) return <div className="load-more"><span className="spinner"/></div>;

  const anteriores = items.filter(p => p.data_vencimento < segunda);
  const total = (lista: Parcela[]) => lista.reduce((s, p) => s + Number(p.valor || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return <div className="agenda-semana">
    {anteriores.length > 0 && <div className="agenda-dia atrasadas">
      <div className="agenda-dia-head"><h3>Atrasadas de semanas anteriores</h3><small>{anteriores.length} · {total(anteriores)}</small></div>
      <ParcelaList items={anteriores} loading={false} next={null} onLoadMore={() => {}} onBaixa={baixa} compact/>
    </div>}
    {dias.map(dia => {
      const doDia = items.filter(p => p.data_vencimento === dia.iso);
      return <div key={dia.iso} className={`agenda-dia${dia.iso === hoje ? ' hoje' : ''}${doDia.length ? '' : ' vazio'}`}>
        <div className="agenda-dia-head"><h3>{dia.nome}, {ddmm(dia.data)}{dia.iso === hoje && <em>Hoje</em>}</h3><small>{doDia.length ? `${doDia.length} · ${total(doDia)}` : 'Sem cobranças'}</small></div>
        {doDia.length > 0 && <ParcelaList items={doDia} loading={false} next={null} onLoadMore={() => {}} onBaixa={baixa} compact/>}
      </div>;
    })}
  </div>;
}
