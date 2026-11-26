import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiError, apiPublicRequest } from '../lib/api';
import { Brand } from '../components/Brand';
import { Alert } from '../components/Alert';
import { Icon } from '../components/Icon';
import { dataBR } from '../lib/format';

type Contexto = { concluido: boolean; contrato: number; placa: string; modelo: string; inicio: string; fim: string; expira_em: string };
type Campo = { nome: string; label: string; max?: number; tipo?: string; numerico?: boolean; opcoes?: [string, string][]; opcional?: boolean; autocomplete?: string };
const civis: [string,string][] = [['solteiro','Solteiro(a)'],['casado','Casado(a)'],['divorciado','Divorciado(a)'],['viuvo','Viúvo(a)'],['uniao_estavel','União estável'],['separado','Separado(a)']];
const grupos: { titulo: string; campos: Campo[] }[] = [
  { titulo: 'Dados pessoais', campos: [
    { nome:'nome',label:'Nome completo',max:160,autocomplete:'name' }, { nome:'cpf',label:'CPF',max:14,numerico:true },
    { nome:'rg',label:'RG',max:25 }, { nome:'orgao_emissor',label:'Órgão emissor / UF do RG',max:40 },
    { nome:'nacionalidade',label:'Nacionalidade',max:60 }, { nome:'estado_civil',label:'Estado civil',opcoes:civis },
    { nome:'profissao',label:'Profissão',max:100 }, { nome:'telefone',label:'Telefone com DDD',max:20,tipo:'tel',autocomplete:'tel' },
  ]},
  { titulo: 'Habilitação', campos: [
    { nome:'cnh_numero',label:'Número da CNH',max:11,numerico:true }, { nome:'cnh_categoria',label:'Categoria da CNH',opcoes:['A','AB','AC','AD','AE'].map(value=>[value,value]) },
    { nome:'cnh_validade',label:'Validade da CNH',tipo:'date' },
  ]},
  { titulo: 'Endereço completo', campos: [
    { nome:'cep',label:'CEP',max:9,numerico:true,autocomplete:'postal-code' }, { nome:'logradouro',label:'Rua / avenida',max:160,autocomplete:'address-line1' },
    { nome:'numero',label:'Número (ou S/N)',max:20 }, { nome:'complemento',label:'Complemento',max:100,opcional:true,autocomplete:'address-line2' },
    { nome:'bairro',label:'Bairro',max:100 }, { nome:'cidade',label:'Cidade',max:100,autocomplete:'address-level2' },
    { nome:'uf',label:'Estado (UF)',opcoes:'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').map(value=>[value,value]) },
  ]},
];

export function CadastroLocatarioPage() {
  const location = useLocation();
  const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
  const [contexto,setContexto] = useState<Contexto | null>(null);
  const [dados,setDados] = useState<Record<string,string>>({ nacionalidade:'Brasileira' });
  const [confirmacao,setConfirmacao] = useState(false);
  const [carregando,setCarregando] = useState(true);
  const [salvando,setSalvando] = useState(false);
  const [erro,setErro] = useState('');
  const [erros,setErros] = useState<Record<string,string>>({});
  const [concluido,setConcluido] = useState(false);
  useEffect(() => {
    let ativo=true;
    setCarregando(true);setErro('');setContexto(null);setConcluido(false);setDados({nacionalidade:'Brasileira'});setConfirmacao(false);setErros({});
    if (!token) { setErro('Link incompleto. Abra o link enviado pela locadora.');setCarregando(false);return; }
    apiPublicRequest<Contexto>('/operacoes/cadastro-publico/consultar/',{token}).then(result=>{if(ativo){setContexto(result);setConcluido(result.concluido);}}).catch(error=>{if(ativo)setErro((error as Error).message);}).finally(()=>{if(ativo)setCarregando(false);});
    return ()=>{ativo=false;};
  },[token]);
  async function enviar(event: FormEvent) {
    event.preventDefault();setSalvando(true);setErro('');setErros({});
    try { await apiPublicRequest('/operacoes/cadastro-publico/concluir/',{token,dados:{...dados,confirmacao}});setConcluido(true);setDados({}); }
    catch(error){
      setErro('Confira os campos indicados e tente novamente.');
      if(error instanceof ApiError && error.details && typeof error.details==='object') {
        const detalhes=error.details as Record<string,unknown>;
        if(typeof detalhes.detail==='string')setErro(detalhes.detail);
        setErros(Object.fromEntries(Object.entries(detalhes).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,(v as string[]).join(' ')])));
      } else setErro((error as Error).message);
    } finally {setSalvando(false);}
  }
  return <main className="public-cadastro">
    <header className="public-cadastro-brand"><Brand/></header>
    <div className="public-cadastro-content">
      {carregando ? <div className="panel empty"><span className="spinner"/><p>Carregando formulário...</p></div> : concluido ? <section className="panel public-cadastro-success"><span className="tile-icon"><Icon name="checkCircle" size={28}/></span><h1>Dados enviados!</h1><p>A locadora já pode preparar o contrato para assinatura. Aguarde o link de assinatura pelo WhatsApp cadastrado.</p><p>Preencher este formulário não assina o contrato.</p></section> : !contexto ? <section className="panel public-cadastro-success"><Icon name="alert" size={28}/><h1>Não foi possível abrir o cadastro</h1><Alert message={erro || 'Solicite um novo link à locadora.'}/></section> : <>
        <section className="public-cadastro-intro"><span className="eyebrow">Aluguel de moto · Cadastro do locatário</span><h1>Seus dados para o contrato</h1><p>Preencha os campos abaixo. A assinatura só será disponibilizada após o envio de todos os dados obrigatórios.</p><div className="public-cadastro-context"><Icon name="bike"/><span><b>{contexto.modelo} · {contexto.placa}</b><small>Contrato #{contexto.contrato} · {dataBR(contexto.inicio)} a {dataBR(contexto.fim)}</small></span></div></section>
        <form className="panel public-cadastro-form" onSubmit={enviar}>
          {erro && <Alert message={erro}/>}
          {grupos.map(grupo=><section className="public-cadastro-group" key={grupo.titulo}><h2>{grupo.titulo}</h2><div className="field-grid">{grupo.campos.map(campo=><label key={campo.nome}><span>{campo.label}{campo.opcional ? ' (opcional)' : ''}</span>{campo.opcoes ? <select name={campo.nome} required={!campo.opcional} value={dados[campo.nome]||''} aria-invalid={Boolean(erros[campo.nome])} onChange={event=>setDados(atual=>({...atual,[campo.nome]:event.target.value}))}><option value="">Selecione</option>{campo.opcoes.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select> : <input name={campo.nome} type={campo.tipo||'text'} inputMode={campo.numerico ? 'numeric' : undefined} autoComplete={campo.autocomplete} maxLength={campo.max} required={!campo.opcional} value={dados[campo.nome]||''} aria-invalid={Boolean(erros[campo.nome])} onChange={event=>setDados(atual=>({...atual,[campo.nome]:event.target.value}))}/>} {erros[campo.nome] && <small className="action-error">{erros[campo.nome]}</small>}</label>)}</div></section>)}
          <label className="public-cadastro-check"><input type="checkbox" required checked={confirmacao} onChange={event=>setConfirmacao(event.target.checked)}/><span>Conferi os dados e confirmo que são verdadeiros. Eles serão usados para preparar o contrato de locação.</span></label>
          {erros.confirmacao && <Alert message={erros.confirmacao}/>}
          <div className="public-cadastro-submit"><button className="primary" disabled={salvando || !confirmacao}>{salvando ? 'Enviando...' : 'Concluir cadastro'}<Icon name="arrowRight" size={18}/></button><small>Você não precisa criar uma conta. Este formulário não realiza a assinatura.</small></div>
        </form>
      </>}
    </div>
  </main>;
}
