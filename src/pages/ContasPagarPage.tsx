import { FormEvent, useEffect, useState } from 'react';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import { apiRequest } from '../lib/api';
import type { ContaPagar } from '../types';

export function ContasPagarPage() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [descricao, setDescricao] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function carregar() {
    try {
      setContas(await apiRequest<ContaPagar[]>('/contas-a-pagar/'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void carregar(); }, []);

  async function cadastrar(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const conta = await apiRequest<ContaPagar>('/contas-a-pagar/', { method: 'POST', body: JSON.stringify({ descricao, dia_vencimento: diaVencimento }) });
      setContas(atuais => [...atuais, conta].sort((a, b) => Number(b.ativa) - Number(a.ativa) || a.dia_vencimento - b.dia_vencimento));
      setDescricao('');
      setDiaVencimento('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function alternarStatus(conta: ContaPagar) {
    try {
      await apiRequest(`/contas-a-pagar/${conta.id}/`, { method: 'PATCH', body: JSON.stringify({ ativa: !conta.ativa }) });
      await carregar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remover(conta: ContaPagar) {
    if (!window.confirm(`Remover a conta “${conta.descricao}”?`)) return;
    try {
      await apiRequest(`/contas-a-pagar/${conta.id}/`, { method: 'DELETE' });
      setContas(atuais => atuais.filter(item => item.id !== conta.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <LoadingState/>;
  return <><PageHeader eyebrow="Organização" title="Contas a pagar" description="Cadastre contas mensais e receba o lembrete no WhatsApp todo mês."/>{error && <Alert message={error} onClose={() => setError('')}/>}<section className="panel accounts-create"><form onSubmit={cadastrar}><label><span>Descrição da conta</span><input required maxLength={255} value={descricao} onChange={event => setDescricao(event.target.value)} placeholder="Ex: Internet da loja"/></label><label><span>Dia do vencimento</span><input required type="number" min="1" max="31" inputMode="numeric" value={diaVencimento} onChange={event => setDiaVencimento(event.target.value)} placeholder="Ex: 10"/></label><button className="primary" disabled={saving}><Icon name="plus" size={18}/>{saving ? 'Salvando...' : 'Adicionar conta'}</button></form></section><section className="panel accounts-panel"><div className="panel-head"><div><span className="section-kicker">Lembretes mensais</span><h2>Suas contas</h2></div><span className="contract-count">{contas.filter(conta => conta.ativa).length} ativas</span></div>{contas.length ? <div className="accounts-list">{contas.map(conta => <article className={`account-row ${conta.ativa ? '' : 'closed'}`} key={conta.id}><div className="account-check"><Icon name={conta.ativa ? 'clock' : 'check'}/></div><div><b>{conta.descricao}</b><span>{conta.ativa ? `Todo mês, dia ${conta.dia_vencimento}` : 'Notificações encerradas'}</span></div><i className={`status ${conta.ativa ? 'pendente' : 'paga'}`}>{conta.ativa ? 'Ativa' : 'Encerrada'}</i><button className="pay" type="button" onClick={() => alternarStatus(conta)}>{conta.ativa ? 'Encerrar' : 'Reativar'}</button><button className="account-remove" type="button" onClick={() => remover(conta)} aria-label={`Remover ${conta.descricao}`}><Icon name="trash" size={18}/></button></article>)}</div> : <div className="empty"><span><Icon name="calendar" size={22}/></span><h3>Nenhuma conta cadastrada</h3><p>Adicione uma conta recorrente para receber o lembrete mensal.</p></div>}</section></>;
}
