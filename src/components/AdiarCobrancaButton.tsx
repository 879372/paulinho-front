import { useState } from 'react';
import { apiRequest } from '../lib/api';
import { dataBR, moeda } from '../lib/format';
import { ConfirmActionModal } from './ConfirmActionModal';
import { Icon } from './Icon';

type Previa = { valor_transferido: string; valor_proxima: string; valor_total: string; vencimento: string; nova_cobranca: boolean; versao: string };
export function AdiarCobrancaButton({ id, aluguel = false }: { id: number; aluguel?: boolean }) {
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const caminho = aluguel ? `/operacoes/alugueis/cobrancas/${id}/adiar/` : `/parcelas/${id}/adiar/`;
  async function abrir() {
    setCarregando(true); setErro('');
    try { setPrevia(await apiRequest<Previa>(caminho)); }
    catch (error) { setErro((error as Error).message); }
    finally { setCarregando(false); }
  }
  async function confirmar() {
    try {
      await apiRequest(caminho, { method: 'POST', body: JSON.stringify({ versao: previa!.versao }) });
      setPrevia(null);
      window.dispatchEvent(new Event('cobrancas:atualizadas'));
    } catch (error) { setErro((error as Error).message); throw error; }
  }
  return <>
    <button type="button" className="pay" disabled={carregando} onClick={() => void abrir()}><Icon name="history" size={16}/>{carregando ? 'Conferindo...' : 'Somar à próxima'}</button>
    {erro && !previa && <span className="action-error" role="alert">{erro}</span>}
    <ConfirmActionModal open={Boolean(previa)} title="Somar à próxima cobrança?" confirmLabel="Confirmar transferência" onClose={() => { setPrevia(null); setErro(''); }} onConfirm={confirmar}
      description={previa ? <>
        <span>Valor em aberto: <b>{moeda(previa.valor_transferido)}</b></span><br/>
        <span>Próximo período: <b>{moeda(previa.valor_proxima)}</b></span><br/>
        <span>Novo total: <b>{moeda(previa.valor_total)}</b>, vencendo em <b>{dataBR(previa.vencimento)}</b>.</span><br/><br/>
        <span>{previa.nova_cobranca && Number(previa.valor_proxima) === 0 ? 'Não há cobrança futura cadastrada. Será prorrogado apenas o saldo em aberto, sem uma nova mensalidade. ' : ''}O histórico será preservado. Nenhum pagamento será registrado.</span>
        {erro && <><br/><span className="action-error" role="alert">{erro}</span></>}
      </> : ''}/>
  </>;
}
