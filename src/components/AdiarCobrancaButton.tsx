import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../lib/api';
import { dataBR, moeda } from '../lib/format';
import { Alert } from './Alert';
import { ConfirmActionModal } from './ConfirmActionModal';
import { Icon } from './Icon';

type Previa = { valor_transferido: string; valor_proxima: string; valor_total: string; vencimento: string; nova_cobranca: boolean; versao: string };
type Vencimento = { vencimento: string; vencimento_original: string | null; valor: string };

export function AdiarCobrancaButton({ id, aluguel = false }: { id: number; aluguel?: boolean }) {
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [vencimento, setVencimento] = useState<Vencimento | null>(null);
  const [novaData, setNovaData] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const base = aluguel ? `/operacoes/alugueis/cobrancas/${id}` : `/parcelas/${id}`;

  useEffect(() => {
    if (!posicao) return;
    const fechar = () => setPosicao(null);
    const fora = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node) && !botaoRef.current?.contains(event.target as Node)) fechar(); };
    const teclado = (event: KeyboardEvent) => { if (event.key === 'Escape') { fechar(); botaoRef.current?.focus(); } };
    menuRef.current?.querySelector('button')?.focus({ preventScroll: true });
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', teclado);
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', teclado); window.removeEventListener('scroll', fechar, true); window.removeEventListener('resize', fechar); };
  }, [posicao]);

  useEffect(() => {
    if (!vencimento) return;
    const fechar = (event: KeyboardEvent) => { if (event.key === 'Escape' && !salvando) setVencimento(null); };
    document.body.classList.add('modal-open'); document.addEventListener('keydown', fechar);
    return () => { document.body.classList.remove('modal-open'); document.removeEventListener('keydown', fechar); };
  }, [vencimento, salvando]);

  function abrirMenu() {
    if (posicao) { setPosicao(null); return; }
    const rect = botaoRef.current!.getBoundingClientRect();
    const altura = 112;
    setPosicao({ top: rect.bottom + altura < window.innerHeight - 80 ? rect.bottom + 6 : Math.max(8, rect.top - altura), left: Math.max(8, Math.min(rect.right - 238, window.innerWidth - 246)) });
  }

  async function abrir(acao: 'juntar' | 'vencimento') {
    setPosicao(null); setCarregando(true); setErro('');
    try {
      if (acao === 'juntar') setPrevia(await apiRequest<Previa>(`${base}/adiar/`));
      else { const dados = await apiRequest<Vencimento>(`${base}/vencimento/`); setVencimento(dados); setNovaData(dados.vencimento); }
    } catch (error) { setErro((error as Error).message); }
    finally { setCarregando(false); }
  }

  async function confirmar() {
    try {
      await apiRequest(`${base}/adiar/`, { method: 'POST', body: JSON.stringify({ versao: previa!.versao }) });
      setPrevia(null); window.dispatchEvent(new Event('cobrancas:atualizadas'));
    } catch (error) { setErro((error as Error).message); throw error; }
  }

  async function salvarData(event: FormEvent) {
    event.preventDefault(); if (!vencimento) return;
    setSalvando(true); setErro('');
    try {
      await apiRequest(`${base}/vencimento/`, { method: 'PATCH', body: JSON.stringify({ vencimento: novaData, vencimento_atual: vencimento.vencimento }) });
      setVencimento(null); window.dispatchEvent(new Event('cobrancas:atualizadas'));
    } catch (error) { setErro((error as Error).message); }
    finally { setSalvando(false); }
  }

  return <>
    <button ref={botaoRef} type="button" className="pay cobranca-menu-trigger" disabled={carregando} aria-label={`Mais opções da cobrança ${id}`} aria-haspopup="menu" aria-expanded={Boolean(posicao)} aria-controls={posicao ? menuId : undefined} onClick={abrirMenu}><Icon name={carregando ? 'clock' : 'more'} size={20}/></button>
    {posicao && createPortal(<div id={menuId} ref={menuRef} className="cobranca-dropdown" role="menu" aria-label="Opções da cobrança" style={posicao} onKeyDown={event => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      const botoes = Array.from(event.currentTarget.querySelectorAll('button'));
      const atual = botoes.indexOf(document.activeElement as HTMLButtonElement);
      botoes[(atual + (event.key === 'ArrowDown' ? 1 : -1) + botoes.length) % botoes.length]?.focus();
    }}>
      <button type="button" role="menuitem" onClick={() => void abrir('juntar')}><Icon name="history" size={18}/>Juntar à próxima</button>
      <button type="button" role="menuitem" onClick={() => void abrir('vencimento')}><Icon name="calendar" size={18}/>Alterar vencimento</button>
    </div>, document.body)}
    {erro && !previa && !vencimento && <span className="action-error" role="alert">{erro}</span>}
    <ConfirmActionModal open={Boolean(previa)} title="Juntar à próxima cobrança?" confirmLabel="Confirmar transferência" onClose={() => { setPrevia(null); setErro(''); }} onConfirm={confirmar}
      description={previa ? <>
        <span>Valor em aberto: <b>{moeda(previa.valor_transferido)}</b></span><br/>
        <span>Próximo período: <b>{moeda(previa.valor_proxima)}</b></span><br/>
        <span>Novo total: <b>{moeda(previa.valor_total)}</b>, vencendo em <b>{dataBR(previa.vencimento)}</b>.</span><br/><br/>
        <span>{previa.nova_cobranca && Number(previa.valor_proxima) === 0 ? 'Não há cobrança futura cadastrada. Será prorrogado apenas o saldo em aberto, sem uma nova mensalidade. ' : ''}O histórico será preservado. Nenhum pagamento será registrado.</span>
        {erro && <><br/><span className="action-error" role="alert">{erro}</span></>}
      </> : ''}/>
    {vencimento && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !salvando) setVencimento(null); }}>
      <form className="modal-card" role="dialog" aria-modal="true" aria-labelledby={`${menuId}-titulo`} onSubmit={salvarData}>
        <div className="modal-head"><div><h2 id={`${menuId}-titulo`}>Alterar vencimento</h2><p>Somente esta cobrança será alterada. As datas do contrato e das demais cobranças serão mantidas.</p></div><button type="button" aria-label="Fechar" disabled={salvando} onClick={() => setVencimento(null)}><Icon name="x" size={18}/></button></div>
        <p><b>{moeda(vencimento.valor)}</b> · Vencimento atual: {dataBR(vencimento.vencimento)}</p>
        {erro && <Alert message={erro}/>}
        <label><span>Novo vencimento</span><input type="date" required value={novaData} onChange={event => setNovaData(event.target.value)}/></label>
        <div className="modal-actions"><button type="button" className="ghost" disabled={salvando} onClick={() => setVencimento(null)}>Cancelar</button><button className="primary" disabled={salvando || !novaData || novaData === vencimento.vencimento}>{salvando ? 'Salvando...' : 'Salvar vencimento'}</button></div>
      </form>
    </div>}
  </>;
}
