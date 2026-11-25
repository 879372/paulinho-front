export function BrandMark({ size = 40 }: { size?: number }) {
  return <svg className="brand-mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <rect width="40" height="40" rx="12" fill="var(--brand-mark-bg)"/>
    <path d="M11 25.5 17.5 19l4.5 4.5L29 16.5" fill="none" stroke="var(--brand-mark-fg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="29" cy="16.5" r="2.6" fill="var(--brand-mark-accent)"/>
  </svg>;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand${compact ? ' compact' : ''}`}><BrandMark size={compact ? 34 : 40}/><div><b>Gestão de Operações</b>{!compact && <small>Empréstimos · Motos · Criação</small>}</div></div>;
}
