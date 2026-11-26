const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
  }
}

let refreshPromise: Promise<string> | null = null;

function mensagemDeErro(body: unknown, fallback: string) {
  if (!body || typeof body !== 'object') return fallback;
  const dados = body as Record<string, unknown>;
  if (typeof dados.detail === 'string') return dados.detail;
  const mensagens = Object.entries(dados).flatMap(([campo, valor]) => {
    const texto = Array.isArray(valor) ? valor.filter(item => typeof item === 'string').join(' ') : typeof valor === 'string' ? valor : '';
    return texto ? [`${campo === 'non_field_errors' ? '' : `${campo}: `}${texto}`] : [];
  });
  return mensagens.join(' ') || fallback;
}

function tokenExpirado(token: string) {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    const exp = JSON.parse(atob(payload))?.exp;
    return typeof exp !== 'number' || exp * 1000 <= Date.now() + 30_000;
  } catch {
    return true;
  }
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = localStorage.getItem('gestao_refresh_token');
      if (!refresh) throw new Error('Sessão expirada.');
      const response = await fetch(`${API_URL}/auth/refresh/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh }) });
      if (!response.ok) throw new Error('Sessão expirada.');
      const tokens = await response.json();
      localStorage.setItem('gestao_access_token', tokens.access);
      return tokens.access as string;
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function accessTokenValido() {
  const access = localStorage.getItem('gestao_access_token');
  if (access && !tokenExpirado(access)) return access;
  try {
    return await refreshAccessToken();
  } catch {
    localStorage.removeItem('gestao_access_token');
    localStorage.removeItem('gestao_refresh_token');
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Sessão expirada. Entre novamente.');
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const isAuthRequest = path.includes('/auth/login/') || path.includes('/auth/refresh/');
  const token = isAuthRequest ? localStorage.getItem('gestao_access_token') : await accessTokenValido();
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const body = isJson ? await response.json() : null;
  if (response.status === 401 && retry && !path.includes('/auth/')) {
    try { await refreshAccessToken(); return apiRequest<T>(path, options, false); }
    catch { window.dispatchEvent(new Event('auth:unauthorized')); }
  }
  if (!response.ok) {
    throw new ApiError(mensagemDeErro(body, `Não foi possível concluir a operação (${response.status}).`), response.status, body);
  }
  if (response.status === 204) return undefined as T;
  if (!isJson) throw new ApiError('A API retornou uma resposta inválida.', response.status);
  return body as T;
}

export async function apiDownload(path: string, retry = true): Promise<Blob> {
  const token = await accessTokenValido();
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (response.status === 401 && retry) {
    try { await refreshAccessToken(); return apiDownload(path, false); }
    catch { window.dispatchEvent(new Event('auth:unauthorized')); throw new ApiError('Sessão expirada.', 401); }
  }
  if (!response.ok) {
    const body = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
    throw new ApiError(body?.detail || `Não foi possível gerar o comprovante (${response.status}).`, response.status, body);
  }
  return response.blob();
}

export async function apiGerarPdf(path: string, dados: Record<string, unknown>, retry = true): Promise<Blob> {
  const token = await accessTokenValido();
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(dados) });
  if (response.status === 401 && retry) {
    try { await refreshAccessToken(); return apiGerarPdf(path, dados, false); }
    catch { window.dispatchEvent(new Event('auth:unauthorized')); throw new ApiError('Sessão expirada.', 401); }
  }
  if (!response.ok) {
    const body = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
    throw new ApiError(mensagemDeErro(body, `Não foi possível gerar o comprovante (${response.status}).`), response.status, body);
  }
  return response.blob();
}

export function baixarPdf(arquivo: Blob, nome: string) {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function compartilharOuBaixarPdf(arquivo: Blob, nome: string) {
  const pdf = new File([arquivo], nome, { type: 'application/pdf' });
  if (window.matchMedia('(max-width: 1023px)').matches && navigator.share && navigator.canShare?.({ files: [pdf] })) {
    try {
      await navigator.share({ files: [pdf] });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      throw error;
    }
  }
  const url = URL.createObjectURL(pdf);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type PageResponse<T> = { count: number; next: string | null; previous: string | null; results: T[] };

/** Formulários por link não usam nem alteram a sessão do operador. */
export async function apiPublicRequest<T>(path: string, dados: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { method: 'POST', credentials: 'omit', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
  const json = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
  if (!response.ok) throw new ApiError(mensagemDeErro(json, 'Não foi possível enviar os dados.'), response.status, json);
  if (!json) throw new ApiError('Resposta inválida. Tente novamente.', response.status);
  return json as T;
}
