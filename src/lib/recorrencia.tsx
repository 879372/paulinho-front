export const DIAS_SEMANA = [
  { value: 'segunda', label: 'Segunda-feira', curto: 'segunda', indice: 1 },
  { value: 'terca', label: 'Terça-feira', curto: 'terça', indice: 2 },
  { value: 'quarta', label: 'Quarta-feira', curto: 'quarta', indice: 3 },
  { value: 'quinta', label: 'Quinta-feira', curto: 'quinta', indice: 4 },
  { value: 'sexta', label: 'Sexta-feira', curto: 'sexta', indice: 5 },
  { value: 'sabado', label: 'Sábado', curto: 'sábado', indice: 6 },
  { value: 'domingo', label: 'Domingo', curto: 'domingo', indice: 0 },
];

const isoLocal = (data: Date) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;

export function diaSemanaDaData(valor: string) {
  if (!valor) return '';
  const indice = new Date(`${valor}T00:00:00`).getDay();
  return DIAS_SEMANA.find(dia => dia.indice === indice)?.value || '';
}

export function proximaDataNoDia(diaSemana: string, aPartirDe = new Date()) {
  const dia = DIAS_SEMANA.find(item => item.value === diaSemana);
  const data = new Date(aPartirDe.getFullYear(), aPartirDe.getMonth(), aPartirDe.getDate());
  if (dia) data.setDate(data.getDate() + (dia.indice - data.getDay() + 7) % 7);
  return isoLocal(data);
}

export function descricaoRecorrencia(periodicidade?: string, diaSemana?: string | null, diaVencimento?: number | null) {
  if (periodicidade === 'semanal') {
    const dia = DIAS_SEMANA.find(item => item.value === diaSemana);
    return dia ? `Toda ${dia.curto}` : 'Semanal';
  }
  if (periodicidade === 'quinzenal') return 'Quinzenal';
  return diaVencimento ? `Todo dia ${diaVencimento}` : 'Mensal';
}

export function DiaSemanaSelect({ value, onChange, className, hint }: { value: string; onChange: (value: string) => void; className?: string; hint?: string }) {
  return <label className={className}><span>Dia da cobrança</span><select required value={value} onChange={event => onChange(event.target.value)}><option value="" disabled>Selecione o dia</option>{DIAS_SEMANA.map(dia => <option key={dia.value} value={dia.value}>{dia.label}</option>)}</select>{hint && <small>{hint}</small>}</label>;
}
