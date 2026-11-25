import { useEffect, useState } from 'react';
import { apiDownload, apiRequest, compartilharOuBaixarPdf } from '../lib/api';
import type { AssinaturaInfo } from '../types';
import { Alert } from './Alert';
import { ConfirmActionModal } from './ConfirmActionModal';
import { Icon } from './Icon';

type Estado = AssinaturaInfo & { configurado?: boolean; signatarios?: { nome: string; assinou: boolean; recusou: boolean }[] };

const ROTULO = { '': 'Não enviado', pendente: 'Aguardando assinatura', assinado: 'Assinado', recusado: 'Recusado' } as const;
const TOM = { '': '', pendente: 'pendente', assinado: 'paga', recusado: 'atrasada' } as const;
const dataHora = (valor?: string | null) => valor ? new Date(valor).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

/** Envia o contrato para assinatura eletrônica (Autentique) e acompanha o status. `base` é a rota do contrato na API. */
export function AssinaturaPanel({ base, inicial, nomeArquivo, compacto = false }: { base: string; inicial: AssinaturaInfo; nomeArquivo: string; compacto?: boolean }) {
  const [estado, setEstado] = useState<Estado>(inicial);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [confirmar, setConfirmar] = useState<false | 'enviar' | 'reenviar'>(false);
  const status = estado.assinatura_status || '';

  // Descobre se a integração está configurada (consulta local, não chama a Autentique quando ainda não houve envio).
  useEffect(() => { if (!status) apiRequest<Estado>(`${base}/assinatura/`).then(dados => setEstado(atual => ({ ...atual, ...dados }))).catch(() => undefined); }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  async function executar(acao: () => Promise<void>) {
    setOcupado(true); setErro('');
    try { await acao(); } catch (e) { setErro((e as Error).message); throw e; } finally { setOcupado(false); }
  }
  const enviar = (reenviar: boolean) => executar(async () => setEstado(await apiRequest<Estado>(`${base}/assinatura/`, { method: 'POST', body: JSON.stringify(reenviar ? { reenviar: true } : {}) })));
  const atualizar = () => executar(async () => setEstado(await apiRequest<Estado>(`${base}/assinatura/`))).catch(() => undefined);
  const baixar = () => executar(async () => compartilharOuBaixarPdf(await apiDownload(`${base}/assinatura/pdf/`), nomeArquivo)).catch(() => undefined);

  return <div className={`assinatura${compacto ? ' compacta' : ''}`}>
    <div className="assinatura-topo">
      <span className="tile-icon"><Icon name="edit"/></span>
      <div className="assinatura-texto">
        <b>Assinatura eletrônica</b>
        <span>{status === 'assinado' ? `Concluída em ${dataHora(estado.assinatura_concluida_em)}` : status ? `Enviado em ${dataHora(estado.assinatura_enviada_em)}` : 'Gerar ou baixar o PDF não envia link. O envio só ocorre ao confirmar abaixo.'}</span>
      </div>
      <span className={`status ${TOM[status]}`}>{ROTULO[status]}</span>
    </div>
    {estado.assinatura_sandbox && status && <p className="assinatura-aviso">Modo teste da Autentique: sem validade jurídica e apagado em poucos dias.</p>}
    {estado.configurado === false && !status && <p className="assinatura-aviso">Configure o <code>AUTENTIQUE_TOKEN</code> no backend para enviar contratos.</p>}
    {estado.signatarios && <ul className="assinatura-partes">{estado.signatarios.map(parte => <li key={parte.nome}><Icon name={parte.assinou ? 'checkCircle' : parte.recusou ? 'x' : 'clock'} size={16}/>{parte.nome}<em>{parte.assinou ? 'assinou' : parte.recusou ? 'recusou' : 'pendente'}</em></li>)}</ul>}
    {erro && <Alert message={erro} onClose={() => setErro('')}/>}
    <div className="assinatura-acoes">
      {!status && <button type="button" className="primary" disabled={ocupado || estado.configurado === false} onClick={() => setConfirmar('enviar')}><Icon name="share" size={18}/>Enviar para assinatura</button>}
      {status === 'pendente' && estado.assinatura_link_empresa && <a className="primary" href={estado.assinatura_link_empresa} target="_blank" rel="noreferrer"><Icon name="edit" size={18}/>Assinar como empresa</a>}
      {(status === 'pendente' || status === 'recusado') && <button type="button" className="secondary" disabled={ocupado} onClick={atualizar}><Icon name="refresh" size={18}/>{ocupado ? 'Consultando...' : 'Atualizar status'}</button>}
      {(status === 'pendente' || status === 'recusado') && <button type="button" className="ghost" disabled={ocupado} onClick={() => setConfirmar('reenviar')}>Reenviar</button>}
      {status === 'assinado' && <button type="button" className="primary" disabled={ocupado} onClick={baixar}><Icon name="file" size={18}/>{ocupado ? 'Baixando...' : 'PDF assinado'}</button>}
    </div>
    <ConfirmActionModal open={Boolean(confirmar)} title={confirmar === 'reenviar' ? 'Reenviar para assinatura?' : 'Enviar para assinatura?'}
      description={`O cliente receberá o link pelo WhatsApp cadastrado.${confirmar === 'reenviar' ? ' Um novo documento será criado e consumirá um envio da sua cota.' : ' Cada envio consome um documento da cota da Autentique.'}`}
      confirmLabel="Sim, enviar" onClose={() => setConfirmar(false)} onConfirm={() => enviar(confirmar === 'reenviar')}/>
  </div>;
}
