import { FormEvent, useEffect, useState } from 'react';
import { Icon } from './Icon';
import { apiRequest } from '../lib/api';
import { formatarTelefone, telefoneParaApi } from '../lib/format';
import type { Cliente } from '../types';
import { Alert } from './Alert';

type Props = { open: boolean; onClose: () => void; onSaved: (cliente: Cliente) => void; cliente?: Cliente | null };

export function ClienteModal({ open, onClose, onSaved, cliente = null }: Props) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const editando = Boolean(cliente);

  useEffect(() => {
    if (!open) return;
    setNome(cliente?.nome || ''); setTelefone(formatarTelefone(cliente?.telefone)); setCpf(cliente?.cpf || ''); setEndereco(cliente?.endereco || ''); setObservacoes(cliente?.observacoes || ''); setError('');
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', close); document.body.classList.add('modal-open');
    return () => { document.removeEventListener('keydown', close); document.body.classList.remove('modal-open'); };
  }, [open, onClose, cliente]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const salvo = await apiRequest<Cliente>(editando ? `/clientes/${cliente!.id}/` : '/clientes/', { method: editando ? 'PATCH' : 'POST', body: JSON.stringify({ nome, telefone: telefoneParaApi(telefone), cpf, endereco, observacoes }) });
      onSaved(salvo);
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !saving && onClose()}><div className="modal-card cliente-modal" role="dialog" aria-modal="true" aria-labelledby="cliente-modal-title"><div className="modal-head"><div><span className="eyebrow">{editando ? 'EDITAR CLIENTE' : 'NOVO CADASTRO'}</span><h2 id="cliente-modal-title">{editando ? 'Atualizar cliente' : 'Cadastrar cliente'}</h2><p>{editando ? 'Atualize os dados de contato e cadastro.' : 'Para começar, precisamos apenas do nome e telefone.'}</p></div><button type="button" onClick={onClose} disabled={saving} aria-label="Fechar"><Icon name="x" size={18}/></button></div><form onSubmit={submit}>{error && <Alert message={error}/>}<label><span>Nome completo</span><input autoFocus required maxLength={160} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria da Silva"/></label><label><span>Telefone / WhatsApp</span><input required inputMode="tel" maxLength={15} value={telefone} onChange={e => setTelefone(formatarTelefone(e.target.value))} placeholder="Ex: (84) 99999-9999"/></label>{editando && <><label><span>CPF</span><input inputMode="numeric" maxLength={14} value={cpf} onChange={e => setCpf(e.target.value)} placeholder="Opcional"/></label><label><span>Endereço</span><input maxLength={255} value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Opcional"/></label><label><span>Observações</span><textarea maxLength={1000} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Opcional"/></label></>}<div className="modal-actions"><button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancelar</button><button className="primary" disabled={saving}>{saving ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar cliente'} </button></div></form></div></div>;
}
