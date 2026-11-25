import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../lib/api';
import { moeda } from '../lib/format';
import { Alert } from './Alert';
import { Icon } from './Icon';

export function CaucaoAluguel({ id, valor, assinaturaStatus }: { id: number; valor: unknown; assinaturaStatus: unknown }) {
  const [aberto, setAberto] = useState(false);
  const [novo, setNovo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const bloqueado = assinaturaStatus === 'pendente' || assinaturaStatus === 'assinado';
  useEffect(() => {
    if (!aberto) return;
    const fechar = (event: KeyboardEvent) => { if (event.key === 'Escape' && !salvando) setAberto(false); };
    document.body.classList.add('modal-open'); document.addEventListener('keydown', fechar);
    return () => { document.body.classList.remove('modal-open'); document.removeEventListener('keydown', fechar); };
  }, [aberto, salvando]);
  async function salvar(event: FormEvent) {
    event.preventDefault(); setSalvando(true); setErro('');
    try {
      await apiRequest(`/operacoes/alugueis/${id}/caucao/`, { method: 'PATCH', body: JSON.stringify({ valor_caucao: novo }) });
      setAberto(false); window.dispatchEvent(new Event('cobrancas:atualizadas'));
    } catch (error) { setErro((error as Error).message); }
    finally { setSalvando(false); }
  }
  const informado = valor !== null && valor !== undefined;
  return <>
    <div className="caucao-resumo"><span><b>Caução</b> {informado ? Number(valor) === 0 ? 'Sem caução' : moeda(String(valor)) : 'Não informada'}</span>
      {!bloqueado && <button type="button" className="text-button" onClick={() => { setNovo(informado ? String(valor) : ''); setErro(''); setAberto(true); }}>{informado ? 'Editar' : 'Informar'}</button>}
    </div>
    {aberto && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !salvando) setAberto(false); }}>
      <form className="modal-card" role="dialog" aria-modal="true" aria-labelledby={`caucao-${id}`} onSubmit={salvar}>
        <div className="modal-head"><div><h2 id={`caucao-${id}`}>Caução do aluguel</h2><p>Informe a garantia combinada. Esse valor será incluído no contrato PDF.</p></div><button type="button" onClick={() => setAberto(false)} disabled={salvando} aria-label="Fechar"><Icon name="x" size={18}/></button></div>
        {erro && <Alert message={erro}/>}
        <label><span>Valor da caução (R$)</span><input type="number" inputMode="decimal" required min="0" step="0.01" value={novo} onChange={event => setNovo(event.target.value)} placeholder="0,00"/><small>Use 0 quando não houver caução. Informar a garantia não registra um recebimento no caixa.</small></label>
        <div className="modal-actions"><button type="button" className="ghost" disabled={salvando} onClick={() => setAberto(false)}>Cancelar</button><button className="primary" disabled={salvando || novo === ''}>{salvando ? 'Salvando...' : 'Salvar caução'}</button></div>
      </form>
    </div>}
  </>;
}
