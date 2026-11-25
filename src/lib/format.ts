export const moeda = (valor?: string | number | boolean) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dataBR = (valor: string) => new Date(`${valor}T00:00:00`).toLocaleDateString('pt-BR');
export const dataCurta = (valor: string) => new Date(`${valor}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export function formatarTelefone(value?: string) {
  let digits = (value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export const telefoneParaApi = (value: string) => value.replace(/\D/g, '');

export function formatarCampoBRL(value: string | number | boolean | undefined) {
  const numeric = Number(value || 0);
  return numeric ? numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
}

export function campoBRLParaDecimal(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits ? (Number(digits) / 100).toFixed(2) : '';
}

const STATUS_LABEL: Record<string, string> = {
  transferida: 'Transferida', pendente: 'Pendente', paga: 'Paga', atrasada: 'Em atraso',
  ativo: 'Ativo', atrasado: 'Atrasado', quitado: 'Quitado', renegociado: 'Renegociado', cancelado: 'Cancelado',
};
export const statusLabel = (status: string) => STATUS_LABEL[status] || status;
export const iniciais = (nome?: string) => (nome || 'C').trim().split(/\s+/).slice(0, 2).map(parte => parte[0]).join('').toUpperCase();
