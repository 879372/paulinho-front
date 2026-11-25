import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Brand } from './Brand';
import { Icon, type IconName } from './Icon';

type NavItem = { to: string; icon: IconName; label: string; short?: string };

const principais: NavItem[] = [
  { to: '/dashboard', icon: 'home', label: 'Visão geral', short: 'Início' },
  { to: '/cobrancas', icon: 'receipt', label: 'Cobranças' },
  { to: '/clientes', icon: 'users', label: 'Clientes' },
];
const operacoes: NavItem[] = [
  { to: '/motos', icon: 'bike', label: 'Motos e aluguéis' },
  { to: '/animais', icon: 'paw', label: 'Criação de animais' },
  { to: '/financeiro', icon: 'wallet', label: 'Financeiro' },
  { to: '/contas-a-pagar', icon: 'calendar', label: 'Contas a pagar' },
];

const navClass = ({ isActive }: { isActive: boolean }) => isActive ? 'nav-active' : '';

export function AppLayout() {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const [maisAberto, setMaisAberto] = useState(false);
  const emOperacoes = operacoes.some(item => pathname.startsWith(item.to));

  useEffect(() => { setMaisAberto(false); window.scrollTo({ top: 0 }); }, [pathname]);
  useEffect(() => {
    if (!maisAberto) return;
    const fechar = (event: KeyboardEvent) => event.key === 'Escape' && setMaisAberto(false);
    document.addEventListener('keydown', fechar); document.body.classList.add('modal-open');
    return () => { document.removeEventListener('keydown', fechar); document.body.classList.remove('modal-open'); };
  }, [maisAberto]);

  return <div className="app-shell">
    <aside className="sidebar">
      <Brand/>
      <NavLink to="/contratos/novo" className="sidebar-cta"><Icon name="plus" size={18}/>Novo contrato</NavLink>
      <nav className="side-nav" aria-label="Navegação principal">
        <span className="side-label">Principal</span>
        {principais.map(item => <NavLink key={item.to} to={item.to} className={navClass}><Icon name={item.icon}/>{item.label}</NavLink>)}
        <span className="side-label">Operações</span>
        {operacoes.map(item => <NavLink key={item.to} to={item.to} className={navClass}><Icon name={item.icon}/>{item.label}</NavLink>)}
      </nav>
      <div className="sidebar-footer"><span className="avatar">A</span><div><b>Administrador</b><small>Gestor da operação</small></div><button type="button" className="icon-button" onClick={logout} aria-label="Sair" title="Sair"><Icon name="logout" size={18}/></button></div>
    </aside>

    <header className="topbar">
      <Brand compact/>
      <button type="button" className="icon-button" onClick={logout} aria-label="Sair"><Icon name="logout" size={20}/></button>
    </header>

    <main className="content"><div className="content-inner"><Outlet/></div></main>

    <nav className="bottom-nav" aria-label="Navegação principal">
      {principais.slice(0, 2).map(item => <NavLink key={item.to} to={item.to} className={navClass}><Icon name={item.icon} size={22}/><span>{item.short || item.label}</span></NavLink>)}
      <NavLink to="/contratos/novo" className={({ isActive }) => `nav-new${isActive ? ' nav-active' : ''}`} aria-label="Novo contrato"><span className="nav-new-icon"><Icon name="plus" size={24}/></span><span>Novo</span></NavLink>
      {principais.slice(2).map(item => <NavLink key={item.to} to={item.to} className={navClass}><Icon name={item.icon} size={22}/><span>{item.label}</span></NavLink>)}
      <button type="button" className={emOperacoes || maisAberto ? 'nav-active' : ''} onClick={() => setMaisAberto(true)} aria-haspopup="dialog" aria-expanded={maisAberto}><Icon name="grid" size={22}/><span>Mais</span></button>
    </nav>

    {maisAberto && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setMaisAberto(false)}>
      <div className="modal-card more-sheet" role="dialog" aria-modal="true" aria-label="Mais opções">
        <div className="modal-head"><div><h2>Operações</h2><p>Acesse os demais módulos.</p></div><button type="button" onClick={() => setMaisAberto(false)} aria-label="Fechar"><Icon name="x" size={18}/></button></div>
        <nav className="more-grid">
          {operacoes.map(item => <NavLink key={item.to} to={item.to} className={navClass}><span className="tile-icon"><Icon name={item.icon} size={22}/></span><b>{item.label}</b><Icon name="chevronRight" size={18}/></NavLink>)}
        </nav>
        <button type="button" className="more-logout" onClick={logout}><Icon name="logout" size={18}/>Sair da conta</button>
      </div>
    </div>}
  </div>;
}
