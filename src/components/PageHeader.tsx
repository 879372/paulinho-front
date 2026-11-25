import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

type Props = { eyebrow?: string; title: string; description?: ReactNode; action?: ReactNode; back?: string };

export function PageHeader({ eyebrow, title, description, action, back }: Props) {
  return <section className="page-title">
    <div className="page-title-text">
      {back && <Link className="back-link" to={back}><Icon name="arrowLeft" size={18}/>Voltar</Link>}
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {action && <div className="page-title-actions">{action}</div>}
  </section>;
}
