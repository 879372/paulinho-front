import { OperacoesPage } from './pages/OperacoesPage';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { ClientesPage } from './pages/ClientesPage';
import { ClienteDetailPage } from './pages/ClienteDetailPage';
import { CobrancasPage } from './pages/CobrancasPage';
import { ContasPagarPage } from './pages/ContasPagarPage';
import { ContratoDetailPage } from './pages/ContratoDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NovoContratoPage } from './pages/NovoContratoPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AppLayout />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: '/dashboard', element: <DashboardPage /> },
        { path: '/cobrancas', element: <CobrancasPage /> },
        { path: '/contas-a-pagar', element: <ContasPagarPage /> },
        { path: '/motos', element: <OperacoesPage key="motos" modulo="motos" /> },
        { path: '/animais', element: <OperacoesPage key="animais" modulo="animais" /> },
        { path: '/financeiro', element: <OperacoesPage key="financeiro" modulo="financeiro" /> },
        { path: '/clientes', element: <ClientesPage /> },
        { path: '/clientes/:id', element: <ClienteDetailPage /> },
        { path: '/contratos/novo', element: <NovoContratoPage /> },
        { path: '/contratos/:id', element: <ContratoDetailPage /> },
      ],
    }],
  },
  { path: '*', element: <NotFoundPage /> },
]);
