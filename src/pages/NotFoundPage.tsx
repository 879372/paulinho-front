import { Link } from 'react-router-dom';
import { BrandMark } from '../components/Brand';
export function NotFoundPage() { return <main className="not-found"><BrandMark size={52}/><span>404</span><h1>Página não encontrada</h1><p>O endereço acessado não existe ou foi movido.</p><Link className="primary" to="/dashboard">Voltar ao início</Link></main>; }
