import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { ClienteModal } from '../components/ClienteModal';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import { apiRequest, type PageResponse } from '../lib/api';
import { formatarTelefone, iniciais } from '../lib/format';
import type { Cliente } from '../types';

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]); const [busca, setBusca] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [modal, setModal] = useState(false); const first = useRef(true);
  async function load() { setLoading(true); try { const data = await apiRequest<PageResponse<Cliente>>(`/clientes/?busca=${encodeURIComponent(busca)}&page_size=100`); setClientes(data.results); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } }
  useEffect(() => { const timer = window.setTimeout(() => void load(), first.current ? 0 : 450); first.current = false; return () => window.clearTimeout(timer); }, [busca]);
  return <><PageHeader eyebrow="Relacionamento" title="Clientes" description="Consulte os clientes cadastrados e seus contatos." action={<button className="primary" onClick={() => setModal(true)}><Icon name="plus" size={18}/>Novo cliente</button>}/>{error && <Alert message={error} onClose={() => setError('')}/>}<section className="panel filters-panel"><div className="filters client-filters"><label className="search"><Icon name="search" size={20}/><input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone..." aria-label="Buscar cliente"/></label></div><div className="client-grid">{loading && !clientes.length && <div className="load-more"><span className="spinner"/></div>}{!loading && !clientes.length && <div className="empty"><span><Icon name="users" size={22}/></span><h3>Nenhum cliente encontrado</h3><p>Ajuste a busca ou cadastre um novo cliente.</p></div>}{clientes.map(cliente => <Link className="client-card" to={`/clientes/${cliente.id}`} key={cliente.id}><div className="client-avatar">{iniciais(cliente.nome)}</div><div><b>{cliente.nome}</b><span>{formatarTelefone(cliente.telefone)}</span></div><Icon name="chevronRight" size={18}/></Link>)}</div></section><ClienteModal open={modal} onClose={() => setModal(false)} onSaved={cliente => { setClientes(lista => [cliente, ...lista]); setModal(false); }}/></>;
}
