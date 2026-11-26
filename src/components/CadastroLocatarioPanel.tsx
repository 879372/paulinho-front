import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { Alert } from './Alert';
import { ConfirmActionModal } from './ConfirmActionModal';
import { Icon } from './Icon';

export type CadastroEstado = { cadastro_completo: boolean; cadastro_preenchido_em?: string | null; cadastro_expira_em?: string | null; link_ativo?: boolean };
export function CadastroLocatarioPanel({ base, bloqueado, onChange }: { base: string; bloqueado: boolean; onChange: (dados: CadastroEstado) => void }) {
  const [estado, setEstado] = useState<CadastroEstado | null>(null);
  const [link, setLink] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  useEffect(() => {
    let ativo = true;
    apiRequest<CadastroEstado>(`${base}/cadastro/`).then(dados => { if (ativo) { setEstado(dados); onChange(dados); } }).catch(error => { if (ativo) setErro((error as Error).message); });
    return () => { ativo = false; };
  }, [base, onChange]);
  async function atualizar() {
    setOcupado(true); setErro('');
    try { const dados = await apiRequest<CadastroEstado>(`${base}/cadastro/`); setEstado(dados); onChange(dados); }
    catch (error) { setErro((error as Error).message); }
    finally { setOcupado(false); }
  }
  async function gerar() {
    setOcupado(true); setErro(''); setCopiado(false);
    try {
      const dados = await apiRequest<CadastroEstado & { token: string }>(`${base}/cadastro/`, { method: 'POST', body: JSON.stringify({ reabrir: Boolean(estado?.cadastro_preenchido_em) }) });
      const url = new URL('/cadastro-locacao', window.location.origin);
      url.hash = new URLSearchParams({ token: dados.token }).toString();
      setLink(url.toString()); setEstado(dados); onChange(dados);
    } catch (error) { setErro((error as Error).message); throw error; }
    finally { setOcupado(false); }
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(link); setCopiado(true); }
    catch { setErro('Selecione e copie o link mostrado abaixo.'); }
  }
  async function compartilhar() {
    try { await navigator.share({ title: 'Cadastro para aluguel de moto', text: 'Preencha seus dados para preparar o contrato de aluguel da moto.', url: link }); }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setErro('Não foi possível compartilhar. Use Copiar link.'); }
  }
  return <section className="cadastro-locatario-panel">
    <div className="cadastro-locatario-head"><Icon name={estado?.cadastro_completo ? 'checkCircle' : 'users'} size={20}/><div><b>Cadastro do locatário</b><span>{estado?.cadastro_completo ? 'Dados completos. Assinatura liberada.' : 'O cliente precisa preencher todos os dados pelo formulário antes da assinatura.'}</span></div><span className={`status ${estado?.cadastro_completo ? 'paga' : 'pendente'}`}>{estado?.cadastro_completo ? 'Concluído' : 'Pendente'}</span></div>
    {erro && <Alert message={erro} onClose={() => setErro('')}/>}
    {link && !estado?.cadastro_completo && <div className="cadastro-link"><label><span>Link do formulário · válido por 7 dias</span><input readOnly value={link} aria-label="Link do formulário do locatário" onFocus={event => event.currentTarget.select()}/></label><div className="cadastro-locatario-actions"><button type="button" className="secondary" onClick={() => void copiar()}>{copiado ? 'Copiado!' : 'Copiar link'}</button>{typeof navigator.share === 'function' && <button type="button" className="secondary" onClick={() => void compartilhar()}><Icon name="share" size={16}/>Compartilhar link</button>}</div></div>}
    <div className="cadastro-locatario-actions">
      {!bloqueado && <button type="button" className="secondary" disabled={ocupado || !estado} onClick={() => { if (estado?.link_ativo || estado?.cadastro_preenchido_em) setConfirmar(true); else void gerar().catch(() => undefined); }}><Icon name="file" size={16}/>{ocupado ? 'Aguarde...' : estado?.cadastro_preenchido_em ? 'Reabrir formulário' : estado?.link_ativo ? 'Gerar novo link' : 'Gerar link do formulário'}</button>}
      <button type="button" className="ghost" disabled={ocupado} onClick={() => void atualizar()}><Icon name="refresh" size={16}/>Atualizar cadastro</button>
    </div>
    <ConfirmActionModal open={confirmar} title={estado?.cadastro_preenchido_em ? 'Reabrir cadastro do locatário?' : 'Gerar novo link?'} description="O link anterior deixará de funcionar. A assinatura ficará bloqueada até o cliente concluir o novo formulário." confirmLabel="Gerar novo link" onClose={() => setConfirmar(false)} onConfirm={gerar}/>
  </section>;
}
