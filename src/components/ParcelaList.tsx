import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BaixaModal } from './BaixaModal';
import { DesfazerBaixaModal } from './DesfazerBaixaModal';
import { Icon } from './Icon';
import { dataCurta, iniciais, moeda, statusLabel } from '../lib/format';
import type { Parcela } from '../types';

type Props = { items: Parcela[]; loading: boolean; next: string | null; onLoadMore: () => void; onBaixa: (p: Parcela, dataPagamento: string, formaPagamento: 'pix' | 'dinheiro') => Promise<void>; onDesfazerBaixa?: (p: Parcela) => Promise<void>; compact?: boolean };

export function ParcelaList({ items, loading, next, onLoadMore, onBaixa, onDesfazerBaixa, compact = false }: Props) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<Parcela | null>(null);
  const [parcelaParaDesfazer, setParcelaParaDesfazer] = useState<Parcela | null>(null);
  useEffect(() => { const node = sentinel.current; if (!node || !next || loading) return; const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && onLoadMore(), { rootMargin: '180px' }); observer.observe(node); return () => observer.disconnect(); }, [next, loading, onLoadMore]);
  if (!loading && !items.length) return <div className="empty"><span><Icon name="check" size={22}/></span><h3>Tudo em dia por aqui</h3><p>Nenhuma cobrança encontrada para este filtro.</p></div>;
  return <>
    <div className="debt-list">
      {items.map(item => <article className="debt-row" key={item.id}>
        <div className="client-avatar">{iniciais(item.cliente_nome)}</div>
        <div className="client-info"><Link to={`/contratos/${item.contrato}`}>{item.cliente_nome || `Contrato #${item.contrato}`}</Link><span>{item.contrato_descricao} · {item.numero ? `Parcela ${item.numero}` : 'Juros'}</span></div>
        <div className="amount"><b>{moeda(item.valor)}</b><span className={`status ${item.status}`}>{statusLabel(item.status)}</span></div>
        <div className="debt-foot">
          <span className={`due${item.status === 'atrasada' ? ' late' : ''}`}><Icon name="clock" size={16}/>{item.status === 'paga' ? 'Venceu' : 'Vence'} {dataCurta(item.data_vencimento)}</span>
          {item.status !== 'paga'
            ? <button type="button" className="pay is-primary" onClick={() => setParcelaSelecionada(item)}><Icon name="check" size={16}/>Dar baixa</button>
            : onDesfazerBaixa && item.tipo !== 'quitacao_principal' ? <button type="button" className="pay undo-payment" onClick={() => setParcelaParaDesfazer(item)}>Desfazer baixa</button> : null}
        </div>
      </article>)}
      {!compact && <div ref={sentinel} className="load-more">{loading ? <span className="spinner"/> : next ? 'Role para carregar mais' : items.length ? 'Fim da lista' : ''}</div>}
    </div>
    <BaixaModal parcela={parcelaSelecionada} onClose={() => setParcelaSelecionada(null)} onConfirm={onBaixa}/>
    {onDesfazerBaixa && <DesfazerBaixaModal parcela={parcelaParaDesfazer} onClose={() => setParcelaParaDesfazer(null)} onConfirm={onDesfazerBaixa}/>}
  </>;
}
