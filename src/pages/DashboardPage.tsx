import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { AgendaSemana } from '../components/AgendaSemana';
import { Icon, type IconName } from '../components/Icon';
import { apiRequest } from '../lib/api';
import { moeda } from '../lib/format';
import type { Dashboard, Parcela } from '../types';

const atalhos: { to: string; icon: IconName; label: string }[] = [
  { to: '/cobrancas', icon: 'receipt', label: 'Cobranças' },
  { to: '/motos', icon: 'bike', label: 'Motos e aluguéis' },
  { to: '/animais', icon: 'paw', label: 'Criação de animais' },
  { to: '/financeiro', icon: 'wallet', label: 'Caixa consolidado' },
];

function saudacao() {
  const hora = new Date().getHours();
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
}

export function DashboardPage() {
  const [stats, setStats] = useState<Dashboard | null>(null);
  const [statsError, setStatsError] = useState('');
  const [baixaError, setBaixaError] = useState('');
  const loadStats = async () => { try { setStats(await apiRequest('/dashboard/')); } catch (e) { setStatsError((e as Error).message); } };
  useEffect(() => { void loadStats(); }, []);
  async function baixa(parcela: Parcela, dataPagamento: string, formaPagamento: 'pix' | 'dinheiro') { try { await apiRequest(`/parcelas/${parcela.id}/dar-baixa/`, { method: 'PATCH', body: JSON.stringify({ data_pagamento: dataPagamento, forma_pagamento: formaPagamento, valor_pago: parcela.valor }) }); void loadStats(); } catch (e) { setBaixaError((e as Error).message); throw e; } }

  const aReceber = Number(stats?.a_receber || 0);
  const recebido = Number(stats?.recebido_mes || 0);
  const progresso = aReceber + recebido > 0 ? Math.round(recebido / (aReceber + recebido) * 100) : 0;
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return <>
    {(statsError || baixaError) && <Alert message={statsError || baixaError} onClose={() => { setStatsError(''); setBaixaError(''); }}/>}
    <section className="welcome">
      <div><span className="eyebrow">{hoje}</span><h1>{saudacao()}, Admin</h1><p>Resumo dos empréstimos e da agenda de cobranças.</p></div>
      <Link className="primary only-desktop" to="/contratos/novo"><Icon name="plus" size={18}/>Novo contrato</Link>
    </section>

    <div className="dash-top">
      <section className="hero-card" aria-label="Empréstimos do mês">
        <span className="hero-label"><Icon name="trendUp" size={18}/>A receber neste mês</span>
        <strong className="hero-value">{moeda(stats?.a_receber)}</strong>
        <div className="hero-progress" role="progressbar" aria-valuenow={progresso} aria-valuemin={0} aria-valuemax={100} aria-label="Recebido no mês"><i style={{ width: `${progresso}%` }}/></div>
        <div className="hero-foot"><span>Recebido no mês</span><b>{moeda(stats?.recebido_mes)} · {progresso}%</b></div>
      </section>
      <section className="metric-grid">
        <Link to="/cobrancas" className="metric blue"><div className="metric-icon"><Icon name="clock"/></div><div><span>Vencem hoje</span><strong>{stats?.vencendo_hoje ?? 0}</strong><small>Parcelas pendentes</small></div></Link>
        <Link to="/cobrancas" className="metric red"><div className="metric-icon"><Icon name="alert"/></div><div><span>Em atraso</span><strong>{stats?.atrasados ?? 0}</strong><small>Requer atenção</small></div></Link>
      </section>
    </div>

    <div className="section-title"><h2>Acesso rápido</h2></div>
    <nav className="quick-grid" aria-label="Acesso rápido">
      {atalhos.map(item => <Link key={item.to} to={item.to} className="quick-tile"><span className="tile-icon"><Icon name={item.icon}/></span><b>{item.label}</b></Link>)}
    </nav>

    <section className="panel">
      <div className="panel-head"><div><span className="section-kicker">Agenda da semana</span><h2>Cobranças por dia</h2></div><Link className="text-button" to="/cobrancas">Ver todas<Icon name="chevronRight" size={16}/></Link></div>
      <AgendaSemana onBaixa={baixa}/>
    </section>
  </>;
}
