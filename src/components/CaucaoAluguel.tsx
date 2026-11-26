import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../lib/api';
import { dataBR, moeda } from '../lib/format';
import { Alert } from './Alert';
import { Icon } from './Icon';

type MovimentoCaucao = { id: number; data: string; valor: string };
export type CaucaoFinanceiro = { recebimento: MovimentoCaucao | null; devolucao: MovimentoCaucao | null };
export function CaucaoAluguel({ id, valor, assinaturaStatus, financeiro }: { id: number; valor: unknown; assinaturaStatus: unknown; financeiro?: CaucaoFinanceiro }) {
  const [aberto, setAberto] = useState(false);
  const [acao, setAcao] = useState<'editar' | 'receber' | 'devolver'>('editar');
  const [data, setData] = useState('');
  const hoje = new Date().toLocaleDateString('en-CA');
  const recebido = financeiro?.recebimento;
  const devolvido = financeiro?.devolucao;
  const [novo, setNovo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const bloqueado = assinaturaStatus === 'pendente' || assinaturaStatus === 'assinado' || Boolean(recebido);
  useEffect(() => {
    if (!aberto) return;
    const fechar = (event: KeyboardEvent) => { if (event.key === 'Escape' && !salvando) setAberto(false); };
    document.body.classList.add('modal-open'); document.addEventListener('keydown', fechar);
    return () => { document.body.classList.remove('modal-open'); document.removeEventListener('keydown', fechar); };
  }, [aberto, salvando]);
  async function salvar(event: FormEvent) {
    event.preventDefault(); setSalvando(true); setErro('');
    try {
      await apiRequest(`/operacoes/alugueis/${id}/caucao/${acao === 'editar' ? '' : acao + '/'}`, { method: acao === 'editar' ? 'PATCH' : 'POST', body: JSON.stringify(acao === 'editar' ? { valor_caucao: novo } : { data }) });
      setAberto(false); window.dispatchEvent(new Event('cobrancas:atualizadas'));
    } catch (error) { setErro((error as Error).message); }
    finally { setSalvando(false); }
  }
  const informado = valor !== null && valor !== undefined;
  return <>
    <div className="caucao-resumo"><span><b>Caução</b> {informado ? Number(valor) === 0 ? 'Sem caução' : moeda(String(valor)) : 'Não informada'}</span>
      {!bloqueado && <button type="button" className="text-button" onClick={() => { setAcao('editar'); setNovo(informado ? String(valor) : ''); setErro(''); setAberto(true); }}>{informado ? 'Editar' : 'Informar'}</button>}
    </div>
    {Number(valor) > 0 && <div className="caucao-caixa">
      <small>{recebido ? `Recebida em ${dataBR(recebido.data)} · ${moeda(recebido.valor)}` : 'Recebimento ainda não registrado no Financeiro.'}{devolvido ? ` · Devolvida em ${dataBR(devolvido.data)}` : ''}</small>
      {!devolvido && <button type="button" className="secondary" onClick={() => { setAcao(recebido ? 'devolver' : 'receber'); setData(hoje); setErro(''); setAberto(true); }}>{recebido ? 'Registrar devolução da caução' : 'Registrar recebimento da caução'}</button>}
    </div>}
    {aberto && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !salvando) setAberto(false); }}>
      <form className="modal-card" role="dialog" aria-modal="true" aria-labelledby={`caucao-${id}`} onSubmit={salvar}>
        <div className="modal-head"><div><h2 id={`caucao-${id}`}>{acao === 'editar' ? 'Caução do aluguel' : acao === 'receber' ? 'Receber caução' : 'Devolver caução'}</h2><p>{acao === 'editar' ? 'Informe a garantia combinada. Esse valor será incluído no contrato PDF.' : `Será registrada uma ${acao === 'receber' ? 'entrada' : 'saída'} de ${moeda(acao === 'receber' ? String(valor) : recebido?.valor || '0')} no Financeiro, em Aluguel de motos.`}</p></div><button type="button" onClick={() => setAberto(false)} disabled={salvando} aria-label="Fechar"><Icon name="x" size={18}/></button></div>
        {erro && <Alert message={erro}/>}
        {acao === 'editar' ? <label><span>Valor da caução (R$)</span><input type="number" inputMode="decimal" required min="0" step="0.01" value={novo} onChange={event => setNovo(event.target.value)} placeholder="0,00"/><small>Use 0 quando não houver caução. Informar a garantia não registra um recebimento no caixa.</small></label> : <label><span>{acao === 'receber' ? 'Data do recebimento' : 'Data da devolução'}</span><input type="date" required max={hoje} min={acao === 'devolver' ? recebido?.data : undefined} value={data} onChange={event => setData(event.target.value)}/><small>{acao === 'devolver' ? 'Registra a devolução integral da caução recebida.' : 'Confirme somente se o valor já foi recebido do cliente.'}</small></label>}
        <div className="modal-actions"><button type="button" className="ghost" disabled={salvando} onClick={() => setAberto(false)}>Cancelar</button><button className="primary" disabled={salvando || (acao === 'editar' ? novo === '' : !data)}>{salvando ? 'Salvando...' : acao === 'editar' ? 'Salvar caução' : acao === 'receber' ? 'Confirmar recebimento' : 'Confirmar devolução'}</button></div>
      </form>
    </div>}
  </>;
}
